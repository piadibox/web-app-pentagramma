import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verifySession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { sub, role, ... }
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // /login: se loggato -> /
  if (pathname === "/login") {
    const session = await verifySession(req);
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  const session = await verifySession(req);

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ADMIN only
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (session.role !== "ADMIN") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Pass-through + headers
  const res = NextResponse.next();
  if (session.sub) res.headers.set("x-user-id", String(session.sub));
  if (session.role) res.headers.set("x-user-role", String(session.role));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
