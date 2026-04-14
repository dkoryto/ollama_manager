import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

const ipMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipMap.get(ip) || [];
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = timestamps.filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    ipMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipMap.set(ip, recent);
  return false;
}

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
