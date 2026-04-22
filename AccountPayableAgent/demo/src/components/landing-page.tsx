"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  PlayCircle,
  ArrowRight,
  Mail,
  ClipboardList,
  FileText,
  ShieldCheck,
  Check,
  Ban,
  CreditCard,
  Users,
  FileSpreadsheet,
  ReceiptText,
  Receipt,
  CalendarCheck,
  Clock,
  Sparkles,
  MailCheck,
  BadgeCheck,
  Lock,
  Play,
  X,
  AlertTriangle,
} from "lucide-react";
import { DemoOrchestrator } from "./demo-orchestrator";
import { PilotMark } from "./pilot-mark";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <Features />
      <HowItWorks />
      <TheMath />
      <InteractiveTour />
      <TrustSafe />
      <FinalCta />
      <Footer />
    </div>
  );
}

// -------- Top nav --------

function TopNav() {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-[1180px] mx-auto px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-foreground text-background grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-[17px]">PayablePilot</span>
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-6 text-sm text-muted">
          <a href="#features" className="hover:text-foreground">What it handles</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#tour" className="hover:text-foreground">Live tour</a>
          <a href="#safety" className="hover:text-foreground">Safety</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://calendly.com/mofekayode/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Calendar className="w-4 h-4" /> Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}

// -------- Hero --------

function Hero() {
  return (
    <section className="pt-16 pb-20 px-6">
      <div className="max-w-[1180px] mx-auto">
        <h1 className="text-[56px] leading-[1.05] font-semibold tracking-tight max-w-[880px]">
          AP under control.
          <br />
          Without adding headcount.
        </h1>
        <p className="mt-5 text-[18px] leading-[1.6] text-muted max-w-[720px]">
          PayablePilot reads every invoice that lands in your inbox, matches it against your purchase orders, codes the GL, and prepares your payment batch inside whatever you already use for books. You review. You approve. You go home on time.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#demo-video"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-brand text-white text-sm font-medium hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]"
          >
            <PlayCircle className="w-4 h-4" />
            Watch the 2-minute demo
          </a>
          <Link
            href="/tour"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface"
          >
            See it live
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="text-xs text-muted flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-brand" />
            Setup in one week. 30-day money-back guarantee.
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted">
          <span className="uppercase tracking-[0.18em] font-medium">Works with</span>
          <span className="font-medium text-foreground">QuickBooks</span>
          <span>·</span>
          <span className="font-medium text-foreground">Excel</span>
          <span>·</span>
          <span className="font-medium text-foreground">Sage</span>
          <span>·</span>
          <span className="font-medium text-foreground">NetSuite</span>
          <span>·</span>
          <span className="font-medium text-foreground">Xero</span>
          <span>·</span>
          <span>and whatever spreadsheet your team already lives in.</span>
        </div>

        {/* Loom video placeholder */}
        <div id="demo-video" className="mt-12">
          <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_30px_80px_-40px_rgba(27,42,74,0.25)]">
            <div className="px-5 py-3 border-b border-border bg-surface flex items-center gap-3">
              <span className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </span>
              <span className="text-xs text-muted font-mono">greenfield-pm-demo.loom</span>
              <span className="ml-auto text-[11px] text-muted">2 min 10 sec</span>
            </div>
            <div className="aspect-video bg-surface">
              <iframe
                src="https://www.loom.com/embed/82733eac0b334e3884f8f4c9502fa58e"
                title="PayablePilot demo"
                allow="fullscreen; clipboard-write"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- Features --------

function Features() {
  const daily = [
    { icon: <Mail className="w-4 h-4" />, title: "Invoice capture from email", body: "Pulls every invoice attachment out of your AP inbox, extracts the fields, and files it." },
    { icon: <FileText className="w-4 h-4" />, title: "Automatic data extraction", body: "Vendor, invoice number, line items, totals, dates, PO reference, all structured." },
    { icon: <ClipboardList className="w-4 h-4" />, title: "GL coding", body: "Coded to the right account based on your chart of accounts and vendor history." },
    { icon: <Check className="w-4 h-4" />, title: "Two and three-way PO match", body: "Matches invoices to POs and signed receiving. Clean ones queue for payment." },
    { icon: <Ban className="w-4 h-4" />, title: "Duplicate detection", body: "Catches re-sent invoices before they reach your payment run." },
    { icon: <Sparkles className="w-4 h-4" />, title: "Discrepancy flagging", body: "Drafts a vendor email explaining the variance, and holds payment until you confirm." },
    { icon: <CreditCard className="w-4 h-4" />, title: "Payment batch prep", body: "Builds today's batch, routes to you, pushes to your accounting system on approval." },
  ];
  const periodic = [
    { icon: <Clock className="w-4 h-4" />, title: "AP aging reports", body: "Refreshed every hour. Auto-reminders go out past 30, 60, and 90 days." },
    { icon: <FileSpreadsheet className="w-4 h-4" />, title: "Vendor statement reconciliation", body: "Matches vendor statements line-by-line to your books. Variance gets a reply." },
    { icon: <ReceiptText className="w-4 h-4" />, title: "W-9 collection and 1099 prep", body: "Tracks thresholds per vendor. Chases missing W-9s. Builds the January packet." },
    { icon: <Receipt className="w-4 h-4" />, title: "Expense report processing", body: "Reads employee receipts, validates policy, codes and queues for reimbursement." },
    { icon: <CreditCard className="w-4 h-4" />, title: "Credit card reconciliation", body: "Matches Chase Ink charges to receipts. Chases cardholders for what's missing." },
    { icon: <CalendarCheck className="w-4 h-4" />, title: "Month-end close support", body: "Accrual suggestions, checklist progress, ready for final sign-off." },
    { icon: <MailCheck className="w-4 h-4" />, title: "Vendor communication", body: "Every email sent on your behalf. Timestamped, categorized, fully auditable." },
    { icon: <Users className="w-4 h-4" />, title: "Vendor record maintenance", body: "Terms, GL hints, W-9 status, YTD spend. Updated as invoices flow through." },
  ];

  return (
    <section id="features" className="px-6 py-24">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">What it handles</div>
          <h2 className="mt-1 text-[40px] leading-[1.1] font-semibold tracking-tight">
            Everything a great AP clerk does.
            <br />
            Running quietly in the background.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-muted">
            Plugs into whatever you already use for books, whether that&apos;s QuickBooks, Excel, Sage, NetSuite, or Xero. Matches your chart of accounts, your vendors, your approval chain. Shows its work and asks before it pays anything.
          </p>
        </div>

        <div className="mt-14">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-brand mb-4">Daily, while you sleep</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {daily.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-accent mb-4">Every week, month, and year</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {periodic.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="w-9 h-9 rounded-md bg-surface border border-border grid place-items-center text-foreground">
        {icon}
      </div>
      <div className="mt-3 text-[15px] font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-[13.5px] text-muted leading-[1.55]">{body}</div>
    </div>
  );
}

// -------- How it works --------

function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 bg-surface border-y border-border">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">How it works</div>
          <h2 className="mt-1 text-[40px] leading-[1.1] font-semibold tracking-tight">
            Three steps. No data entry.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Step
            num="01"
            title="We learn your process"
            body="First two weeks, we study your vendors, GL codes, approval chains, and workflow. No generic setup. Your agent gets opinionated about your business."
          />
          <Step
            num="02"
            title="Your assistant starts processing"
            body="Invoices arrive by email. PayablePilot extracts, matches, codes, and prepares everything. You get a morning digest with what&apos;s ready for your approval."
          />
          <Step
            num="03"
            title="You review and approve"
            body="Every payment batch comes to you for approval. One click, pushed to your accounting system. Full visibility, full control, zero data entry."
          />
        </div>
      </div>
    </section>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <div className="text-[11px] font-mono text-muted">{num}</div>
      <div className="mt-2 text-[20px] font-semibold tracking-tight">{title}</div>
      <div className="mt-3 text-[14px] text-muted leading-[1.6]">{body}</div>
    </div>
  );
}

// -------- The math --------

function TheMath() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">The math</div>
          <h2 className="mt-1 text-[40px] leading-[1.1] font-semibold tracking-tight">
            Get your week back.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-muted">
            A typical office manager spends 10 to 15 hours a week on AP work that could be running in the background. Invoice entry, PO matching, chasing receipts, tracking W-9s, reconciling statements. PayablePilot handles all of it inside whatever books your team already uses, so they spend their time on work that actually moves the business.
          </p>
          <ul className="mt-6 space-y-2 text-[14px]">
            <Bullet text="Setup in one week. No new software to learn." />
            <Bullet text="Cancel any time." />
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-background p-8">
          <div className="text-xs uppercase tracking-wider text-muted">What a typical week looks like</div>
          <div className="mt-5 space-y-4">
            <Row label="Invoices processed" value="80 - 120" />
            <Row label="Three-way matches" value="70 - 90" />
            <Row label="Discrepancies caught" value="3 - 6" />
            <Row label="Duplicates blocked" value="1 - 2" />
            <Row label="Vendor emails sent on your behalf" value="15 - 25" />
            <Row label="Hours of your team's time saved" value="10 - 15" emphasis />
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-5 h-5 rounded-full bg-brand-soft text-brand grid place-items-center shrink-0 mt-[2px]">
        <Check className="w-3 h-3" />
      </span>
      <span className="text-foreground">{text}</span>
    </li>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-border last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={emphasis ? "text-[22px] font-semibold tracking-tight text-foreground" : "text-[15px] font-medium"}>{value}</span>
    </div>
  );
}

// -------- Interactive tour --------

function InteractiveTour() {
  const [open, setOpen] = useState(false);
  return (
    <section id="tour" className="px-6 py-24 bg-surface border-y border-border">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Interactive tour</div>
          <h2 className="mt-1 text-[40px] leading-[1.1] font-semibold tracking-tight">
            Click through a full day at Greenfield PM.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-muted">
            Nine scenes, from invoice arriving to discrepancy caught to monthly reconciliations to a chat with the agent. Open the tour and step through at your own pace.
          </p>
        </div>

        <TourPreviewCard onOpen={() => setOpen(true)} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-muted flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            The same UI our first customer will use.
          </div>
          <div className="flex gap-2">
            <Link
              href="/tour"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border bg-background hover:bg-surface"
            >
              Open tour full-screen
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90"
            >
              Drive the live product
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {open && <TourModal onClose={() => setOpen(false)} />}
    </section>
  );
}

function TourPreviewCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group mt-10 block w-full text-left rounded-2xl overflow-hidden border border-border bg-background shadow-[0_30px_80px_-40px_rgba(27,42,74,0.25)] hover:shadow-[0_40px_100px_-40px_rgba(27,42,74,0.35)] transition-shadow"
      aria-label="Launch interactive tour"
    >
      <div className="relative aspect-[16/9] bg-surface overflow-hidden">
        {/* Faux app chrome */}
        <div className="absolute inset-x-0 top-0 h-12 bg-background border-b border-border flex items-center gap-3 px-5 text-[13px]">
          <div className="w-7 h-7 rounded-md bg-foreground text-background grid place-items-center">
            <PilotMark className="w-3.5 h-3.5" />
          </div>
          <div className="font-semibold tracking-tight">PayablePilot</div>
          <div className="text-muted">· Greenfield PM · AP assistant</div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Connected to QuickBooks
          </div>
          <div className="w-7 h-7 rounded-full bg-surface border border-border grid place-items-center text-[10.5px] font-medium">
            EB
          </div>
        </div>

        {/* Main content preview */}
        <div className="absolute inset-x-0 top-12 bottom-0 p-6 overflow-hidden">
          <div className="text-[11px] uppercase tracking-wider text-muted">Daily digest</div>
          <div className="mt-0.5 text-[22px] font-semibold tracking-tight text-foreground">Good morning, Erin.</div>
          <div className="mt-0.5 text-[12px] text-muted">
            PayablePilot worked overnight. Here&apos;s what needs your attention.
          </div>

          <div className="grid grid-cols-5 gap-3 mt-4">
            <MiniStat label="Processed" value="11" />
            <MiniStat label="Matched" value="10" tone="brand" />
            <MiniStat label="Discrepancies" value="1" tone="accent" />
            <MiniStat label="Duplicates blocked" value="1" />
            <MiniStat label="Paid today" value="5" tone="brand" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="col-span-2 rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] font-medium text-foreground">By vendor</div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                <MiniRow vendor="Summit Plumbing" count="3" amount="$1,247" status="matched" />
                <MiniRow vendor="Reliable Landscaping" count="2" amount="$2,500" status="flagged" />
                <MiniRow vendor="Metro Electric" count="2" amount="$4,180" status="matched" />
                <MiniRow vendor="Allied Insurance" count="1" amount="$18,650" status="matched" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] font-medium text-foreground">Agent activity</div>
              <div className="mt-2 space-y-1.5 text-[10.5px]">
                <MiniActivity when="2:14 AM" text="Captured 4 invoices" />
                <MiniActivity when="2:15 AM" text="Matched Summit SP-4821" tone="brand" />
                <MiniActivity when="2:19 AM" text="Flagged Reliable RL-2210" tone="accent" />
                <MiniActivity when="4:02 AM" text="Posted 10 invoices to GL" />
              </div>
            </div>
          </div>
        </div>

        {/* Hover dim + play overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-foreground text-background shadow-[0_20px_60px_-20px_rgba(27,42,74,0.5)] group-hover:scale-[1.03] transition-transform">
            <span className="w-9 h-9 rounded-full bg-brand grid place-items-center">
              <Play className="w-4 h-4 text-white translate-x-[1px]" />
            </span>
            <span className="text-[14px] font-medium pr-1">Launch interactive tour</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "brand" | "accent" }) {
  const ring =
    tone === "brand"
      ? "ring-[color:var(--brand)]/25"
      : tone === "accent"
      ? "ring-[color:var(--accent)]/30"
      : "ring-transparent";
  return (
    <div className={`rounded-md border border-border bg-background p-2 ring-1 ${ring}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-[18px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MiniRow({
  vendor,
  count,
  amount,
  status,
}: {
  vendor: string;
  count: string;
  amount: string;
  status: "matched" | "flagged";
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 truncate">{vendor}</span>
      <span className="text-muted">{count}</span>
      <span className="font-mono">{amount}</span>
      {status === "matched" ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-soft text-[#1f2937]">Matched</span>
      ) : (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-soft text-[#1f2937]">Flagged</span>
      )}
    </div>
  );
}

function MiniActivity({ when, text, tone }: { when: string; text: string; tone?: "brand" | "accent" }) {
  const dot = tone === "accent" ? "bg-accent" : tone === "brand" ? "bg-brand" : "bg-muted";
  return (
    <div className="flex gap-2">
      <span className="font-mono text-muted w-12 shrink-0">{when}</span>
      <span className="flex-1 truncate">
        <span className={`inline-block mr-1.5 align-middle w-1 h-1 rounded-full ${dot}`} />
        {text}
      </span>
    </div>
  );
}

function TourModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-[2px] grid place-items-center p-4 animate-fade-in-up" onClick={onClose}>
      <div
        className="relative w-full h-full max-w-[1400px] max-h-[92vh] bg-surface rounded-2xl overflow-hidden border border-border shadow-[0_40px_120px_rgba(27,42,74,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[70] w-9 h-9 rounded-full bg-background text-muted hover:text-foreground hover:bg-surface border border-border grid place-items-center shadow-[0_4px_12px_rgba(27,42,74,0.15)]"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-full h-full overflow-auto scrollbar-thin">
          <div className="min-w-[1280px] h-full">
            <DemoOrchestrator embedded />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- Trust / safety --------

function TrustSafe() {
  return (
    <section id="safety" className="px-6 py-24">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Your money is safe</div>
          <h2 className="mt-1 text-[40px] leading-[1.1] font-semibold tracking-tight">
            You approve every payment.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <TrustCard
            icon={<Lock className="w-4 h-4" />}
            title="Never touches your bank"
            body="PayablePilot prepares batches inside your own books. Actual payment execution stays in your hands."
          />
          <TrustCard
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Every payment gets your approval"
            body="Nothing leaves your business without an explicit click. Matched or not, we ask."
          />
          <TrustCard
            icon={<FileText className="w-4 h-4" />}
            title="Full audit trail"
            body="Every extraction, every match decision, every email sent on your behalf, logged and searchable."
          />
        </div>
        <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-[14px] text-muted">
          <span className="font-medium text-foreground">30-day money-back guarantee.</span>{" "}
          If PayablePilot doesn&apos;t accurately process 80% of your invoices in the first month, we refund the full setup fee.
        </div>
      </div>
    </section>
  );
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="w-9 h-9 rounded-md bg-brand-soft text-brand grid place-items-center">{icon}</div>
      <div className="mt-3 text-[15px] font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-[13.5px] text-muted leading-[1.55]">{body}</div>
    </div>
  );
}

// -------- Final CTA --------

function FinalCta() {
  return (
    <section id="cta" className="px-6 py-24 bg-foreground text-background">
      <div className="max-w-[920px] mx-auto text-center">
        <h2 className="text-[44px] leading-[1.1] font-semibold tracking-tight">
          Get AP under control this week.
        </h2>
        <p className="mt-4 text-[16px] text-background/75 max-w-[620px] mx-auto">
          Book a 15-minute walkthrough. We&apos;ll look at your real AP inbox, show you what PayablePilot would handle, and tell you honestly what it wouldn&apos;t.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://calendly.com/mofekayode/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-brand text-white text-sm font-medium hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]"
          >
            <Calendar className="w-4 h-4" />
            Book a 15-minute walkthrough
          </a>
          <span className="text-[14px] text-background/70">or email us at hello@payablepilot.com</span>
        </div>
      </div>
    </section>
  );
}

// -------- Footer --------

function Footer() {
  return (
    <footer className="px-6 py-10 bg-background border-t border-border">
      <div className="max-w-[1180px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-foreground text-background grid place-items-center">
            <PilotMark className="w-3 h-3" />
          </div>
          <span className="font-semibold text-foreground">PayablePilot</span>
          <span>© 2026</span>
        </div>
        <div className="flex items-center gap-5">
          <a className="hover:text-foreground" href="#">Privacy</a>
          <a className="hover:text-foreground" href="#">Terms</a>
          <a className="hover:text-foreground" href="#">Security</a>
          <Link href="/tour" className="hover:text-foreground">Tour</Link>
          <Link href="/app" className="hover:text-foreground">Live product</Link>
        </div>
      </div>
    </footer>
  );
}
