"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  FileText,
  ShieldCheck,
  Check,
  Sparkles,
  BadgeCheck,
  Lock,
  X,
  Building2,
} from "lucide-react";
import { PilotMark } from "./pilot-mark";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <HowItWorks />
      <InteractiveDemo />
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
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#demo" className="hover:text-foreground">Demo</a>
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
              href="#demo"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface"
            >
              <PlayCircle className="w-4 h-4" />
              Launch interactive demo
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

const HOW_STEPS = [
  {
    id: "arrives",
    eyebrow: "Step 1",
    title: "Invoice arrives in the connected inbox.",
    body: "Connect your AP Gmail. PayablePilot watches for invoice attachments — PDFs, scans, receipts — and picks them up the moment they land.",
  },
  {
    id: "extracted",
    eyebrow: "Step 2",
    title: "Every field is extracted and matched.",
    body: "Vendor, invoice number, amount, line items, project ref. Matched against the vendors and chart of accounts already in QuickBooks. Confidence shown per field.",
  },
  {
    id: "posted",
    eyebrow: "Step 3",
    title: "One click and it's posted.",
    body: "Review what we extracted, then post the bill to QuickBooks. Every action is logged to the audit trail. You always have the final say.",
  },
];

const HOW_INTERVAL_MS = 6000;

function HowItWorks() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HOW_STEPS.length;
  const current = HOW_STEPS[step];

  // Auto-cycle through steps; pause on hover/focus or when the user takes
  // manual control (clicking prev/next/dots resets the timer via paused).
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setStep((s) => (s + 1) % total);
    }, HOW_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [step, paused, total]);

  const goto = (n: number) => {
    setStep(((n % total) + total) % total);
  };
  const next = () => goto(step + 1);
  const prev = () => goto(step - 1);

  return (
    <section
      id="how"
      className="px-6 py-20 bg-surface border-y border-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-muted">How it works</div>
          <h2 className="mt-1 text-[36px] sm:text-[40px] leading-[1.1] font-semibold tracking-tight">
            From inbox to QuickBooks, in three steps.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="text-[11.5px] uppercase tracking-[0.18em] font-semibold text-brand">
              {current.eyebrow}
            </div>
            <h3 className="mt-2 text-[26px] sm:text-[28px] leading-[1.15] font-semibold tracking-tight">
              {current.title}
            </h3>
            <p className="mt-3 text-[15px] leading-[1.65] text-muted">{current.body}</p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => {
                  setPaused(true);
                  prev();
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background text-foreground hover:bg-background"
                aria-label="Previous step"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPaused(true);
                  next();
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-foreground text-background hover:opacity-90"
                aria-label="Next step"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 ml-2">
                {HOW_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPaused(true);
                      goto(i);
                    }}
                    className={
                      "h-1.5 rounded-full transition-all " +
                      (i === step ? "w-8 bg-foreground" : "w-3 bg-border hover:bg-muted")
                    }
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
              <span className="text-[12px] text-muted ml-1 tabular-nums">
                {step + 1} / {total}
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <TourScene step={step} />
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- Interactive demo --------

const DEMO_SCENES = [
  { id: "welcome", title: "Welcome" },
  { id: "connect", title: "Connect your books" },
  { id: "arrives", title: "Invoice arrives" },
  { id: "extracted", title: "Extracted & matched" },
  { id: "posted", title: "Posted to QuickBooks" },
  { id: "switch", title: "Manage many businesses" },
  { id: "outro", title: "You're ready" },
];

function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  return (
    <section id="demo" className="px-6 py-20 bg-background">
      <div className="max-w-[1180px] mx-auto text-center">
        <div className="text-xs uppercase tracking-wider text-muted">Interactive demo</div>
        <h2 className="mt-1 text-[36px] sm:text-[40px] leading-[1.1] font-semibold tracking-tight">
          Drive the product yourself.
        </h2>
        <p className="mt-3 text-[16px] leading-[1.65] text-muted max-w-[560px] mx-auto">
          Step through a real session at your own pace — connect, capture, extract, post. No signup, no setup,
          no scripted demo guide.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-7 inline-flex items-center gap-2 h-11 px-6 rounded-md bg-brand text-white text-sm font-medium hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]"
        >
          <PlayCircle className="w-4 h-4" />
          Launch interactive demo
        </button>
      </div>
      {open && <DemoModal onClose={() => setOpen(false)} />}
    </section>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const total = DEMO_SCENES.length;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const goto = (n: number) => {
    const next = ((n % total) + total) % total;
    setStep(next);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const nextStep = () => goto(step + 1);
  const prevStep = () => goto(step - 1);

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") nextStep();
      else if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const scene = DEMO_SCENES[step];

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-[3px] grid place-items-center p-4 animate-fade-in-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Interactive product demo"
    >
      <div
        className="relative w-full max-w-[1080px] bg-background rounded-2xl overflow-hidden border border-border shadow-[0_40px_120px_rgba(27,42,74,0.45)] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-border bg-surface flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-foreground text-background grid place-items-center">
            <PilotMark className="w-3.5 h-3.5" />
          </div>
          <div className="text-[13.5px] font-semibold tracking-tight">PayablePilot</div>
          <span className="text-muted text-[12px]">·</span>
          <span className="text-[12.5px] text-muted truncate">{scene.title}</span>
          <span className="ml-auto text-[11.5px] text-muted tabular-nums">
            {step + 1} / {total}
          </span>
          <button
            onClick={onClose}
            className="ml-1 w-8 h-8 rounded-md border border-border bg-background text-muted hover:text-foreground hover:bg-surface grid place-items-center"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-thin bg-surface">
          <div className="p-6 md:p-8 min-h-[440px] flex items-stretch">
            <div className="flex-1 animate-fade-in-up" key={scene.id}>
              {scene.id === "welcome" && <DemoWelcome />}
              {scene.id === "connect" && <DemoConnect />}
              {scene.id === "arrives" && <DemoFrame><SceneArrives /></DemoFrame>}
              {scene.id === "extracted" && <DemoFrame><SceneExtracted /></DemoFrame>}
              {scene.id === "posted" && <DemoFrame><ScenePosted /></DemoFrame>}
              {scene.id === "switch" && <DemoSwitch />}
              {scene.id === "outro" && <DemoOutro onClose={onClose} />}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-background flex items-center gap-3">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background text-foreground disabled:opacity-30 hover:bg-surface"
            aria-label="Previous"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {DEMO_SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goto(i)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === step ? "w-6 bg-foreground" : "w-3 bg-border hover:bg-muted")
                }
                aria-label={`Go to scene ${i + 1}: ${s.title}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted hidden sm:inline ml-1">
            ← / → to navigate · esc to close
          </span>
          <button
            onClick={nextStep}
            disabled={step === total - 1}
            className="ml-auto inline-flex items-center gap-2 h-9 px-4 rounded-md bg-foreground text-background disabled:opacity-30 hover:opacity-90 text-[13px] font-medium"
          >
            {step === total - 1 ? "Done" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden shadow-[0_30px_80px_-40px_rgba(27,42,74,0.35)]">
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
      <div className="p-5">{children}</div>
    </div>
  );
}

function DemoWelcome() {
  return (
    <div className="max-w-[640px] mx-auto text-center pt-8">
      <div className="text-[12px] uppercase tracking-[0.18em] text-brand font-semibold">A 60-second tour</div>
      <h3 className="mt-2 text-[34px] sm:text-[38px] leading-[1.1] font-semibold tracking-tight">
        Watch one invoice go from inbox to QuickBooks.
      </h3>
      <p className="mt-4 text-[15.5px] leading-[1.65] text-muted">
        You'll click through six quick scenes: connecting a workspace, an invoice landing, fields extracted,
        the bill posted, switching between businesses, and what's next. Use → and ← or the buttons below.
      </p>
      <div className="mt-8 inline-flex items-center gap-2 text-[13px] text-muted">
        <Sparkles className="w-4 h-4 text-brand" />
        Press → or click Next to start.
      </div>
    </div>
  );
}

function DemoConnect() {
  return (
    <DemoFrame>
      <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold">Onboarding · Step 2 of 2</div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight">Connect Acme HVAC</div>
      <p className="mt-1 text-[13px] text-muted">
        Two integrations. Three minutes. Then we start reading invoices.
      </p>
      <div className="mt-4 space-y-3">
        <ConnectRow
          icon={<Mail className="w-5 h-5 text-rose-600" />}
          label="Gmail"
          description="Read invoice emails from this client's AP mailbox."
          status="connected"
        />
        <ConnectRow
          icon={<FileText className="w-5 h-5 text-emerald-600" />}
          label="QuickBooks Online"
          description="Post matched bills, sync vendors and projects."
          status="connecting"
        />
      </div>
    </DemoFrame>
  );
}

function ConnectRow({
  icon,
  label,
  description,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  status: "idle" | "connecting" | "connected";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-background border border-border grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[12px] text-muted">{description}</div>
      </div>
      {status === "connected" && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3" />
          Connected
        </span>
      )}
      {status === "connecting" && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand">
          <Sparkles className="w-3 h-3" />
          Connecting…
        </span>
      )}
      {status === "idle" && (
        <span className="inline-flex items-center h-7 px-3 rounded-md bg-foreground text-background text-[12px] font-medium">
          Connect
        </span>
      )}
    </div>
  );
}

function DemoSwitch() {
  return (
    <DemoFrame>
      <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold">Workspace switcher</div>
      <div className="mt-1 text-[18px] font-semibold tracking-tight">Switch between every business you manage.</div>
      <p className="mt-1 text-[13px] text-muted">
        Each workspace is fully isolated. Connections, invoices, vendors, audit log — all scoped per business.
      </p>
      <div className="mt-4 rounded-lg border border-border bg-surface p-2 max-w-[420px]">
        <div className="px-2 py-1 text-[10.5px] uppercase tracking-wider text-muted font-semibold">
          Your businesses
        </div>
        <div className="space-y-0.5">
          <SwitchRow name="Acme HVAC" hint="3 invoices waiting" active />
          <SwitchRow name="Cedar Lumber Co" hint="all caught up" />
          <SwitchRow name="Reliable Landscaping" hint="1 needs review" />
          <SwitchRow name="Bob's Plumbing" hint="all caught up" />
        </div>
        <div className="border-t border-border mt-1 pt-1">
          <div className="px-2 py-1.5 text-[12px] text-muted hover:text-foreground hover:bg-background rounded-md cursor-default">
            + Add a business
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

function SwitchRow({ name, hint, active }: { name: string; hint: string; active?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] " +
        (active ? "bg-background border border-border" : "hover:bg-background")
      }
    >
      <span className="w-6 h-6 rounded-md bg-background border border-border grid place-items-center shrink-0">
        <Building2 className="w-3.5 h-3.5 text-muted" />
      </span>
      <span className="flex-1 font-medium text-foreground truncate">{name}</span>
      <span className="text-[11.5px] text-muted truncate">{hint}</span>
      {active && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
    </div>
  );
}

function DemoOutro({ onClose }: { onClose: () => void }) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <div className="max-w-[640px] mx-auto text-center pt-6">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-700 grid place-items-center">
        <Check className="w-7 h-7" />
      </div>
      <h3 className="mt-5 text-[30px] sm:text-[34px] leading-[1.1] font-semibold tracking-tight">
        That's the whole loop.
      </h3>
      <p className="mt-3 text-[15px] leading-[1.65] text-muted">
        Connect your books once, then PayablePilot handles capture, extraction, matching, and posting on every
        invoice that comes in. Try it on your real inbox — free.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a
          href={`${appBase}/sign-up`}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
        >
          Get started free
          <ArrowRight className="w-4 h-4" />
        </a>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-md border border-border bg-background text-sm font-medium hover:bg-surface"
        >
          Close demo
        </button>
      </div>
    </div>
  );
}

function TourScene({ step }: { step: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_30px_80px_-40px_rgba(27,42,74,0.35)]">
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
      <div className="p-5 min-h-[360px]">
        {step === 0 && <SceneArrives />}
        {step === 1 && <SceneExtracted />}
        {step === 2 && <ScenePosted />}
      </div>
    </div>
  );
}

function SceneArrives() {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Mail className="w-4 h-4" />
        <span className="font-medium text-foreground">Inbox</span>
        <span>·</span>
        <span>ap@greenfieldpm.co</span>
      </div>

      <div className="mt-3 rounded-lg border border-brand/30 bg-brand-soft/40 p-3 flex items-start gap-3 animate-fade-in-up">
        <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 grid place-items-center shrink-0">
          <Mail className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="font-medium text-foreground truncate">Summit Plumbing</span>
            <span className="text-muted">·</span>
            <span className="text-muted truncate">billing@summitplumb.co</span>
            <span className="ml-auto text-muted shrink-0">just now</span>
          </div>
          <div className="mt-0.5 text-[13.5px] font-medium text-foreground">
            Invoice SP-4821 · $4,820.00
          </div>
          <div className="mt-1 text-[12px] text-muted">
            1 attachment · invoice-SP-4821.pdf
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-brand text-white">
            <Sparkles className="w-3 h-3" />
            New — picked up by PayablePilot
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 opacity-60">
        <InboxRow vendor="Cedar Lumber Co" subject="Invoice CL-9912 · $1,240.00" when="2h ago" />
        <InboxRow vendor="Reliable Landscaping" subject="Invoice RL-2210 · $890.00" when="yesterday" />
      </div>
    </div>
  );
}

function InboxRow({ vendor, subject, when }: { vendor: string; subject: string; when: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5 flex items-center gap-3">
      <div className="w-7 h-7 rounded-md bg-neutral-100 grid place-items-center shrink-0">
        <Mail className="w-3.5 h-3.5 text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-foreground truncate">{vendor}</div>
        <div className="text-[12px] text-muted truncate">{subject}</div>
      </div>
      <div className="text-[11px] text-muted shrink-0">{when}</div>
    </div>
  );
}

function SceneExtracted() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 animate-fade-in-up">
      <div className="rounded-md border border-border bg-surface p-3 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-14 rounded bg-background border border-border grid place-items-center text-muted">
          <FileText className="w-5 h-5" />
        </div>
        <div className="mt-2 text-[11px] font-medium text-foreground">invoice-SP-4821.pdf</div>
        <div className="text-[10.5px] text-muted">144 KB</div>
      </div>
      <div>
        <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-brand" />
          Extracted &amp; matched
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
          <ExtractedField label="Vendor" value="Summit Plumbing" matched />
          <ExtractedField label="Invoice #" value="SP-4821" />
          <ExtractedField label="Amount" value="$4,820.00" />
          <ExtractedField label="Due date" value="Apr 28, 2026" />
          <ExtractedField label="Project" value="Cedar Ave · Phase 2" matched />
          <ExtractedField label="GL account" value="6020 · Plumbing" matched />
        </div>
        <div className="mt-3 rounded-md border border-border bg-surface p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold mb-1.5">
            Line items
          </div>
          <div className="space-y-1 text-[11.5px]">
            <LineItem label="Labor — 18 hours" amount="$2,520.00" />
            <LineItem label="Parts — water heater install" amount="$1,890.00" />
            <LineItem label="Permit fee" amount="$410.00" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItem({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-foreground truncate">{label}</span>
      <span className="text-muted tabular-nums shrink-0">{amount}</span>
    </div>
  );
}

function ScenePosted() {
  return (
    <div className="animate-fade-in-up">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
          <Check className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-emerald-900">
            Bill posted to QuickBooks
          </div>
          <div className="mt-0.5 text-[12.5px] text-emerald-800">
            Summit Plumbing · $4,820.00 · Cedar Ave · Phase 2
          </div>
          <div className="mt-1.5 text-[11.5px] text-emerald-700 font-mono">
            QBO Bill ID: 1024 · Reference: SP-4821
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          Audit trail
        </div>
        <div className="mt-2 rounded-md border border-border bg-surface divide-y divide-border">
          <AuditRow when="9:14 AM" actor="PayablePilot" action="Picked up invoice from ap@greenfieldpm.co" />
          <AuditRow when="9:14 AM" actor="PayablePilot" action="Extracted fields with Claude · 0.97 confidence" />
          <AuditRow when="9:14 AM" actor="PayablePilot" action="Matched vendor: Summit Plumbing → QBO 84" />
          <AuditRow when="9:15 AM" actor="Erin B." action="Approved bill" />
          <AuditRow when="9:15 AM" actor="PayablePilot" action="Posted bill to QuickBooks · ID 1024" />
        </div>
      </div>
    </div>
  );
}

function AuditRow({ when, actor, action }: { when: string; actor: string; action: string }) {
  return (
    <div className="px-3 py-2 flex items-start gap-3 text-[12px]">
      <span className="font-mono text-muted w-16 shrink-0">{when}</span>
      <span className="font-medium text-foreground w-28 shrink-0 truncate">{actor}</span>
      <span className="text-muted truncate">{action}</span>
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
