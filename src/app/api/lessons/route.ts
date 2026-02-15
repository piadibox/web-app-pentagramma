export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LessonSource, LessonStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";

// Monday 00:00 UTC of the week containing d
function weekStartUTC(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon->0 ... Sun->6
  x.setUTCDate(x.getUTCDate() - diffToMonday);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function parseDateOrNull(v: unknown) {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function durationMinutes(startsAt: Date, endsAt: Date) {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
}

const ALLOWED_DURATIONS = new Set([30, 45, 60, 90, 120]);

function isValidLessonStatus(v: string): v is LessonStatus {
  return v === "SCHEDULED" || v === "CANCELLED" || v === "DONE" || v === "MOVED";
}

function isValidLessonSource(v: string): v is LessonSource {
  return v === "REGULAR" || v === "EXCEPTION";
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);

  // ✅ supporto weekStart (range: [weekStart, weekStart + 7 giorni))
  const weekStart = parseDateOrNull(url.searchParams.get("weekStart"));

  // supporto anche from/to (se non passi weekStart)
  const from = weekStart ? weekStart : parseDateOrNull(url.searchParams.get("from"));
  const to = weekStart ? addDays(weekStart, 7) : parseDateOrNull(url.searchParams.get("to"));

  const where: any = {};

  // visibilità per ruolo
  if (session.role === "TEACHER") where.teacherId = session.sub;
  if (session.role === "STUDENT") where.studentId = session.sub;

  // filtro date opzionale
  if (from || to) {
    where.startsAt = {};
    if (from) where.startsAt.gte = from;
    if (to) where.startsAt.lt = to;
  }

  const lessons = await prisma.lesson.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: {
      student: { select: { id: true, username: true, fullName: true } },
      teacher: { select: { id: true, username: true, fullName: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lessons });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  if (session.role !== "ADMIN" && session.role !== "TEACHER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const studentId = typeof body?.studentId === "string" ? body.studentId : null;
  const instrumentId = typeof body?.instrumentId === "string" ? body.instrumentId : null;

  const teacherId =
    session.role === "TEACHER"
      ? session.sub
      : typeof body?.teacherId === "string"
      ? body.teacherId
      : null;

  const startsAt = parseDateOrNull(body?.startsAt);
  const endsAt = parseDateOrNull(body?.endsAt);
  const hasWeekStart = body?.weekStart != null;
  const providedWeekStart = hasWeekStart ? parseDateOrNull(body?.weekStart) : null;

  const sourceRaw = typeof body?.source === "string" ? body.source : "REGULAR";
  const statusRaw = typeof body?.status === "string" ? body.status : "SCHEDULED";

  if (!studentId || !teacherId || !instrumentId || !startsAt || !endsAt) {
    return NextResponse.json(
      {
        error: "missing/invalid fields",
        required: ["studentId", "teacherId", "instrumentId", "startsAt", "endsAt"],
      },
      { status: 400 }
    );
  }

  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }

  if (!isValidLessonSource(sourceRaw)) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }

  if (!isValidLessonStatus(statusRaw)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  if (hasWeekStart && !providedWeekStart) {
    return NextResponse.json({ error: "invalid weekStart" }, { status: 400 });
  }

  const duration = durationMinutes(startsAt, endsAt);
  if (!ALLOWED_DURATIONS.has(duration)) {
    return NextResponse.json(
      { error: "invalid duration", allowed: [30, 45, 60, 90, 120] },
      { status: 400 }
    );
  }

  const computedWeekStart = weekStartUTC(startsAt);
  if (providedWeekStart && providedWeekStart.getTime() !== computedWeekStart.getTime()) {
    return NextResponse.json({ error: "weekStart mismatch with startsAt" }, { status: 400 });
  }

  if (statusRaw !== "CANCELLED") {
    const [teacherConflict, studentConflict] = await Promise.all([
      prisma.lesson.findFirst({
        where: {
          teacherId,
          status: { not: "CANCELLED" },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      }),
      prisma.lesson.findFirst({
        where: {
          studentId,
          status: { not: "CANCELLED" },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
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

  const lesson = await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      instrumentId,
      startsAt,
      endsAt,
      weekStart: computedWeekStart,
      source: sourceRaw,
      status: statusRaw,
    },
    include: {
      student: { select: { id: true, username: true, fullName: true } },
      teacher: { select: { id: true, username: true, fullName: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
