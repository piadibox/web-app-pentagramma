import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

async function assertCanMutateLesson(session: any, lessonId: string) {
  if (session.role === "ADMIN") return;

  if (session.role !== "TEACHER") {
    throw Object.assign(new Error("forbidden"), { status: 403 });
  }

  const l = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { teacherId: true } });
  if (!l) throw Object.assign(new Error("not found"), { status: 404 });
  if (l.teacherId !== session.sub) throw Object.assign(new Error("forbidden"), { status: 403 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { id } = await ctx.params;

  // Permessi
  try {
    await assertCanMutateLesson(session, id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }

  const body = await req.json().catch(() => null);

  const startsAt = parseDateOrNull(body?.startsAt);
  const endsAt = parseDateOrNull(body?.endsAt);
  const status = typeof body?.status === "string" ? body.status : null; // LessonStatus

  if (!startsAt && !endsAt && !status) {
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

  const data: any = {};
  if (startsAt && endsAt) {
    data.startsAt = startsAt;
    data.endsAt = endsAt;
    data.weekStart = weekStartUTC(startsAt);
  }
  if (status) data.status = status;

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
