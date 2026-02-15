import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LessonStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";

function parseDateOrNull(v: unknown) {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekStartUTC(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diffToMonday);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function durationMinutes(startsAt: Date, endsAt: Date) {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
}

const ALLOWED_DURATIONS = new Set([30, 45, 60, 90, 120]);

function isValidLessonStatus(v: string): v is LessonStatus {
  return v === "SCHEDULED" || v === "CANCELLED" || v === "DONE" || v === "MOVED";
}

async function assertCanMutateLesson(session: any, lessonId: string) {
  if (session.role === "ADMIN") {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, startsAt: true, endsAt: true, status: true, teacherId: true, studentId: true },
    });
    if (!lesson) throw Object.assign(new Error("not found"), { status: 404 });
    return lesson;
  }

  if (session.role !== "TEACHER") {
    throw Object.assign(new Error("forbidden"), { status: 403 });
  }

  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, startsAt: true, endsAt: true, status: true, teacherId: true, studentId: true },
  });
  if (!l) throw Object.assign(new Error("not found"), { status: 404 });
  if (l.teacherId !== session.sub) throw Object.assign(new Error("forbidden"), { status: 403 });
  return l;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { id } = await ctx.params;

  // Permessi
  let currentLesson: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: LessonStatus;
    teacherId: string;
    studentId: string;
  };
  try {
    currentLesson = await assertCanMutateLesson(session, id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }

  const body = await req.json().catch(() => null);

  const startsAt = parseDateOrNull(body?.startsAt);
  const endsAt = parseDateOrNull(body?.endsAt);
  const statusRaw = typeof body?.status === "string" ? body.status : null; // LessonStatus
  const hasWeekStart = body?.weekStart != null;
  const providedWeekStart = hasWeekStart ? parseDateOrNull(body?.weekStart) : null;

  if (!startsAt && !endsAt && !statusRaw) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  if ((startsAt && !endsAt) || (!startsAt && endsAt)) {
    return NextResponse.json(
      { error: "startsAt and endsAt must be provided together" },
      { status: 400 }
    );
  }

  if (startsAt && endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }

  if (statusRaw && !isValidLessonStatus(statusRaw)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  if (hasWeekStart && !providedWeekStart) {
    return NextResponse.json({ error: "invalid weekStart" }, { status: 400 });
  }

  const nextStartsAt = startsAt ?? currentLesson.startsAt;
  const nextEndsAt = endsAt ?? currentLesson.endsAt;
  const nextStatus = (statusRaw ?? currentLesson.status) as LessonStatus;

  const duration = durationMinutes(nextStartsAt, nextEndsAt);
  if (!ALLOWED_DURATIONS.has(duration)) {
    return NextResponse.json(
      { error: "invalid duration", allowed: [30, 45, 60, 90, 120] },
      { status: 400 }
    );
  }

  const computedWeekStart = weekStartUTC(nextStartsAt);
  if (providedWeekStart && providedWeekStart.getTime() !== computedWeekStart.getTime()) {
    return NextResponse.json({ error: "weekStart mismatch with startsAt" }, { status: 400 });
  }

  if (nextStatus !== "CANCELLED") {
    const [teacherConflict, studentConflict] = await Promise.all([
      prisma.lesson.findFirst({
        where: {
          id: { not: id },
          teacherId: currentLesson.teacherId,
          status: { not: "CANCELLED" },
          startsAt: { lt: nextEndsAt },
          endsAt: { gt: nextStartsAt },
        },
        select: { id: true },
      }),
      prisma.lesson.findFirst({
        where: {
          id: { not: id },
          studentId: currentLesson.studentId,
          status: { not: "CANCELLED" },
          startsAt: { lt: nextEndsAt },
          endsAt: { gt: nextStartsAt },
        },
        select: { id: true },
      }),
    ]);

    if (teacherConflict) {
      return NextResponse.json(
        { error: "teacher already busy in this time range", code: "CONFLICT" },
        { status: 409 }
      );
    }

    if (studentConflict) {
      return NextResponse.json(
        { error: "student already busy in this time range", code: "CONFLICT" },
        { status: 409 }
      );
    }
  }

  const data: any = {};
  if (startsAt && endsAt) {
    data.startsAt = startsAt;
    data.endsAt = endsAt;
    data.weekStart = weekStartUTC(startsAt);
  }
  if (statusRaw) data.status = statusRaw;

  const lesson = await prisma.lesson.update({
    where: { id },
    data,
    include: {
      student: { select: { id: true, username: true, fullName: true } },
      teacher: { select: { id: true, username: true, fullName: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { id } = await ctx.params;

  // Permessi
  try {
    await assertCanMutateLesson(session, id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: session.sub,
    },
    include: {
      student: { select: { id: true, username: true, fullName: true } },
      teacher: { select: { id: true, username: true, fullName: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lesson });
}
