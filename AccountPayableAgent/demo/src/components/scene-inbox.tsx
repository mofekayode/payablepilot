"use client";
import { useEffect, useState } from "react";
import { Mail, Paperclip, Inbox, Star, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type EmailRow = {
  from: string;
  subject: string;
  snippet: string;
  time: string;
  attachment: string;
  unread?: boolean;
  arriving?: boolean;
};

const baseEmails: EmailRow[] = [
  {
    from: "Allied Insurance",
    subject: "Policy renewal confirmation · 2026-27",
    snippet: "Attached is the renewal binder for review. Payment due on the 10th of each month...",
    time: "7:52 AM",
    attachment: "policy-renewal.pdf",
  },
  {
    from: "Erin Boyd",
    subject: "Re: Unit 12B tenant move-in",
    snippet: "Confirmed for Saturday. Summit Plumbing scheduled the faucet install on Friday.",
    time: "7:14 AM",
    attachment: "",
  },
  {
    from: "Hillcrest Builders",
    subject: "Progress invoice · 418 Maple exterior",
    snippet: "Month 2 of 3 for exterior rehab. Photos and sign-offs attached.",
    time: "6:41 AM",
    attachment: "hillcrest-progress-02.pdf",
  },
  {
    from: "Pacific Pest Control",
    subject: "Quarterly service · all properties",
    snippet: "Q2 service completed across all 40 units. Invoice attached for processing.",
    time: "6:12 AM",
    attachment: "pacific-q2.pdf",
  },
];

const arrivingEmail: EmailRow = {
  from: "Summit Plumbing",
  subject: "Invoice SP-4821 · Unit 12B faucet + service",
  snippet: "Please find attached invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B...",
  time: "now",
  attachment: "SP-4821.pdf",
  unread: true,
  arriving: true,
};

export function SceneInbox() {
  const [emails, setEmails] = useState<EmailRow[]>(baseEmails);
  const [capturedBy, setCapturedBy] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setEmails([arrivingEmail, ...baseEmails]), 600);
    const t2 = setTimeout(() => setCapturedBy(true), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] grid grid-cols-[260px_1fr] bg-[#f6f8fb]">
      <aside className="border-r border-border bg-background px-3 py-4">
        <div className="px-3 pb-3 text-xs text-muted font-medium">ap@greenfieldpm.com</div>
        <button className="w-full px-3 py-2 rounded-md bg-brand text-white text-sm font-medium">Compose</button>
        <nav className="mt-4 text-sm">
          <SideItem icon={<Inbox className="w-4 h-4" />} label="Inbox" count={127} active />
          <SideItem icon={<Star className="w-4 h-4" />} label="Starred" />
          <SideItem icon={<Mail className="w-4 h-4" />} label="Sent" />
        </nav>
        <div className="mt-8 mx-2 p-3 rounded-lg border border-border bg-surface">
          <div className="text-xs font-medium">PayablePilot is watching</div>
          <div className="text-[11px] text-muted mt-1">
            Auto-captures invoices from this inbox. Nothing gets paid without approval.
          </div>
        </div>
      </aside>

      <section className="flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
          <Search className="w-4 h-4 text-muted" />
          <input
            className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted"
            placeholder="Search mail"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {emails.map((e, i) => (
            <EmailRowView key={i} e={e} captured={e.arriving && capturedBy} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SideItem({
  icon,
  label,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1.5 rounded-md cursor-default",
        active ? "bg-brand-soft text-foreground" : "text-muted"
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {count !== undefined && <span className="text-xs">{count}</span>}
    </div>
  );
}

function EmailRowView({ e, captured }: { e: EmailRow; captured?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[220px_1fr_90px] items-center gap-4 px-5 py-3 border-b border-border",
        e.arriving && "animate-fade-in-up bg-[color-mix(in_oklab,var(--brand-soft)_50%,white)]",
        e.unread && "font-semibold"
      )}
    >
      <div className="truncate">{e.from}</div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="truncate">
          <span className={cn(e.unread ? "text-foreground" : "text-muted")}>{e.subject}</span>
          <span className="text-muted font-normal"> — {e.snippet}</span>
        </span>
        {e.attachment && (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted">
            <Paperclip className="w-3 h-3" />
            {e.attachment}
          </span>
        )}
        {captured && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand text-white text-[11px] font-medium animate-fade-in-up">
            Captured by PayablePilot
          </span>
        )}
      </div>
      <div className="text-right text-xs text-muted">{e.time}</div>
    </div>
  );
}
