"use client";
import { useState } from "react";
import { Send, Mail, Check, Clock, Reply, Inbox } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "../primitives";
import { outbox, OutboxCategory, OutboxItem } from "@/lib/app-data";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<OutboxCategory, string> = {
  vendor_followup: "Vendor follow-ups",
  w9_request: "W-9 requests",
  receipt_request: "Receipt requests",
  statement_recon: "Statement reconciliations",
  aging_reminder: "Aging reminders",
  internal_notify: "Internal notifications",
};

export function OutboxView() {
  const [filter, setFilter] = useState<OutboxCategory | "all">("all");
  const items = filter === "all" ? outbox : outbox.filter((o) => o.category === filter);

  const sent = outbox.filter((o) => o.status === "sent").length;
  const awaiting = outbox.filter((o) => o.status === "awaiting_reply").length;
  const replied = outbox.filter((o) => o.status === "replied").length;
  const drafted = outbox.filter((o) => o.status === "drafted").length;

  const categories: (OutboxCategory | "all")[] = ["all", "vendor_followup", "statement_recon", "aging_reminder", "w9_request", "receipt_request", "internal_notify"];

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Agent outbox</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Everything PayablePilot has sent on your behalf.</h1>
        <p className="text-sm text-muted mt-1">
          Full audit trail of outbound communication. Every vendor email, W-9 request, receipt chase, reconciliation reply, and morning digest.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat icon={<Send className="w-4 h-4" />} label="Sent" value={String(sent)} sub="no reply needed" />
        <Stat icon={<Clock className="w-4 h-4" />} label="Awaiting reply" value={String(awaiting)} sub="pinged, waiting" />
        <Stat icon={<Reply className="w-4 h-4 text-brand" />} label="Replied" value={String(replied)} sub="vendor responded" tone="brand" />
        <Stat icon={<Mail className="w-4 h-4" />} label="Drafted" value={String(drafted)} sub="awaiting your review" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] border",
              filter === c
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border text-muted hover:text-foreground"
            )}
          >
            {c === "all" ? "All categories" : CATEGORY_LABEL[c]}
            <span className="ml-1.5 text-[10px] opacity-70">
              {c === "all" ? outbox.length : outbox.filter((o) => o.category === c).length}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Messages {filter !== "all" && `· ${CATEGORY_LABEL[filter as OutboxCategory]}`}
          </span>
          <Badge tone="neutral">{items.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <ul>
            {items.map((o) => (
              <li key={o.id} className="px-5 py-4 border-t border-border first:border-t-0 hover:bg-surface">
                <div className="flex items-start gap-3">
                  <CategoryIcon category={o.category} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted">{o.sentAt}</span>
                      <span className="text-[11px] text-muted">·</span>
                      <span className="text-[11px] text-muted">to</span>
                      <span className="text-[11.5px] font-medium">{o.toName}</span>
                      <span className="text-[11px] text-muted font-mono truncate">&lt;{o.to}&gt;</span>
                      <div className="ml-auto">
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                    <div className="mt-1.5 text-sm font-medium">{o.subject}</div>
                    <div className="text-[13px] text-muted mt-0.5 line-clamp-2">{o.bodyPreview}</div>
                    {o.relatesTo && (
                      <div className="mt-2">
                        <Badge tone="neutral">Re: {o.relatesTo}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "brand";
}) {
  const ring = tone === "brand" ? "ring-[color:var(--brand)]/20" : "ring-transparent";
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4 ring-1", ring)}>
      <div className="flex items-center justify-between text-muted text-xs">
        <span className="uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

function CategoryIcon({ category }: { category: OutboxCategory }) {
  const map: Record<OutboxCategory, string> = {
    vendor_followup: "VF",
    w9_request: "W9",
    receipt_request: "RX",
    statement_recon: "SR",
    aging_reminder: "AG",
    internal_notify: "IN",
  };
  return (
    <div className="w-9 h-9 rounded-md bg-surface border border-border grid place-items-center text-[11px] font-mono text-muted shrink-0">
      {map[category]}
    </div>
  );
}

function StatusBadge({ status }: { status: OutboxItem["status"] }) {
  if (status === "sent") return <Badge tone="neutral"><Send className="w-3 h-3" /> Sent</Badge>;
  if (status === "awaiting_reply") return <Badge tone="accent"><Clock className="w-3 h-3" /> Awaiting reply</Badge>;
  if (status === "replied") return <Badge tone="brand"><Check className="w-3 h-3" /> Replied</Badge>;
  return <Badge tone="neutral">Drafted</Badge>;
}
