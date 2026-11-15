import { setupConvexAuthServer } from "@convex-dev/auth/ssr";
import { setupConvexAuthNextjs } from "@convex-dev/auth/ssr/nextjs";
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const cookieOptions = { secure: process.env.NODE_ENV === "production" };

export const authRoutes = convexUrl ? setupConvexAuthServer({
  convexUrl,
  cookieOptions,
  refreshSession: api.auth.refreshSession,
  signOut: api.auth.signOut,
  signIn: [
    api.auth.finishSignUpWithUsernamePasskey,
    api.auth.finishSignInWithUsernamePasskey,
  ],
}) : null;

export const nextAuth = convexUrl ? setupConvexAuthNextjs({
  convexUrl,
  cookieOptions,
  refreshSession: api.auth.refreshSession,
  isAuthenticated: api.auth.isAuthenticated,
}) : null;
