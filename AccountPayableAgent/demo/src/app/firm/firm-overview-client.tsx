"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, BookOpen, Check, AlertCircle, Loader2, ArrowRight, UserPlus } from "lucide-react";

type Row = {
  id: string;
  name: string;
  legalName: string | null;
  inboxAddress: string;
  gmail: boolean;
  qbo: boolean;
  pendingInvites: number;
};

export function FirmOverviewClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);

  async function open(id: string) {
    setOpening(id);
    const res = await fetch("/api/businesses/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId: id }),
    });
    if (res.ok) {
      router.push("/app");
      router.refresh();
    } else {
      setOpening(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-neutral-100 text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
        <div>Business</div>
        <div className="hidden sm:block text-right">Gmail</div>
        <div className="hidden sm:block text-right">QuickBooks</div>
        <div className="hidden md:block text-right">Pending invites</div>
        <div className="text-right">Open</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={
            "grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 " +
            (i < rows.length - 1 ? "border-b border-neutral-100" : "")
          }
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-neutral-100 grid place-items-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-neutral-600" />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-neutral-900 truncate">{r.name}</div>
                <div className="text-[12px] text-neutral-500 truncate">
                  {r.legalName || r.inboxAddress}
                </div>
              </div>
            </div>
          </div>
          <StatusPill connected={r.gmail} icon={<Mail className="w-3 h-3" />} className="hidden sm:inline-flex" />
          <StatusPill connected={r.qbo} icon={<BookOpen className="w-3 h-3" />} className="hidden sm:inline-flex" />
          <div className="hidden md:flex items-center justify-end">
            {r.pendingInvites > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <UserPlus className="w-3 h-3" />
                {r.pendingInvites}
              </span>
            ) : (
              <span className="text-[12px] text-neutral-400">—</span>
            )}
          </div>
          <button
            onClick={() => open(r.id)}
            disabled={opening !== null}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-neutral-300 text-neutral-700 text-[12.5px] font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {opening === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            Open
          </button>
        </div>
      ))}
    </div>
  );
}

function StatusPill({
  connected,
  icon,
  className,
}: {
  connected: boolean;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full border " +
        (connected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-800 border-amber-200") +
        " " +
        (className ?? "inline-flex")
      }
    >
      {icon}
      {connected ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    </span>
  );
}
