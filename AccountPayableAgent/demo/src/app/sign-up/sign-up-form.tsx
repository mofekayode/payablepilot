"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignUpForm({
  inviteToken,
  prefilledEmail,
}: {
  inviteToken: string | null;
  prefilledEmail: string | null;
}) {
  const router = useRouter();
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const inviteMode = !!inviteToken;
  const postSignUpPath = inviteMode ? `/invite/${inviteToken}` : "/onboarding/business";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyMsg(null);
    setBusy("email");
    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postSignUpPath)}`,
        data: inviteMode ? { invite_token: inviteToken } : { firm_name: firmName },
      },
    });
    if (signUpError) {
      setBusy(null);
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setBusy(null);
      setVerifyMsg(
        inviteMode
          ? "Check your email to confirm your account, then come back to finish accepting your invitation."
          : "Check your email to confirm your account, then come back to finish setting up your firm."
      );
      return;
    }
    if (!inviteMode) {
      const res = await fetch("/api/auth/bootstrap-firm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firmName }),
      });
      if (!res.ok) {
        setBusy(null);
        setError(`Could not create firm: ${await res.text()}`);
        return;
      }
    }
    router.push(postSignUpPath);
    router.refresh();
  }

  async function onGoogle() {
    if (!inviteMode && !firmName.trim()) {
      setError("Enter a firm name first so we can set it up after Google sign-in.");
      return;
    }
    setError(null);
    setBusy("google");
    const supabase = createSupabaseBrowserClient();
    const next = inviteMode
      ? postSignUpPath
      : `/auth/post-google?firmName=${encodeURIComponent(firmName)}`;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setBusy(null);
      setError(oauthError.message);
    }
  }

  if (verifyMsg) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-[13.5px]">
        {verifyMsg}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!inviteMode && (
        <div>
          <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Firm name</label>
          <input
            type="text"
            required
            placeholder="e.g. Bright Books LLC"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy !== null}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-neutral-300 bg-white text-[14px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="w-4 h-4" />}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-[12px] text-neutral-400">
        <span className="flex-1 h-px bg-neutral-200" />
        or
        <span className="flex-1 h-px bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={inviteMode}
            className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 read-only:bg-neutral-50 read-only:text-neutral-600"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
          />
          <p className="mt-1 text-[11.5px] text-neutral-400">At least 8 characters.</p>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-[13px]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy !== null || (!inviteMode && !firmName.trim())}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-neutral-900 text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {inviteMode ? "Continue" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 0 1 0-24 12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-15.5c.3-1.3.4-2.6.4-4 0-1.3-.1-2.7-.4-4z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12a12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
