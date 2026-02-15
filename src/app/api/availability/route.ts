export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTeacherOrAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "TEACHER";
}

function parseWeekday(v: unknown) {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  if (v < 0 || v > 6) return null;
  return v;
}

function parseTimeOrNull(v: unknown) {
  if (typeof v !== "string") return null;
  if (!TIME_RE.test(v)) return null;
  return v;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  if (!isTeacherOrAdmin(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const teacherIdParam = url.searchParams.get("teacherId");

  const teacherId =
    session.role === "TEACHER"
      ? session.sub
      : typeof teacherIdParam === "string" && teacherIdParam
      ? teacherIdParam
      : null;

  if (!teacherId) {
    return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
  }

  if (session.role === "TEACHER" && teacherId !== session.sub) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const availabilities = await prisma.teacherAvailability.findMany({
    where: { teacherId, active: true },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ availabilities });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  if (!isTeacherOrAdmin(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const teacherIdBody = typeof body?.teacherId === "string" ? body.teacherId : null;
  const weekday = parseWeekday(body?.weekday);
  const startTime = parseTimeOrNull(body?.startTime);
  const endTime = parseTimeOrNull(body?.endTime);

  const teacherId = session.role === "TEACHER" ? session.sub : teacherIdBody;

  if (!teacherId || weekday === null || !startTime || !endTime) {
    return NextResponse.json(
      { error: "missing/invalid fields", required: ["teacherId", "weekday", "startTime", "endTime"] },
      { status: 400 }
    );
  }

  if (session.role === "TEACHER" && teacherId !== session.sub) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return NextResponse.json({ error: "startTime must be before endTime" }, { status: 400 });
  }

  const overlap = await prisma.teacherAvailability.findFirst({
    where: {
      teacherId,
      weekday,
      active: true,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });

  if (overlap) {
    return NextResponse.json(
      { error: "availability slot overlaps an existing slot", code: "CONFLICT" },
      { status: 409 }
    );
  }

  const availability = await prisma.teacherAvailability.create({
    data: {
      teacherId,
      weekday,
      startTime,
      endTime,
    },
  });

  return NextResponse.json({ availability }, { status: 201 });
}
