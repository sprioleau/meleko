import { NextResponse, type NextRequest } from "next/server";
import { nextAuth } from "@/lib/server-auth";

const handleAuth = nextAuth?.convexAuthNextjsProxy();

export function proxy(request: NextRequest) {
  return handleAuth?.(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/", "/practice", "/library", "/progress", "/about", "/start", "/play", "/learn", "/account"],
};
