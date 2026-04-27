"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, ExternalLink, AlertCircle, Phone, Mail } from "lucide-react";

type Vendor = {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  Balance?: number;
  CompanyName?: string;
  Vendor1099?: boolean;
  Active?: boolean;
};

export function VendorsView() {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; vendors: Vendor[] } | { kind: "error"; message: string }>(
    { kind: "loading" }
  );
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrations/qbo/vendors");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setState({ kind: "ready", vendors: data.vendors ?? [] });
      } catch (e) {
        setState({ kind: "error", message: (e as Error).message });
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = filter.trim().toLowerCase();
    if (!q) return state.vendors;
    return state.vendors.filter(
      (v) => v.DisplayName.toLowerCase().includes(q) || (v.CompanyName ?? "").toLowerCase().includes(q)
    );
  }, [state, filter]);

  const notConnected = state.kind === "error" && /not connected|configured/i.test(state.message);

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">QuickBooks</div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Vendors</h1>
            <p className="mt-1 text-sm text-muted max-w-prose">
              Synced live from your QuickBooks Online company. New vendors created in QBO appear here automatically.
            </p>
          </div>
          {state.kind === "ready" && (
            <span className="text-[12px] text-muted">{state.vendors.length} total</span>
          )}
        </div>

        {notConnected && (
          <ConnectPrompt label="QuickBooks" />
        )}

        {state.kind === "error" && !notConnected && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
          </div>
        )}

        {state.kind === "loading" && (
          <div className="rounded-xl border border-border bg-background p-10 text-center text-[13px] text-muted">
            Loading vendors from QuickBooks…
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search vendors…"
                className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
              />
            </div>
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <ul>
                {filtered.map((v) => (
                  <li key={v.Id} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
                    <div className="w-9 h-9 rounded-full bg-surface text-muted grid place-items-center shrink-0 font-semibold text-[13px]">
                      {v.DisplayName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium truncate flex items-center gap-2">
                        {v.DisplayName}
                        {v.Vendor1099 && (
                          <span className="text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-soft text-brand font-semibold">
                            1099
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-muted truncate flex items-center gap-3">
                        {v.PrimaryEmailAddr?.Address && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {v.PrimaryEmailAddr.Address}
                          </span>
                        )}
                        {v.PrimaryPhone?.FreeFormNumber && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {v.PrimaryPhone.FreeFormNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[12px] text-muted shrink-0 tabular-nums">
                      {v.Balance != null && v.Balance > 0
                        ? `Owed ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v.Balance)}`
                        : "—"}
                    </div>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-5 py-8 text-center text-[13px] text-muted">No vendors match.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConnectPrompt({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-950">
      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" />
      <div className="flex-1 text-[13.5px]">
        <div className="font-medium">{label} isn&apos;t connected.</div>
        <div className="mt-0.5">Connect it from settings to start syncing your data.</div>
      </div>
      <Link
        href="/settings"
        className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-md bg-amber-900 text-amber-50 text-[13px] font-medium hover:bg-amber-800"
      >
        Open settings <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
