export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  // ADMIN vede tutto; TEACHER vede studenti+strumenti ma se vuoi possiamo limitarlo dopo
  if (session.role !== "ADMIN" && session.role !== "TEACHER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [students, teachers, instruments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", active: true },
      select: { id: true, username: true, fullName: true },
      orderBy: { username: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", active: true },
      select: { id: true, username: true, fullName: true },
      orderBy: { username: "asc" },
    }),
    prisma.instrument.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ students, teachers, instruments });
}
