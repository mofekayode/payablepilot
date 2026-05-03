"use client";

import { useEffect, useState } from "react";
import { Loader2, Copy, Check, X, UserPlus, Trash2 } from "lucide-react";

type Role = "admin" | "viewer" | "bookkeeper";

type Invitation = {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  token: string;
};

export function InviteSection({ origin }: { origin: string }) {
  const [pending, setPending] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/invitations");
    if (res.ok) {
      const data = (await res.json()) as { invitations: Invitation[] };
      setPending(
        (data.invitations ?? []).filter((i) => !i.accepted_at && !i.revoked_at)
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      setBusy(false);
      const text = await res.text();
      setError(
        text === "already_invited"
          ? "There's already a pending invitation for that email."
          : `Could not invite: ${text}`
      );
      return;
    }
    setEmail("");
    setBusy(false);
    await load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invitation? The link will stop working.")) return;
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function copyLink(token: string) {
    const url = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(token);
      setTimeout(() => setJustCopied((c) => (c === token ? null : c)), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight">Team &amp; access</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500 max-w-prose">
          Invite a client or teammate to this business. Admins get full access; viewers can read but not change
          anything.
        </p>
      </div>

      <form onSubmit={invite} className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="person@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            >
              <option value="admin">Admin (client owner)</option>
              <option value="viewer">Viewer (read-only)</option>
              <option value="bookkeeper">Bookkeeper (firm teammate)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-neutral-900 text-white text-[13.5px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send invite
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-[13px]">
            {error}
          </div>
        )}
        <p className="text-[11.5px] text-neutral-500">
          We don't send the invite email yet — copy the link from the pending list below and share it any way you
          like.
        </p>
      </form>

      {loading ? (
        <div className="text-[12.5px] text-neutral-500 px-4 py-3">Loading invitations…</div>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-500">
          No pending invitations.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 text-[11.5px] uppercase tracking-wider text-neutral-500 font-medium">
            Pending ({pending.length})
          </div>
          {pending.map((inv, i) => (
            <div
              key={inv.id}
              className={
                "flex flex-wrap items-center gap-3 px-4 py-3 " +
                (i < pending.length - 1 ? "border-b border-neutral-100" : "")
              }
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] text-neutral-900 truncate">{inv.email}</div>
                <div className="text-[11.5px] text-neutral-500 mt-0.5">
                  {labelForRole(inv.role)} · expires {new Date(inv.expires_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => copyLink(inv.token)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-neutral-300 text-neutral-700 text-[12.5px] font-medium hover:bg-neutral-50"
              >
                {justCopied === inv.token ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {justCopied === inv.token ? "Copied" : "Copy link"}
              </button>
              <button
                onClick={() => revoke(inv.id)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-neutral-300 text-rose-700 text-[12.5px] font-medium hover:bg-rose-50"
                title="Revoke invitation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function labelForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "Admin (full access)";
    case "viewer":
      return "Viewer (read-only)";
    case "bookkeeper":
      return "Bookkeeper (firm teammate)";
  }
}
