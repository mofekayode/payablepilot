"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-[13.5px]">
        Check your inbox for a reset link.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
        />
      </div>
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-[13px]">{error}</div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-neutral-900 text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Send reset link
      </button>
    </form>
  );
}
