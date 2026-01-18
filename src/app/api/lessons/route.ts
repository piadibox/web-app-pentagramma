import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const teacherId = searchParams.get("teacherId") ?? undefined;
  const studentId = searchParams.get("studentId") ?? undefined;
  const weekStart = searchParams.get("weekStart") ?? undefined;

  const authWhere =
    session.role === "ADMIN"
      ? {}
      : session.role === "TEACHER"
        ? { teacherId: session.userId }
        : { studentId: session.userId };

  const where = {
    ...authWhere,
    ...(teacherId ? { teacherId } : {}),
    ...(studentId ? { studentId } : {}),
    ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
  };

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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const {
    studentId,
    teacherId,
    instrumentId,
    startsAt,
    endsAt,
    weekStart,
    source,
    status,
  } = body ?? {};

  if (!studentId || !teacherId || !instrumentId) {
    return badRequest("Missing studentId / teacherId / instrumentId");
  }
  if (!startsAt || !endsAt || !weekStart) {
    return badRequest("Missing startsAt / endsAt / weekStart");
  }
  if (!source) {
    return badRequest("Missing source (REGULAR | EXCEPTION)");
  }

  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  const week = new Date(weekStart);

  if (
    Number.isNaN(starts.getTime()) ||
    Number.isNaN(ends.getTime()) ||
    Number.isNaN(week.getTime())
  ) {
    return badRequest("Invalid date format (use ISO)");
  }

  if (ends <= starts) {
    return badRequest("endsAt must be after startsAt");
  }

  if (source !== "REGULAR" && source !== "EXCEPTION") {
    return badRequest("Invalid source");
  }

  if (
    status &&
    status !== "SCHEDULED" &&
    status !== "CANCELLED" &&
    status !== "DONE" &&
    status !== "MOVED"
  ) {
    return badRequest("Invalid status");
  }

  if (session.role === "TEACHER" && teacherId !== session.userId) {
    return NextResponse.json({ error: "Forbidden: wrong teacherId" }, { status: 403 });
  }

  const lesson = await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      instrumentId,
      startsAt: starts,
      endsAt: ends,
      weekStart: week,
      source,
      status: status ?? "SCHEDULED",
    },
    include: {
      student: { select: { id: true, username: true, fullName: true, role: true } },
      teacher: { select: { id: true, username: true, fullName: true, role: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
