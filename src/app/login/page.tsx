"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setupNeeded = searchParams.get("setup") === "supabase";

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.assign(safeNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <a className="brand login-brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a>
        <p className="eyebrow">KITH AND KIN · PRIVATE WORKSPACE</p>
        <h1>Welcome back</h1>
        <p className="login-subtitle">Sign in with the salon owner's account to manage customers and appointments.</p>
        {setupNeeded && <div className="login-alert">Supabase keys are not configured yet. Add the project URL and publishable key to the app's environment settings before signing in.</div>}
        <form onSubmit={signIn} className="login-form">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || setupNeeded}>{busy ? "Signing in…" : "Sign in securely"}</button>
        </form>
        <p className="login-footnote">Access is invitation-only. Ask the workspace administrator to create your owner account.</p>
      </section>
    </main>
  );
}
