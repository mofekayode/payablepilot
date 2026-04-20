"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  Search,
  HelpCircle,
  Settings,
  Grid3x3,
  Pencil,
  Inbox as InboxIcon,
  Star,
  Clock,
  SendIcon,
  FileText,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Link as LinkIcon,
  MoreVertical,
  Trash2,
  Minus,
  Maximize2,
  X,
  Check,
  ArrowLeft,
  Archive,
  AlertOctagon,
  MailOpen,
  FolderInput,
  Reply,
  Forward,
  Printer,
  CornerUpRight,
  Sparkles,
  Plus,
  BadgeCheck,
} from "lucide-react";
import { publishDemo, subscribeDemo } from "@/lib/demo-channel";
import { cn, money } from "@/lib/utils";
import { invoices as seedInvoices, vendors } from "@/lib/app-data";

type AccountKey = "summit" | "reliable" | "erin";
type VendorKey = Exclude<AccountKey, "erin">;

type VendorDraft = {
  key: VendorKey;
  senderName: string;
  senderEmail: string;
  senderInitials: string;
  senderColor: string;
  to: string;
  subject: string;
  body: string;
  attachment: { name: string; size: string };
  invoiceId: string;
  emailId: string;
  snippet: string;
  lastSavedAt: string;
};

type InboxEmail = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  receivedAgo: string;
  ctaLabel: string;
  ctaHref: string;
  ctaHint?: string;
  unread?: boolean;
  starred?: boolean;
  pinned?: boolean;
};

const ACCOUNTS: Record<AccountKey, { name: string; email: string; initials: string; color: string }> = {
  summit: { name: "Summit Plumbing", email: "billing@summitplumbing.com", initials: "SP", color: "#1a73e8" },
  reliable: { name: "Reliable Landscaping", email: "accounts@reliablelandscaping.com", initials: "RL", color: "#188038" },
  erin: { name: "Erin Boyd · Greenfield PM", email: "erin@greenfieldpm.com", initials: "EB", color: "#d93025" },
};

const DRAFTS_SEED: Record<VendorKey, VendorDraft> = {
  summit: {
    key: "summit",
    senderName: "Summit Plumbing Billing",
    senderEmail: "billing@summitplumbing.com",
    senderInitials: "SP",
    senderColor: "#1a73e8",
    to: "ap@greenfieldpm.com",
    subject: "Invoice SP-4821 · Unit 12B faucet + service",
    body: `Hi Greenfield team,

Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement, two shut-off valves, and 1.5 hours of service time.

Let me know if you need a W-9 refresh for the year. Payment terms are Net 30 as always.

Thanks,
Summit Plumbing · Billing`,
    snippet: "Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement…",
    attachment: { name: "SP-4821.pdf", size: "142 KB" },
    invoiceId: "inv-summit-4821",
    emailId: "em-summit",
    lastSavedAt: "8:02 AM",
  },
  reliable: {
    key: "reliable",
    senderName: "Reliable Landscaping",
    senderEmail: "accounts@reliablelandscaping.com",
    senderInitials: "RL",
    senderColor: "#188038",
    to: "ap@greenfieldpm.com",
    subject: "April invoice · portfolio grounds service",
    body: `Hi,

Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on for the Maple and Oak properties.

Our updated rate is reflected in this invoice.

Reliable Landscaping`,
    snippet: "Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on…",
    attachment: { name: "RL-2210.pdf", size: "218 KB" },
    invoiceId: "inv-reliable-2210",
    emailId: "em-reliable",
    lastSavedAt: "7:48 AM",
  },
};

const ERIN_INBOX: InboxEmail[] = [
  {
    id: "erin-1",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Morning digest · 11 invoices processed overnight",
    snippet: "Matched 10, flagged 1 pricing mismatch, blocked 1 duplicate. Payment batch ready for approval…",
    body: `Good morning, Erin.

I worked through the overnight queue between 2:14 AM and 5:30 AM. Here's the state of play:

• 11 invoices captured from ap@greenfieldpm.com
• 10 three-way matched and queued for payment (total $34,512.45)
• 1 pricing discrepancy flagged for your review (Reliable Landscaping RL-2210)
• 1 duplicate blocked (Metro Electric ME-0912 resend)
• 3 vendor emails drafted on your behalf

Today's payment batch is ready whenever you are. One click releases the full $34K to QuickBooks.`,
    receivedAt: "6:15 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "Review payment batch",
    ctaHref: "/?view=batch",
    ctaHint: "10 invoices · $34,512.45 · ready to release",
    unread: true,
    pinned: true,
  },
  {
    id: "erin-2",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Discrepancy alert · Reliable Landscaping RL-2210",
    snippet: "Invoice billed at $85/unit but approved PO PO-1055 shows $75/unit. Vendor reply drafted…",
    body: `Hi Erin,

Reliable Landscaping sent invoice RL-2210 this morning and the first line doesn't match our approved PO.

• Invoice: 16 lawn-service visits at $85.00 per visit
• PO-1055: 16 lawn-service visits at $75.00 per visit
• Over-billed by $160

I've put the invoice on hold and drafted a reply asking them to confirm the rate or send a revised invoice. The draft auto-sends in 10 minutes unless you intervene.`,
    receivedAt: "6:18 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "Review discrepancy",
    ctaHref: "/?view=discrepancies",
    ctaHint: "Draft reply to vendor ready to send",
    unread: true,
  },
  {
    id: "erin-3",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Duplicate blocked · Metro Electric ME-0912",
    snippet: "Caught a re-sent invoice that was already paid on 2026-04-12. Polite reply drafted…",
    body: `Quick note:

Metro Electric re-sent invoice ME-0912 at 6:54 AM asking us to "confirm receipt." That invoice was already paid on 2026-04-12 (check CHK-20418).

I've blocked it from the payment run and drafted a polite reply. No action needed unless you want to review the draft.`,
    receivedAt: "6:22 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "View audit trail",
    ctaHref: "/?view=outbox",
    unread: true,
  },
  {
    id: "erin-4",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Statement reconciled · Summit Plumbing April",
    snippet: "Summit's April statement lines up with our books. No variance…",
    body: `Hi Erin,

Summit Plumbing's April statement (STMT-SP-2026-04) came in overnight. I reconciled it line-by-line against our posted invoices:

• Their total: $8,492.40
• Our total:   $8,492.40
• Variance:    $0.00

Fully balanced. I've already replied to Summit confirming the reconciliation.`,
    receivedAt: "4:08 AM",
    receivedAgo: "4 hours ago",
    ctaLabel: "Open reconciliation",
    ctaHref: "/?view=statements",
  },
  {
    id: "erin-5",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Receipt needed: Staples $67.90 on 2026-04-16",
    snippet: "Your Chase Ink charge at Staples has no matching receipt on file yet…",
    body: `Hi Erin,

A Chase Ink charge (ending 4411) posted at Staples on 2026-04-16 for $67.90 with no receipt on file.

Forward the receipt to ap@greenfieldpm.com and I'll auto-match and code it. Otherwise I'll ping again tomorrow morning.`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    ctaLabel: "Upload receipt",
    ctaHref: "/?view=cards",
  },
];

const AGENT_EMAIL_SUMMIT: InboxEmail = {
  id: "erin-summit-matched",
  fromName: "PayablePilot",
  fromEmail: "pilot@greenfieldpm.com",
  subject: "Invoice matched · Summit Plumbing SP-4821",
  snippet:
    "Three-way matched against PO-1042. Coded to 6120 Repairs & Maintenance. Added to today's payment batch, ready for approval.",
  body: `Hi Erin,

Summit Plumbing's SP-4821 landed in the inbox and I worked it while you read this.

• Matched against PO-1042 (approved on 2026-04-10)
• Receiving signed by Marcus Hill on 2026-04-15
• Coded to 6120 · Repairs & Maintenance
• Added to today's payment batch

No action required unless you want to review before approving the batch.`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  ctaLabel: "Review in payment batch",
  ctaHref: "/?view=batch",
  ctaHint: "Matched invoice · $399.00 · ready to release",
  unread: true,
  pinned: true,
};

const AGENT_EMAIL_RELIABLE: InboxEmail = {
  id: "erin-reliable-flagged",
  fromName: "PayablePilot",
  fromEmail: "pilot@greenfieldpm.com",
  subject: "Pricing discrepancy detected · Reliable Landscaping RL-2210",
  snippet:
    "Invoice billed at $85/unit but approved PO shows $75/unit. Over-billed by $160. Vendor reply drafted and on hold.",
  body: `Hi Erin,

Reliable Landscaping just sent invoice RL-2210 and line 1 doesn't match our approved PO.

• Invoice: 16 lawn-service visits at $85.00 per visit
• PO-1055: 16 lawn-service visits at $75.00 per visit
• Over-billed by $160

I've placed a payment hold and drafted a reply to accounts@reliablelandscaping.com asking them to confirm the correct rate or send a revised invoice. The draft auto-sends in 10 minutes unless you jump in.`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  ctaLabel: "Review discrepancy",
  ctaHref: "/?view=discrepancies",
  ctaHint: "Draft reply to vendor ready to send",
  unread: true,
  pinned: true,
};

export function VendorMail() {
  const [active, setActive] = useState<AccountKey>("summit");
  const [drafts, setDrafts] = useState<Record<VendorKey, VendorDraft>>(() => ({ ...DRAFTS_SEED }));
  const [sent, setSent] = useState<Record<VendorKey, boolean>>({ summit: false, reliable: false });
  const [sending, setSending] = useState<VendorKey | null>(null);
  const [composing, setComposing] = useState<VendorKey | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [erinInbox, setErinInbox] = useState<InboxEmail[]>(ERIN_INBOX);

  useEffect(() => {
    return subscribeDemo((msg) => {
      if (msg.type === "reset") {
        setErinInbox(ERIN_INBOX);
        return;
      }
      if (msg.type === "invoice_sent") {
        const agentEmail =
          msg.invoiceId === "inv-summit-4821" ? AGENT_EMAIL_SUMMIT : AGENT_EMAIL_RELIABLE;
        // Simulate the agent taking a moment to process before the email lands
        const delay = msg.invoiceId === "inv-summit-4821" ? 4500 : 5500;
        setTimeout(() => {
          setErinInbox((prev) => {
            if (prev.some((e) => e.id === agentEmail.id)) return prev;
            return [agentEmail, ...prev];
          });
        }, delay);
      }
    });
  }, []);

  const handleSwitchAccount = (key: AccountKey) => {
    setActive(key);
    setOpenEmail(null);
    setComposing(null);
  };

  const updateDraft = (key: VendorKey, patch: Partial<VendorDraft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const openCompose = (key: VendorKey) => setComposing(key);
  const closeCompose = () => setComposing(null);

  const sendDraft = async (key: VendorKey) => {
    if (sending) return;
    setSending(key);
    await new Promise((r) => setTimeout(r, 700));
    const d = drafts[key];
    publishDemo({ type: "invoice_sent", invoiceId: d.invoiceId, emailId: d.emailId, at: Date.now() });
    setSent((prev) => ({ ...prev, [key]: true }));
    setSending(null);
    setComposing(null);
  };

  const onReset = () => {
    setDrafts({ ...DRAFTS_SEED });
    setSent({ summit: false, reliable: false });
    setComposing(null);
    setActive("summit");
    setOpenEmail(null);
    setErinInbox(ERIN_INBOX);
    publishDemo({ type: "reset", at: Date.now() });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-[#202124] relative overflow-hidden">
      <TopBar account={ACCOUNTS[active]} activeKey={active} onSwitch={handleSwitchAccount} onReset={onReset} />
      <div className="flex-1 min-h-0 flex">
        <SideRail
          active={active}
          onCompose={() => {
            if (active === "erin") return;
            openCompose(active);
          }}
          onReset={onReset}
          sent={sent}
          erinInbox={erinInbox}
        />
        <Main
          active={active}
          drafts={drafts}
          sent={sent}
          onOpenDraft={(k) => openCompose(k)}
          openEmail={openEmail}
          onOpenEmail={setOpenEmail}
          erinInbox={erinInbox}
        />
      </div>
      {composing && (
        <ComposeWindow
          draft={drafts[composing]}
          sending={sending === composing}
          onChange={(patch) => updateDraft(composing, patch)}
          onSend={() => sendDraft(composing)}
          onClose={closeCompose}
        />
      )}
    </div>
  );
}

// -------- Top bar --------

function GmailLogo() {
  return (
    <svg width="36" height="28" viewBox="0 0 48 36" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 36 H14 V19 L2 10 V32 A4 4 0 0 0 6 36 H14" fill="#4285F4" />
      <path d="M44 36 H34 V19 L46 10 V32 A4 4 0 0 1 42 36 H34" fill="#FBBC04" />
      <path d="M14 36 H34 V19 L24 26 L14 19 Z" fill="#34A853" />
      <path d="M0 10 L24 26 L48 10 V6 A4 4 0 0 0 44 2 H4 A4 4 0 0 0 0 6 Z" fill="#EA4335" />
      <path d="M0 6 V10 L4 13 V9.5 Z" fill="#C5221F" opacity="0.4" />
      <path d="M48 6 V10 L44 13 V9.5 Z" fill="#C5221F" opacity="0.4" />
    </svg>
  );
}

function GeminiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 2 C12.6 7.2 16.8 11.4 22 12 C16.8 12.6 12.6 16.8 12 22 C11.4 16.8 7.2 12.6 2 12 C7.2 11.4 11.4 7.2 12 2 Z"
        fill="#4285F4"
      />
      <path
        d="M12 5.2 C12.4 8.6 15.4 11.6 18.8 12 C15.4 12.4 12.4 15.4 12 18.8 C11.6 15.4 8.6 12.4 5.2 12 C8.6 11.6 11.6 8.6 12 5.2 Z"
        fill="#8AB4F8"
      />
    </svg>
  );
}

function TopBar({
  account,
  activeKey,
  onSwitch,
  onReset,
}: {
  account: (typeof ACCOUNTS)[AccountKey];
  activeKey: AccountKey;
  onSwitch: (k: AccountKey) => void;
  onReset: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="h-16 flex items-center gap-4 px-4 border-b border-[#e8eaed] shrink-0 bg-white">
      <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
        <Menu className="w-5 h-5 text-[#5f6368]" />
      </button>
      <div className="flex items-center pr-4 pl-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_lockup_default_1x_r5.png"
          alt="Gmail"
          className="h-10 w-auto"
        />
      </div>

      <div className="flex-1 mx-2">
        <div className="flex items-center gap-3 h-12 rounded-lg bg-[#f1f3f4] px-4 focus-within:bg-white focus-within:shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
          <Search className="w-5 h-5 text-[#5f6368]" />
          <span className="text-[15px] text-[#5f6368]">Search mail</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <HelpCircle className="w-5 h-5 text-[#5f6368]" />
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <Settings className="w-5 h-5 text-[#5f6368]" />
        </button>
        <button className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#c2e7ff] hover:bg-[#a8d1ff] text-[#001d35] text-[14px] font-medium mx-1">
          Upgrade
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <GeminiIcon />
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <Grid3x3 className="w-5 h-5 text-[#5f6368]" />
        </button>
        <div className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full text-white grid place-items-center font-medium text-[13px]"
            style={{ background: account.color }}
          >
            {account.initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 flex flex-col bg-white border border-[#e8eaed] rounded-lg shadow-[0_6px_20px_rgba(60,64,67,0.2)] py-1 min-w-[280px] z-50">
                <div className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wider text-[#5f6368] font-medium">
                  Switch account
                </div>
                <AccountRow
                  name="Summit Plumbing"
                  email="billing@summitplumbing.com"
                  initials="SP"
                  color="#1a73e8"
                  active={activeKey === "summit"}
                  onClick={() => {
                    onSwitch("summit");
                    setMenuOpen(false);
                  }}
                />
                <AccountRow
                  name="Reliable Landscaping"
                  email="accounts@reliablelandscaping.com"
                  initials="RL"
                  color="#188038"
                  active={activeKey === "reliable"}
                  onClick={() => {
                    onSwitch("reliable");
                    setMenuOpen(false);
                  }}
                />
                <div className="border-t border-[#e8eaed] my-1" />
                <AccountRow
                  name="Erin Boyd · Greenfield PM"
                  email="erin@greenfieldpm.com"
                  initials="EB"
                  color="#d93025"
                  active={activeKey === "erin"}
                  onClick={() => {
                    onSwitch("erin");
                    setMenuOpen(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AccountRow({
  name,
  email,
  initials,
  color,
  active,
  onClick,
}: {
  name: string;
  email: string;
  initials: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-[#f1f3f4] text-left", active && "bg-[#e8f0fe]")}
    >
      <div
        className="w-9 h-9 rounded-full text-white grid place-items-center font-medium text-[12px]"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium truncate">{name}</div>
        <div className="text-[11.5px] text-[#5f6368] truncate">{email}</div>
      </div>
      {active && <Check className="w-4 h-4 text-[#1a73e8] shrink-0" />}
    </button>
  );
}

// -------- Side rail --------

function SideRail({
  active,
  onCompose,
  onReset,
  sent,
  erinInbox,
}: {
  active: AccountKey;
  onCompose: () => void;
  onReset: () => void;
  sent: Record<VendorKey, boolean>;
  erinInbox: InboxEmail[];
}) {
  const isErin = active === "erin";
  const draftsOpen = isErin ? 0 : (sent.summit ? 0 : 1) + (sent.reliable ? 0 : 1);
  const inboxUnread = isErin ? erinInbox.filter((e) => e.unread).length : 12;
  const sentCount = !isErin ? Number(sent.summit) + Number(sent.reliable) : 0;

  return (
    <aside className="w-[256px] shrink-0 py-2 px-3 bg-white overflow-auto">
      <button
        onClick={onCompose}
        disabled={isErin}
        className={cn(
          "flex items-center gap-4 pl-3 pr-6 h-14 rounded-2xl shadow-[0_1px_3px_rgba(60,64,67,0.15)] hover:shadow-[0_2px_6px_rgba(60,64,67,0.2)] transition-shadow",
          isErin ? "bg-[#f1f3f4] opacity-60 cursor-not-allowed" : "bg-[#c2e7ff]"
        )}
      >
        <Pencil className="w-5 h-5 text-[#001d35]" />
        <span className="text-[14px] font-medium text-[#001d35]">Compose</span>
      </button>

      <nav className="mt-4 text-[14px]">
        <RailItem icon={<InboxIcon className="w-5 h-5" />} label="Inbox" count={inboxUnread} active={isErin} />
        <RailItem icon={<Star className="w-5 h-5" />} label="Starred" />
        <RailItem icon={<Clock className="w-5 h-5" />} label="Snoozed" />
        <RailItem icon={<SendIcon className="w-5 h-5" />} label="Sent" count={sentCount || undefined} />
        <RailItem icon={<FileText className="w-5 h-5" />} label="Drafts" count={draftsOpen || undefined} active={!isErin} />
        <RailItem icon={<Tag className="w-5 h-5" />} label="Categories" />
        <div className="pl-6 pr-4 h-8 flex items-center text-[13px] text-[#5f6368]">More</div>

        <div className="mt-3 border-t border-[#e8eaed] pt-3">
          <div className="flex items-center justify-between pl-6 pr-4 h-8 text-[13px] text-[#5f6368]">
            <span>Labels</span>
            <Plus className="w-4 h-4" />
          </div>
          <LabelChip color="#d93025" label="PayablePilot" count={isErin ? erinInbox.length : undefined} />
          <LabelChip color="#188038" label="Payments" />
          <LabelChip color="#f9ab00" label="Exceptions" />
        </div>

        <div className="mt-6 pl-6 pr-4">
          <button
            onClick={onReset}
            className="text-[11.5px] text-[#5f6368] hover:text-[#202124] hover:underline"
          >
            Reset demo drafts
          </button>
        </div>
      </nav>
    </aside>
  );
}

function RailItem({
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
        "flex items-center justify-between gap-3 pl-6 pr-4 h-8 rounded-full cursor-default",
        active ? "bg-[#d3e3fd] text-[#001d35] font-medium" : "text-[#202124] hover:bg-[#f1f3f4]"
      )}
    >
      <span className="flex items-center gap-4">
        <span className={cn(active ? "text-[#001d35]" : "text-[#5f6368]")}>{icon}</span>
        <span className="text-[14px]">{label}</span>
      </span>
      {count !== undefined && <span className="text-[12px]">{count}</span>}
    </div>
  );
}

function LabelChip({ color, label, count }: { color: string; label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 pl-6 pr-4 h-8 rounded-full text-[#202124] hover:bg-[#f1f3f4]">
      <span className="flex items-center gap-4">
        <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
        <span className="text-[13.5px]">{label}</span>
      </span>
      {count !== undefined && <span className="text-[12px]">{count}</span>}
    </div>
  );
}

// -------- Main pane --------

function Main({
  active,
  drafts,
  sent,
  onOpenDraft,
  openEmail,
  onOpenEmail,
  erinInbox,
}: {
  active: AccountKey;
  drafts: Record<VendorKey, VendorDraft>;
  sent: Record<VendorKey, boolean>;
  onOpenDraft: (k: VendorKey) => void;
  openEmail: string | null;
  onOpenEmail: (id: string | null) => void;
  erinInbox: InboxEmail[];
}) {
  const current = useMemo(
    () => (active === "erin" ? erinInbox.find((e) => e.id === openEmail) ?? null : null),
    [active, openEmail, erinInbox]
  );
  if (active === "erin") {
    return (
      <div className="flex-1 min-h-0 bg-white overflow-auto rounded-tl-2xl border-t border-l border-[#e8eaed] mt-1">
        {current ? (
          <EmailReader email={current} onBack={() => onOpenEmail(null)} />
        ) : (
          <ErinInbox emails={erinInbox} onOpen={onOpenEmail} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-white overflow-auto rounded-tl-2xl border-t border-l border-[#e8eaed] mt-1">
      <DraftsList drafts={drafts} sent={sent} onOpen={onOpenDraft} />
    </div>
  );
}

// -------- Drafts list --------

function DraftsList({
  drafts,
  sent,
  onOpen,
}: {
  drafts: Record<VendorKey, VendorDraft>;
  sent: Record<VendorKey, boolean>;
  onOpen: (k: VendorKey) => void;
}) {
  const order: VendorKey[] = ["summit", "reliable"];
  const openDrafts = order.filter((k) => !sent[k]);
  const sentDrafts = order.filter((k) => sent[k]);

  return (
    <div>
      <div className="flex items-center gap-4 px-4 h-11 border-b border-[#e8eaed] text-[#5f6368] text-[13px]">
        <div className="w-5 h-5 rounded-sm border border-[#dadce0]" />
        <span>Refresh</span>
        <span className="ml-auto text-[11.5px]">1-{openDrafts.length + sentDrafts.length} of {openDrafts.length + sentDrafts.length}</span>
      </div>

      {openDrafts.length === 0 ? (
        <div className="p-16 text-center text-[#5f6368] text-[14px]">
          All drafts sent. Hit <span className="text-[#0b57d0] font-medium">Reset demo</span> to restore them.
        </div>
      ) : (
        <ul>
          {openDrafts.map((k, i) => (
            <DraftRow key={k} draft={drafts[k]} onClick={() => onOpen(k)} fresh={i === 0} />
          ))}
        </ul>
      )}

      {sentDrafts.length > 0 && (
        <>
          <div className="px-4 pt-6 pb-2 text-[11px] uppercase tracking-wider text-[#5f6368] font-medium">Already sent</div>
          <ul>
            {sentDrafts.map((k) => (
              <SentRow key={k} draft={drafts[k]} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DraftRow({ draft, onClick, fresh }: { draft: VendorDraft; onClick: () => void; fresh?: boolean }) {
  return (
    <li
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] bg-white hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,0.15)] cursor-pointer",
        fresh && "animate-fade-in-up"
      )}
    >
      <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
      <Star className="w-[18px] h-[18px] text-[#5f6368]/40 shrink-0" />
      <div className="w-[180px] shrink-0 truncate flex items-center gap-3">
        <div className="w-6 h-6 rounded-full text-white grid place-items-center text-[10px] font-medium shrink-0" style={{ background: draft.senderColor }}>
          {draft.senderInitials}
        </div>
        <span className="text-[#d93025] font-medium text-[13.5px]">Draft</span>
      </div>
      <div className="flex-1 min-w-0 truncate text-[13.5px]">
        <span className="text-[#202124] font-medium">{draft.subject}</span>
        <span className="text-[#5f6368]"> · {draft.snippet}</span>
      </div>
      <Paperclip className="w-[15px] h-[15px] text-[#5f6368]/70 shrink-0" />
      <div className="shrink-0 text-[12px] text-[#5f6368] w-[76px] text-right">{draft.lastSavedAt}</div>
    </li>
  );
}

function SentRow({ draft }: { draft: VendorDraft }) {
  return (
    <li className="flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] text-[#5f6368] bg-[#fafbfc]">
      <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
      <Star className="w-[18px] h-[18px] text-[#5f6368]/30 shrink-0" />
      <div className="w-[180px] shrink-0 truncate flex items-center gap-3">
        <div className="w-6 h-6 rounded-full text-white grid place-items-center text-[10px] font-medium shrink-0" style={{ background: draft.senderColor }}>
          {draft.senderInitials}
        </div>
        <span className="text-[#137333] font-medium text-[13px]">Sent</span>
      </div>
      <div className="flex-1 min-w-0 truncate text-[13.5px]">
        <span>{draft.subject}</span>
        <span> · {draft.snippet}</span>
      </div>
      <Paperclip className="w-[15px] h-[15px] text-[#5f6368]/50 shrink-0" />
      <div className="shrink-0 text-[12px] w-[76px] text-right">now</div>
    </li>
  );
}

// -------- Compose floating window --------

function ComposeWindow({
  draft,
  sending,
  onChange,
  onSend,
  onClose,
}: {
  draft: VendorDraft;
  sending: boolean;
  onChange: (patch: Partial<VendorDraft>) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] grid place-items-center p-8 animate-fade-in-up">
      <div className="w-full max-w-[1080px] h-[calc(100vh-4rem)] bg-white rounded-lg border border-[#e8eaed] shadow-[0_20px_60px_rgba(60,64,67,0.35)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#f2f6fc] border-b border-[#e8eaed] text-[#202124]">
          <span className="text-[14px] font-medium truncate pr-4">
            {draft.subject || "New message"}
          </span>
          <div className="flex items-center gap-1 text-[#5f6368] shrink-0">
            <button className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 border-b border-[#f1f3f4]">
          <span className="text-[12px] text-[#5f6368] w-12">From</span>
          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="font-medium">{draft.senderName}</span>
            <span className="text-[#5f6368]">&lt;{draft.senderEmail}&gt;</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 border-b border-[#f1f3f4]">
          <span className="text-[12px] text-[#5f6368] w-12">To</span>
          <input
            value={draft.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="flex-1 bg-transparent text-[14px] outline-none"
          />
          <div className="flex gap-3 text-[12.5px] text-[#5f6368]">
            <button className="hover:underline">Cc</button>
            <button className="hover:underline">Bcc</button>
          </div>
        </div>

        <div className="px-6 py-2 border-b border-[#f1f3f4]">
          <input
            value={draft.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Subject"
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-[#5f6368] placeholder:font-normal"
          />
        </div>

        <textarea
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
          className="flex-1 px-6 py-5 bg-transparent text-[15px] leading-[1.65] outline-none resize-none font-['DM_Sans',_system-ui,_sans-serif]"
        />

        <div className="px-6 pb-4">
          <AttachmentPreview draft={draft} />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-[#e8eaed]">
          <div className="flex items-center gap-1">
            <button
              disabled={sending}
              onClick={onSend}
              className={cn(
                "inline-flex items-center gap-2 pl-6 pr-4 h-10 rounded-full text-[14px] font-medium text-white",
                sending ? "bg-[#5f6368] cursor-wait" : "bg-[#0b57d0] hover:bg-[#0a4fc0]"
              )}
            >
              {sending ? "Sending…" : "Send"}
              {!sending && <ChevronDown className="w-4 h-4" />}
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <LinkIcon className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <Smile className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <ImageIcon className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>
          </div>
          <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Attachment preview --------

function AttachmentPreview({ draft }: { draft: VendorDraft }) {
  const invoice = seedInvoices.find((i) => i.id === draft.invoiceId);
  const vendor = invoice ? vendors[invoice.vendorKey] : null;
  if (!invoice || !vendor) return null;

  const total = invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const trimmedName =
    draft.attachment.name.length > 22 ? draft.attachment.name.slice(0, 20) + "…" : draft.attachment.name;

  return (
    <div>
      <div className="flex items-center gap-3 text-[13px] pb-3 border-t border-[#e8eaed] pt-5">
        <span className="font-medium text-[#202124]">One attachment</span>
        <span className="text-[#5f6368]">·</span>
        <span className="text-[#5f6368]">Scanned by Gmail</span>
        <HelpCircle className="w-4 h-4 text-[#5f6368]" />
        <button className="ml-4 inline-flex items-center gap-2 text-[#5f6368] hover:text-[#202124]">
          <DriveIcon />
          <span>Add to Drive</span>
        </button>
      </div>

      <div className="group w-[244px] bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(60,64,67,0.15)] hover:shadow-[0_2px_6px_rgba(60,64,67,0.25)] transition-shadow cursor-pointer">
        <div className="relative h-[200px] overflow-hidden bg-white border-b border-[#e8eaed]">
          <MiniInvoice invoice={invoice} vendor={vendor} total={total} />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-solid" style={{
            borderTopColor: "transparent",
            borderLeftColor: "transparent",
            borderRightColor: "#ea4335",
            borderBottomColor: "#ea4335",
            borderWidth: "0 0 28px 28px",
          }} />
          <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white tracking-wider">
            PDF
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <PdfIcon />
          <span className="text-[13px] font-medium truncate flex-1">{trimmedName}</span>
        </div>
      </div>
    </div>
  );
}

function MiniInvoice({
  invoice,
  vendor,
  total,
}: {
  invoice: (typeof seedInvoices)[number];
  vendor: { name: string; email: string };
  total: number;
}) {
  return (
    <div className="w-full h-full p-3 text-[6px] leading-[1.3] text-[#202124] font-sans overflow-hidden pointer-events-none">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[5px] tracking-[0.15em] font-semibold text-[#5f6368]">INVOICE</div>
          <div className="text-[9px] font-semibold mt-0.5 leading-tight">{vendor.name}</div>
          <div className="text-[5px] text-[#5f6368]">{vendor.email}</div>
        </div>
        <div className="text-right text-[5px] text-[#5f6368]">
          <div>Invoice #: {invoice.invoiceNumber}</div>
          <div>Issued: {invoice.issueDate}</div>
          <div>Due: {invoice.dueDate}</div>
        </div>
      </div>

      <div className="h-[2px] bg-[#ea4335] my-2 w-10" />

      <div className="text-[5px] text-[#5f6368]">Bill to</div>
      <div className="text-[6px] font-medium leading-tight">Greenfield Property Management</div>
      <div className="text-[5px] text-[#5f6368]">{invoice.propertyRef}</div>
      <div className="text-[5px] text-[#5f6368]">Ref PO: {invoice.poNumber}</div>

      <div className="mt-2 pb-0.5 border-b border-[#e8eaed] flex text-[4.5px] uppercase tracking-wider text-[#5f6368]">
        <span className="flex-1">Description</span>
        <span className="w-5 text-right">Qty</span>
        <span className="w-7 text-right">Unit</span>
        <span className="w-8 text-right">Total</span>
      </div>
      {invoice.lines.slice(0, 4).map((l, i) => (
        <div key={i} className="flex text-[5px] py-0.5 border-b border-[#f1f3f4]">
          <span className="flex-1 truncate pr-1">{l.description}</span>
          <span className="w-5 text-right">{l.qty}</span>
          <span className="w-7 text-right">${l.unitPrice.toFixed(2)}</span>
          <span className="w-8 text-right">${(l.qty * l.unitPrice).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-end pt-1 text-[6px]">
        <span className="text-[#5f6368] pr-2">Total due</span>
        <span className="font-semibold">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PdfIcon() {
  return (
    <div className="w-6 h-6 rounded-sm bg-[#ea4335] text-white grid place-items-center text-[8px] font-bold tracking-wider shrink-0">
      PDF
    </div>
  );
}

function DriveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7.5 3 L16.5 3 L21 11 L16.5 19 L7.5 19 L3 11 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8 L12 14 M9 11 L15 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// -------- Erin inbox --------

function ErinInbox({ emails, onOpen }: { emails: InboxEmail[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-4 px-4 h-11 border-b border-[#e8eaed] text-[#5f6368] text-[13px]">
        <div className="w-5 h-5 rounded-sm border border-[#dadce0]" />
        <span>Refresh</span>
        <span className="ml-auto text-[11.5px]">1-{emails.length} of {emails.length}</span>
      </div>
      <ul>
        {emails.map((e, i) => (
          <li
            key={e.id}
            onClick={() => onOpen(e.id)}
            className={cn(
              "flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] cursor-pointer hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,0.15)]",
              e.unread ? "bg-white" : "bg-[#fafbfc]",
              i === 0 && "animate-fade-in-up"
            )}
          >
            <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
            <Star className={cn("w-[18px] h-[18px] shrink-0", e.pinned ? "text-[#f9ab00]" : "text-[#5f6368]/40")} />
            <div className={cn("w-[180px] shrink-0 truncate flex items-center gap-3", e.unread && "font-semibold text-[#202124]")}>
              <div className="w-6 h-6 rounded-full bg-[#d93025] text-white grid place-items-center shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="truncate text-[13.5px]">{e.fromName}</span>
            </div>
            <div className="flex-1 min-w-0 truncate text-[13.5px]">
              <span className={cn(e.unread && "font-semibold text-[#202124]")}>{e.subject}</span>
              <span className="text-[#5f6368]"> · {e.snippet}</span>
            </div>
            <div className={cn("shrink-0 text-[12px] w-[76px] text-right", e.unread ? "text-[#202124] font-semibold" : "text-[#5f6368]")}>
              {e.receivedAt}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailReader({ email, onBack }: { email: InboxEmail; onBack: () => void }) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 h-11 border-b border-[#e8eaed] text-[#5f6368] shrink-0">
        <ToolbarBtn icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={onBack} tooltip="Back" />
        <span className="mx-1 w-px h-5 bg-[#e8eaed]" />
        <ToolbarBtn icon={<Archive className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<AlertOctagon className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Trash2 className="w-4.5 h-4.5" />} />
        <span className="mx-1 w-px h-5 bg-[#e8eaed]" />
        <ToolbarBtn icon={<MailOpen className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Clock className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<FolderInput className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Tag className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<MoreVertical className="w-4.5 h-4.5" />} />
        <div className="ml-auto flex items-center gap-1 text-[12px] text-[#5f6368]">
          <ToolbarBtn icon={<ChevronLeft className="w-4.5 h-4.5" />} />
          <ToolbarBtn icon={<ChevronRight className="w-4.5 h-4.5" />} />
        </div>
      </div>

      <div className="max-w-[980px] mx-auto w-full px-8 pt-5 pb-10">
        {/* Subject */}
        <div className="flex items-start gap-3 pl-[52px]">
          <h1 className="text-[22px] font-normal flex-1 text-[#202124]">{email.subject}</h1>
          <span className="inline-flex items-center gap-1 bg-[#f1f3f4] text-[#5f6368] text-[11px] rounded px-2 py-0.5 whitespace-nowrap mt-1">
            Inbox <X className="w-3 h-3" />
          </span>
          <button className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full w-9 h-9 grid place-items-center ml-1">
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Sender */}
        <div className="flex items-start gap-3 mt-5">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#d93025] text-white grid place-items-center">
              <Sparkles className="w-[17px] h-[17px]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white grid place-items-center">
              <BadgeCheck className="w-4 h-4 text-[#1a73e8] fill-[#1a73e8] stroke-white" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[14px] font-semibold text-[#202124]">{email.fromName}</span>
              <span className="text-[13px] text-[#5f6368]">&lt;{email.fromEmail}&gt;</span>
            </div>
            <div className="flex items-center gap-1 text-[12.5px] text-[#5f6368] mt-0.5">
              <span>to me</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-[#5f6368]">
            <span className="text-[12.5px] mr-1">
              {email.receivedAt} <span>({email.receivedAgo})</span>
            </span>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <Star className="w-4.5 h-4.5" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <Reply className="w-4.5 h-4.5" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Branded email body */}
        <div className="mt-4 pl-[52px]">
          <BrandedEmailBody email={email} />
        </div>

        {/* Reply / Forward pill buttons */}
        <div className="mt-6 pl-[52px] flex items-center gap-2">
          <ActionButton icon={<Reply className="w-4 h-4" />} label="Reply" />
          <ActionButton icon={<Forward className="w-4 h-4" />} label="Forward" />
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, onClick, tooltip }: { icon: React.ReactNode; onClick?: () => void; tooltip?: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]"
    >
      {icon}
    </button>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] text-[13.5px] text-[#202124]">
      {icon}
      {label}
    </button>
  );
}

function BrandedEmailBody({ email }: { email: InboxEmail }) {
  return (
    <div className="rounded-lg border border-[#e8eaed] bg-white overflow-hidden max-w-[620px]">
      {/* Branded header */}
      <div className="px-6 py-5 bg-[#1b2a4a] text-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/15 grid place-items-center">
          <Sparkles className="w-4 h-4 text-[#ccfbf1]" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
          <div className="text-[11.5px] text-white/65">Your AP assistant · Greenfield PM</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-7 py-6 text-[14px] leading-[1.65] text-[#202124] whitespace-pre-wrap">
        {email.body}
      </div>

      {/* CTA */}
      <div className="px-7 pb-6">
        <a
          href={email.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-[#0d9488] text-white text-[13.5px] font-medium hover:bg-[#0b807a] no-underline"
        >
          {email.ctaLabel}
          <ChevronRight className="w-4 h-4" />
        </a>
        {email.ctaHint && <div className="mt-2 text-[12px] text-[#5f6368]">{email.ctaHint}</div>}
      </div>

      {/* Footer */}
      <div className="px-7 py-4 bg-[#f6f8fc] border-t border-[#e8eaed] text-[11px] text-[#5f6368] flex items-center justify-between flex-wrap gap-2">
        <span>Sent by PayablePilot on behalf of Greenfield Property Management.</span>
        <span className="flex items-center gap-3">
          <a className="hover:underline cursor-pointer">Preferences</a>
          <span>·</span>
          <a className="hover:underline cursor-pointer">Audit trail</a>
        </span>
      </div>
    </div>
  );
}
