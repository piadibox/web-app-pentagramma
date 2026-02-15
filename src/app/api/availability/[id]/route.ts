export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function isTeacherOrAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "TEACHER";
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  if (!isTeacherOrAdmin(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const availability = await prisma.teacherAvailability.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });

  if (!availability) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (session.role === "TEACHER" && availability.teacherId !== session.sub) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.teacherAvailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
