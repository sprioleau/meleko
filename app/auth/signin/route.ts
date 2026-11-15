import { authRoutes } from "@/lib/server-auth";

export function POST(request: Request) {
  return authRoutes?.convexProxyHandler(request) ?? new Response(null, { status: 503 });
}
