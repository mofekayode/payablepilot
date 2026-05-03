// Cross-business overview. The "manage all your clients at once" view.
// Shows every business the user has access to, with connection status and
// a quick-jump button. Useful when you're managing 10+ clients and need
// to spot which ones are missing connections.

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { listAccessibleBusinesses, requireUser } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fullInboxAddress } from "@/lib/businesses/alias";
import { PilotMark } from "@/components/pilot-mark";
import { FirmOverviewClient } from "./firm-overview-client";

export const metadata = { title: "PayablePilot · All businesses" };

export default async function FirmOverviewPage() {
  await requireUser();
  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) redirect("/onboarding/business");

  // Pull all connections in one query so we can show status per business.
  const supabase = await createSupabaseServerClient();
  const ids = businesses.map((b) => b.id);
  const { data: connRows } = await supabase
    .from("connections")
    .select("business_id, provider")
    .in("business_id", ids);
  const conns: Record<string, { gmail: boolean; qbo: boolean }> = {};
  for (const b of businesses) conns[b.id] = { gmail: false, qbo: false };
  (connRows ?? []).forEach((row) => {
    if (!conns[row.business_id]) conns[row.business_id] = { gmail: false, qbo: false };
    if (row.provider === "gmail") conns[row.business_id].gmail = true;
    if (row.provider === "qbo") conns[row.business_id].qbo = true;
  });

  // Pending invitations grouped by business.
  const { data: pendingRows } = await supabase
    .from("business_invitations")
    .select("business_id, id")
    .in("business_id", ids)
    .is("accepted_at", null)
    .is("revoked_at", null);
  const pendingInvites: Record<string, number> = {};
  (pendingRows ?? []).forEach((r) => {
    pendingInvites[r.business_id] = (pendingInvites[r.business_id] ?? 0) + 1;
  });

  const rows = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    legalName: b.legal_name,
    inboxAddress: fullInboxAddress(b.inbox_alias),
    gmail: conns[b.id]?.gmail ?? false,
    qbo: conns[b.id]?.qbo ?? false,
    pendingInvites: pendingInvites[b.id] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/app" className="text-neutral-500 hover:text-neutral-900 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to workspace
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
              <PilotMark className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">PayablePilot</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10 space-y-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">All your businesses</h1>
            <p className="mt-1 text-neutral-500 text-sm max-w-prose">
              Every client across your firm. Click any row to switch into that workspace.
              Spot connection gaps and pending invites at a glance.
            </p>
          </div>
          <Link
            href="/onboarding/business"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-neutral-900 text-white text-[13.5px] font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add a business
          </Link>
        </div>

        <SummaryStrip rows={rows} />

        <FirmOverviewClient rows={rows} />
      </main>
    </div>
  );
}

function SummaryStrip({
  rows,
}: {
  rows: { gmail: boolean; qbo: boolean; pendingInvites: number }[];
}) {
  const total = rows.length;
  const fullyConnected = rows.filter((r) => r.gmail && r.qbo).length;
  const partiallyConnected = rows.filter((r) => (r.gmail || r.qbo) && !(r.gmail && r.qbo)).length;
  const unconnected = rows.filter((r) => !r.gmail && !r.qbo).length;
  const totalPending = rows.reduce((s, r) => s + r.pendingInvites, 0);

  const items: { label: string; value: number; tone: "neutral" | "ok" | "warn" }[] = [
    { label: "Total", value: total, tone: "neutral" },
    { label: "Fully connected", value: fullyConnected, tone: "ok" },
    { label: "Partially connected", value: partiallyConnected, tone: partiallyConnected > 0 ? "warn" : "neutral" },
    { label: "Not connected", value: unconnected, tone: unconnected > 0 ? "warn" : "neutral" },
    { label: "Pending invites", value: totalPending, tone: "neutral" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((it) => (
        <div key={it.label} className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-[11.5px] uppercase tracking-wider text-neutral-500 font-medium">{it.label}</div>
          <div
            className={
              "mt-1 text-[24px] font-semibold tabular-nums " +
              (it.tone === "ok" ? "text-emerald-700" : it.tone === "warn" ? "text-amber-700" : "text-neutral-900")
            }
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
