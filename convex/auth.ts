import { setupUsernamePasskey } from "@convex-dev/auth/methods/username-passkey/server";
import { getAuthUserId, setupConvexAuth } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const auth = setupConvexAuth({ component: components.auth });
const passkeyOrigin = new URL(process.env.AUTH_PASSKEY_ORIGIN ?? "http://localhost:3000");

export const { signOut, refreshSession, isAuthenticated } = auth;

export const {
  startSignInWithUsernamePasskey,
  startAutofillSignInWithUsernamePasskey,
  finishSignUpWithUsernamePasskey,
  finishSignInWithUsernamePasskey,
  listPasskeys,
  startAddPasskey,
  verifyAddPasskey,
  finishAddPasskey,
  startRemovePasskey,
  finishRemovePasskey,
} = setupUsernamePasskey(auth, {
  component: components.authPasskey,
  usernameComponent: components.authUsername,
  origin: passkeyOrigin.origin,
  rpId: passkeyOrigin.hostname,
  rpName: "Meleko",
}).attachUserCallbacks({ createUser: internal.users.createUser });

export function getAccountId(ctx: MutationCtx | QueryCtx) {
  return getAuthUserId(ctx);
}
