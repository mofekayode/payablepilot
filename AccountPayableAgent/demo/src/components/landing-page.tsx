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
      <InteractiveTour />
      <HowItWorks />
      <TrustSafe />
      <FinalCta />
      <Footer />
    </div>
  );
}

// -------- Top nav --------

function TopNav() {
  // App lives on a separate subdomain in prod (app.payablepilot.com). In dev
  // the env var is unset and we fall back to relative paths on the same host.
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const signInHref = `${appBase}/sign-in`;
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
          <a href="#tour" className="hover:text-foreground">Tour</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#safety" className="hover:text-foreground">Safety</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={signInHref}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium text-foreground hover:bg-surface"
          >
            Sign in
          </a>
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
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <section className="pt-14 pb-20 px-6">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        <div className="lg:col-span-7">
          <h1 className="text-[44px] sm:text-[52px] lg:text-[58px] leading-[1.05] font-semibold tracking-tight">
            Stop typing invoices
            <br />
            into QuickBooks.
          </h1>
          <p className="mt-5 text-[17px] leading-[1.6] text-muted max-w-[560px]">
            PayablePilot reads every invoice that lands in your inbox, extracts the fields, and queues the bill
            for your approval. One click to post. Connect as many sets of books as you need.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={`${appBase}/sign-up`}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#tour"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface"
            >
              <PlayCircle className="w-4 h-4" />
              See the interactive tour
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-brand" />
              Posts to QuickBooks Online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand" />
              You approve every bill
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand" />
              Free for one workspace
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      {/* Soft backdrop glow */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-brand/15 via-transparent to-transparent rounded-[32px] blur-2xl" />

      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_30px_80px_-40px_rgba(27,42,74,0.35)]">
        {/* Window chrome */}
        <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-2 text-[11px] text-muted">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
            <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
            <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
          </span>
          <span className="font-mono ml-1">app.payablepilot.com</span>
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>

        {/* Inbox row */}
        <div className="px-5 py-4 border-b border-border bg-background">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 grid place-items-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-medium text-foreground truncate">Summit Plumbing</span>
                <span className="text-muted">·</span>
                <span className="text-muted truncate">billing@summitplumb.co</span>
                <span className="ml-auto text-muted shrink-0">9:14 AM</span>
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-foreground">
                Invoice SP-4821 · $4,820.00 due
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                <Sparkles className="w-3 h-3" />
                Extracting fields…
              </div>
            </div>
          </div>
        </div>

        {/* Extracted card */}
        <div className="px-5 py-4 bg-surface border-b border-border">
          <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold">
            Extracted &amp; matched
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
            <ExtractedField label="Vendor" value="Summit Plumbing" matched />
            <ExtractedField label="Invoice #" value="SP-4821" />
            <ExtractedField label="Amount" value="$4,820.00" />
            <ExtractedField label="Project" value="Cedar Ave · Phase 2" matched />
            <ExtractedField label="Due date" value="Apr 28, 2026" />
            <ExtractedField label="GL account" value="6020 · Plumbing" matched />
          </div>
        </div>

        {/* Post action */}
        <div className="px-5 py-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11.5px] font-medium">
            <Check className="w-3 h-3" />
            Ready to post
          </span>
          <span className="text-[11.5px] text-muted">No discrepancies.</span>
          <span className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-[12px] font-medium">
            Post to QuickBooks
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function ExtractedField({
  label,
  value,
  matched,
}: {
  label: string;
  value: string;
  matched?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-foreground font-medium truncate">
        {value}
        {matched && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
      </div>
    </div>
  );
}

// -------- How it works --------

function HowItWorks() {
  return (
    <section id="how" className="px-6 py-20 bg-background">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">How it works</div>
          <h2 className="mt-1 text-[36px] sm:text-[40px] leading-[1.1] font-semibold tracking-tight">
            Three steps. No data entry.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <Step
            num="01"
            title="Connect your books"
            body="Five-minute setup. Connect Gmail and QuickBooks. Add more workspaces any time — each one is fully isolated."
          />
          <Step
            num="02"
            title="We read every invoice"
            body="As invoices arrive, fields are extracted — vendor, amount, line items, project — and matched against your existing QuickBooks vendors automatically."
          />
          <Step
            num="03"
            title="You approve and post"
            body="Bills queue in your inbox. One click pushes them to QuickBooks. Posting only happens with your explicit approval."
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

// -------- Interactive tour --------

function InteractiveTour() {
  const [open, setOpen] = useState(false);
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <section id="tour" className="px-6 py-20 bg-surface border-y border-border">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Interactive tour</div>
          <h2 className="mt-1 text-[36px] sm:text-[40px] leading-[1.1] font-semibold tracking-tight">
            See a full day, in two minutes.
          </h2>
          <p className="mt-3 text-[16px] leading-[1.6] text-muted">
            Click through a real session: invoices arriving, fields extracted, bills queued, posted to
            QuickBooks. No signup needed.
          </p>
        </div>

        <TourPreviewCard onOpen={() => setOpen(true)} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-muted flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            The same UI you'll use after sign-up.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border bg-background hover:bg-surface"
            >
              Open tour
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`${appBase}/sign-up`}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </a>
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
    <section id="safety" className="px-6 py-20 bg-surface border-y border-border">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">Built for the books</div>
          <h2 className="mt-1 text-[36px] sm:text-[40px] leading-[1.1] font-semibold tracking-tight">
            You approve every bill before it posts.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <TrustCard
            icon={<Lock className="w-4 h-4" />}
            title="Never touches the bank"
            body="PayablePilot prepares bills inside QuickBooks. Payment execution stays in your hands."
          />
          <TrustCard
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Isolated workspaces"
            body="Each set of books is a separate workspace, scoped at the database level. No cross-talk between them."
          />
          <TrustCard
            icon={<FileText className="w-4 h-4" />}
            title="Full audit trail"
            body="Every connection, extraction, and post is logged. Indispensable for accountants and diligence."
          />
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
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <section id="cta" className="px-6 py-20 bg-foreground text-background">
      <div className="max-w-[920px] mx-auto text-center">
        <h2 className="text-[44px] leading-[1.1] font-semibold tracking-tight">
          Onboard your first client this week.
        </h2>
        <p className="mt-4 text-[16px] text-background/75 max-w-[620px] mx-auto">
          Five-minute setup per client. Connect Gmail and QuickBooks, and PayablePilot starts reading
          invoices immediately. Try it free with one client — no credit card.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`${appBase}/sign-up`}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-brand text-white text-sm font-medium hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]"
          >
            Get started
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://calendly.com/mofekayode/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-md border border-background/30 text-background text-sm font-medium hover:bg-background/10"
          >
            <Calendar className="w-4 h-4" />
            Book a walkthrough instead
          </a>
        </div>
        <div className="mt-6 text-[13px] text-background/60">
          Questions? Email <a href="mailto:hello@payablepilot.com" className="underline hover:text-background">hello@payablepilot.com</a>.
        </div>
      </div>
    </section>
  );
}

// -------- Footer --------

function Footer() {
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <footer className="px-6 py-10 bg-background border-t border-border">
      <div className="max-w-[1180px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-foreground text-background grid place-items-center">
            <PilotMark className="w-3 h-3" />
          </div>
          <span className="font-semibold text-foreground">PayablePilot</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <a href={`${appBase}/sign-in`} className="hover:text-foreground">Sign in</a>
          <a href="mailto:hello@payablepilot.com" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}
