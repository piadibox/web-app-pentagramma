export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const source = typeof body?.source === "string" ? body.source : "REGULAR";
  const status = typeof body?.status === "string" ? body.status : "SCHEDULED";

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

  const existing = await prisma.lesson.findFirst({
    where: {
      studentId,
      teacherId,
      instrumentId,
      startsAt,
      endsAt,
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "duplicate lesson", lessonId: existing.id }, { status: 409 });
  }

  const lesson = await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      instrumentId,
      startsAt,
      endsAt,
      weekStart: weekStartUTC(startsAt),
      source,
      status,
    },
    include: {
      student: { select: { id: true, username: true, fullName: true } },
      teacher: { select: { id: true, username: true, fullName: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
