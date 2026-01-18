import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, username: true, fullName: true, role: true } },
      teacher: { select: { id: true, username: true, fullName: true, role: true } },
      instrument: { select: { id: true, name: true } },
    },
  });

  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    session.role === "ADMIN" ||
    (session.role === "TEACHER" && lesson.teacherId === session.userId) ||
    (session.role === "STUDENT" && lesson.studentId === session.userId);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ lesson });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per ora: solo ADMIN può eliminare
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params.id;

  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lesson.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;

  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ADMIN può tutto
  // TEACHER può modificare solo le proprie lezioni
  // STUDENT: per ora no (poi possiamo permettere cancellazione/lateCancel ecc.)
  if (session.role === "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "TEACHER" && existing.teacherId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Campi aggiornabili (scelti da noi, coerenti col tuo schema)
  const {
    startsAt,
    endsAt,
    weekStart,
    source,
    status,
    cancelledAt,
    cancelledBy,
    lateCancel,
    studentId,
    teacherId,
    instrumentId,
  } = body ?? {};

  // Prepariamo data update solo con i campi presenti
  const data: any = {};

  // Se passi date, devono essere ISO valide
  if (startsAt !== undefined) {
    const d = new Date(startsAt);
    if (Number.isNaN(d.getTime())) return badRequest("Invalid startsAt (ISO)");
    data.startsAt = d;
  }
  if (endsAt !== undefined) {
    const d = new Date(endsAt);
    if (Number.isNaN(d.getTime())) return badRequest("Invalid endsAt (ISO)");
    data.endsAt = d;
  }
  if (weekStart !== undefined) {
    const d = new Date(weekStart);
    if (Number.isNaN(d.getTime())) return badRequest("Invalid weekStart (ISO)");
    data.weekStart = d;
  }

  // Se entrambe presenti, controlliamo ordine
  const newStarts = data.startsAt ?? existing.startsAt;
  const newEnds = data.endsAt ?? existing.endsAt;
  if (newEnds <= newStarts) return badRequest("endsAt must b
