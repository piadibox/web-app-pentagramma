import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: "invalid credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "invalid credentials" },
        { status: 401 }
      );
    }

    // JWT
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-secret"
    );

    const token = await new SignJWT({
      sub: user.id,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (e) {
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}
