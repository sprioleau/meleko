"use client";

import {
  useAddPasskey,
  useRemovePasskey,
  useSignInWithUsernamePasskey,
  type SignInWithUsernamePasskeyResult,
  type UsernamePasskeyAutofillError,
} from "@convex-dev/auth/methods/username-passkey/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";

type SignInError = Extract<SignInWithUsernamePasskeyResult, { status: "error" }>["userError"];

function signInErrorMessage(error: SignInError | UsernamePasskeyAutofillError) {
  switch (error.error) {
    case "ALREADY_PENDING": return null;
    case "USERNAME_TOO_SHORT": return `Use at least ${error.minimumLength} characters for your username.`;
    case "USERNAME_TOO_LONG": return `Use at most ${error.maximumLength} characters for your username.`;
    case "USERNAME_HAS_SURROUNDING_WHITESPACE": return "Remove spaces from the start and end of your username.";
    case "USERNAME_HAS_INVALID_CHARACTERS": return "This username contains unsupported characters.";
    case "USERNAME_TAKEN": return "That username was just taken. Try another username.";
    case "CHALLENGE_EXPIRED": return "This attempt expired. Try again.";
    case "CEREMONY_ABORTED": return "The passkey prompt was closed or couldn’t find a matching passkey. Try again.";
    case "PASSKEY_ALREADY_REGISTERED": return "This device already holds a passkey for this site. Try signing in with it.";
    case "UNKNOWN_CREDENTIAL": return "This passkey isn’t registered with Meleko.";
    case "WEBAUTHN_UNSUPPORTED": return "Passkeys are unavailable in this browser. Try a browser or device that supports them.";
    case "PROTOCOL_ERROR":
    case "OTHER_ERROR": return "Meleko couldn’t complete the passkey request. Try again.";
  }
}

export function Account() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <p role="status">Checking your session…</p>;
  return isAuthenticated ? <AccountSettings /> : <PasskeyForm />;
}

function PasskeyForm() {
  const { signIn, pending: isPending, autofill } = useSignInWithUsernamePasskey(api.auth);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { lastError } = autofill;

  useEffect(() => {
    if (lastError) setError(signInErrorMessage(lastError));
  }, [lastError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await signIn({ username: username.trim() });
    if (result.status === "error") setError(signInErrorMessage(result.userError));
  }

  return (
    <form className="account-card account-form" onSubmit={handleSubmit}>
      <h2>Continue with a passkey</h2>
      <p>Choose a new username to create an account, or enter your existing one to sign in.</p>
      <label htmlFor="account-username">Username</label>
      <input
        id="account-username"
        name="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username webauthn"
        autoCapitalize="none"
        spellCheck={false}
        required
        disabled={isPending}
      />
      {error ? <p className="account-error" role="alert">{error}</p> : null}
      <div className="account-actions">
        <button type="submit" className="button button-primary" disabled={isPending || !username.trim()}>
          <KeyRound size={17} /> {isPending ? "Waiting for your passkey…" : "Continue with a passkey"}
        </button>
        <Link className="button button-soft" href="/">Continue as guest</Link>
      </div>
      <p>Guest progress stays on this device and is available in guest mode.</p>
    </form>
  );
}

function AccountSettings() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const passkeys = useQuery(api.auth.listPasskeys, {});
  const { addPasskey, pending: isAdding } = useAddPasskey(api.auth);
  const { removePasskey, pending: isRemoving } = useRemovePasskey(api.auth);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const isPending = isAdding || isRemoving || isSigningOut;

  async function handleAdd() {
    setError("");
    setStatus("");
    const result = await addPasskey();
    if (result.success) setStatus("Passkey added.");
    else setError(managementErrorMessage(result.userError.error));
  }

  async function handleRemove(passkeyId: string) {
    setError("");
    setStatus("");
    const result = await removePasskey(passkeyId);
    if (result.success) setStatus("Passkey removed.");
    else setError(managementErrorMessage(result.userError.error));
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setError("");
    setStatus("");
    try {
      await signOut();
      router.replace("/");
    } catch {
      setError("Meleko couldn’t sign you out. Try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="account-card account-settings">
      <h2>You’re signed in</h2>
      <p>Add a backup passkey so you can sign in if you lose access to your current one.</p>
      {passkeys === undefined ? <p role="status">Loading your passkeys…</p> : null}
      {passkeys?.success ? (
        <ul className="account-passkeys" aria-label="Your passkeys">
          {passkeys.passkeys.map((passkey, index) => {
            const label = passkey.name || `Passkey ${index + 1}`;
            return (
              <li key={passkey.passkeyId}>
                <div>
                  <strong>{label}</strong>
                  <span>Added {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(passkey.createdAt)}</span>
                </div>
                {passkeys.passkeys.length > 1 ? (
                  <button type="button" className="button button-soft" aria-label={`Remove ${label}`} disabled={isPending} onClick={() => handleRemove(passkey.passkeyId)}>
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {error ? <p className="account-error" role="alert">{error}</p> : null}
      {status ? <p role="status">{status}</p> : null}
      <div className="account-actions">
        <button type="button" className="button button-primary" disabled={isPending} onClick={handleAdd}>
          <KeyRound size={17} /> {isAdding ? "Waiting for your passkey…" : "Add a passkey"}
        </button>
        <button type="button" className="button button-soft" disabled={isPending} onClick={handleSignOut}>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

function managementErrorMessage(error: string) {
  switch (error) {
    case "CEREMONY_ABORTED": return "The passkey prompt was closed or couldn’t find a matching passkey.";
    case "PASSKEY_ALREADY_REGISTERED": return "This passkey is already registered. Choose another device or security key.";
    case "WEBAUTHN_UNSUPPORTED": return "Passkeys are unavailable in this browser.";
    case "NOT_LOGGED_IN": return "Your session ended. Sign in and try again.";
    case "CHALLENGE_EXPIRED": return "This attempt expired. Try again.";
    default: return "Meleko couldn’t update your passkeys. Try again.";
  }
}
