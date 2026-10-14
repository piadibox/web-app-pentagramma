import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session?.sub) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const user = await prisma.user
    .findUnique({ where: { id: session.sub }, select: { username: true, fullName: true } })
    .catch(() => null);

  return NextResponse.json({
    userId: session.sub,
    role: session.role,
    username: user?.username ?? null,
    fullName: user?.fullName ?? null,
  });
}
