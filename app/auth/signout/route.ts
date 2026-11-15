import { authRoutes } from "@/lib/server-auth";

export function POST(request: Request) {
  return authRoutes?.signOutHandler(request) ?? new Response(null, { status: 503 });
}
