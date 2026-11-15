import type { Metadata } from "next";
import Link from "next/link";
import { Account } from "@/components/account";
import "./account.css";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <section className="account-page" aria-labelledby="account-title">
      <div className="page-heading">
        <h1 id="account-title">Account</h1>
        <p>Sign in to sync your practice progress and personal verses across devices.</p>
      </div>
      {process.env.NEXT_PUBLIC_CONVEX_URL ? <Account /> : (
        <div className="account-card">
          <p>Sign-in is unavailable on this site.</p>
          <Link className="button button-soft" href="/">Continue as guest</Link>
        </div>
      )}
    </section>
  );
}
