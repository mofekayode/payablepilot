"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Loader2,
  Play,
  ArrowLeft,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { PilotMark } from "@/components/pilot-mark";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  detail?: string;
  status: "pending" | "running" | "ok" | "fail";
  error?: string;
  millis?: number;
  result?: unknown;
};

type Probe = {
  label: string;
  ok: boolean;
  detail: string;
  loading?: boolean;
};

export function DiagnosticsClient() {
  const [probes, setProbes] = useState<Record<string, Probe>>({
    gmail: { label: "Gmail · messages list", ok: false, detail: "checking…", loading: true },
    qboVendors: { label: "QuickBooks · vendors", ok: false, detail: "checking…", loading: true },
    qboProjects: { label: "QuickBooks · projects", ok: false, detail: "checking…", loading: true },
    qboAccounts: { label: "QuickBooks · expense accounts", ok: false, detail: "checking…", loading: true },
    anthropic: { label: "Claude · API key configured", ok: false, detail: "(verified server-side at run time)" },
  });

  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [postedBillId, setPostedBillId] = useState<string | null>(null);

  // On mount, probe each integration so we know up-front what's connected.
  useEffect(() => {
    let cancelled = false;
    async function probe(key: string, url: string, summarize: (data: unknown) => string) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        const data = res.ok ? await res.json() : await res.json().catch(() => ({}));
        if (!res.ok) {
          setProbes((p) => ({
            ...p,
            [key]: {
              label: p[key].label,
              ok: false,
              detail: (data as { error?: string })?.error ?? `HTTP ${res.status}`,
            },
          }));
          return;
        }
        setProbes((p) => ({ ...p, [key]: { label: p[key].label, ok: true, detail: summarize(data) } }));
      } catch (e) {
        if (cancelled) return;
        setProbes((p) => ({ ...p, [key]: { label: p[key].label, ok: false, detail: (e as Error).message } }));
      }
    }
    probe("gmail", "/api/integrations/gmail/messages?max=1&days=30", (d) =>
      `${(d as { count?: number; messages?: unknown[] }).count ?? (d as { messages?: unknown[] }).messages?.length ?? 0} recent messages`
    );
    probe("qboVendors", "/api/integrations/qbo/vendors", (d) =>
      `${((d as { vendors?: unknown[] }).vendors ?? []).length} vendors`
    );
    probe("qboProjects", "/api/integrations/qbo/projects", (d) =>
      `${((d as { projects?: unknown[] }).projects ?? []).length} projects`
    );
    probe("qboAccounts", "/api/integrations/qbo/accounts", (d) =>
      `${((d as { accounts?: unknown[] }).accounts ?? []).length} expense accounts`
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const allGreen = probes.gmail.ok && probes.qboVendors.ok && probes.qboAccounts.ok;

  async function runEndToEnd() {
    if (running) return;
    setRunning(true);
    setPostedBillId(null);
    const initial: Step[] = [
      { id: "fetch", label: "Fetch test invoice PDF", status: "pending" },
      { id: "extract", label: "Send to Claude · extract invoice fields", status: "pending" },
      { id: "vendors", label: "List QuickBooks vendors", status: "pending" },
      { id: "accounts", label: "List QuickBooks expense accounts", status: "pending" },
      { id: "projects", label: "List QuickBooks projects", status: "pending" },
      { id: "post", label: "Post bill to QuickBooks", status: "pending" },
    ];
    setSteps(initial);

    const update = (id: string, patch: Partial<Step>) =>
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const time = async <T,>(id: string, fn: () => Promise<T>): Promise<T | null> => {
      const t0 = performance.now();
      update(id, { status: "running" });
      try {
        const out = await fn();
        update(id, { status: "ok", millis: Math.round(performance.now() - t0) });
        return out;
      } catch (e) {
        update(id, { status: "fail", error: (e as Error).message, millis: Math.round(performance.now() - t0) });
        return null;
      }
    };

    // 1. Fetch the bundled test invoice PDF.
    const pdfBytes = await time("fetch", async () => {
      const res = await fetch("/test-invoice-hvac.pdf", { cache: "no-store" });
      if (!res.ok) throw new Error(`Couldn't fetch test PDF (${res.status})`);
      const buf = await res.arrayBuffer();
      update("fetch", { detail: `${(buf.byteLength / 1024).toFixed(1)} KB` });
      return new Uint8Array(buf);
    });
    if (!pdfBytes) {
      setRunning(false);
      return;
    }
    const base64 = bytesToBase64(pdfBytes);

    // 2. Extract via Claude.
    type Extracted = {
      vendor_name: string | null;
      invoice_number: string | null;
      issue_date: string | null;
      due_date: string | null;
      project_ref: string | null;
      total: number | null;
      currency: string | null;
      line_items: Array<{ description: string; amount: number | null; quantity: number | null; unit_price: number | null; project_ref: string | null }>;
    };
    const extracted = await time<Extracted>("extract", async () => {
      const res = await fetch("/api/extract/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "upload", base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const ex = data.extracted as Extracted;
      update("extract", {
        detail: `${ex.vendor_name ?? "?"} · ${ex.invoice_number ?? "?"} · ${ex.total ?? "?"}`,
        result: ex,
      });
      return ex;
    });
    if (!extracted) {
      setRunning(false);
      return;
    }

    // 3-5. List QBO ref data.
    type Vendor = { Id: string; DisplayName: string };
    type Account = { Id: string; Name: string };
    type Project = { Id: string; DisplayName: string };

    const vendors = await time<Vendor[]>("vendors", async () => {
      const res = await fetch("/api/integrations/qbo/vendors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const list = (data.vendors ?? []) as Vendor[];
      update("vendors", { detail: `${list.length} vendors found` });
      if (list.length === 0) throw new Error("No vendors in QBO sandbox.");
      return list;
    });

    const accounts = await time<Account[]>("accounts", async () => {
      const res = await fetch("/api/integrations/qbo/accounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const list = (data.accounts ?? []) as Account[];
      update("accounts", { detail: `${list.length} expense accounts` });
      if (list.length === 0) throw new Error("No expense accounts found in QBO chart of accounts.");
      return list;
    });

    const projects = await time<Project[]>("projects", async () => {
      const res = await fetch("/api/integrations/qbo/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const list = (data.projects ?? []) as Project[];
      update("projects", { detail: list.length === 0 ? "0 — Projects feature off in this sandbox (still fine to post)" : `${list.length} projects` });
      return list;
    });

    if (!vendors || !accounts) {
      setRunning(false);
      return;
    }

    // 6. Post a bill. Use the first vendor + first expense account; project optional.
    const vendor = vendors[0];
    const account = accounts[0];
    const project = projects?.[0] ?? null;
    await time("post", async () => {
      const lines = (extracted.line_items?.length
        ? extracted.line_items.map((li) => ({
            description: li.description?.slice(0, 200) || "Line item",
            amount: typeof li.amount === "number" ? li.amount : 0,
            accountId: account.Id,
          }))
        : [{ description: extracted.invoice_number ?? "Test bill", amount: extracted.total ?? 0, accountId: account.Id }])
        .filter((l) => l.amount > 0);

      if (lines.length === 0) throw new Error("Extraction returned 0 valid line amounts.");

      const txnDate = extracted.issue_date ?? new Date().toISOString().slice(0, 10);
      // Avoid DocNumber collisions across reruns of the test.
      const docNumber = `${extracted.invoice_number ?? "TEST"}-DIAG-${Date.now().toString().slice(-5)}`;

      const res = await fetch("/api/integrations/qbo/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.Id,
          txnDate,
          docNumber,
          projectId: project?.Id,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const id = data.bill?.Id ?? "?";
      setPostedBillId(id);
      update("post", {
        detail: `Bill #${id} posted to ${vendor.DisplayName} · ${account.Name}${project ? ` · ${project.DisplayName}` : ""}`,
        result: data.bill,
      });
    });

    setRunning(false);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-[920px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/app" className="text-neutral-500 hover:text-neutral-900 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to workspace
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
              <PilotMark className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">PayablePilot · Diagnostics</span>
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">End-to-end pipeline test</h1>
          <p className="mt-1 text-sm text-neutral-500 max-w-prose">
            Runs the full PayablePilot pipeline against the bundled test invoice (HVAC service call, $1,228.88) and posts
            a real bill to your connected QuickBooks Online sandbox. Use this before any demo to catch breakage.
          </p>
        </div>

        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2 text-[12.5px] uppercase tracking-wider text-neutral-500 font-medium">
            Connection status
          </div>
          <ul>
            {Object.entries(probes).map(([k, p]) => (
              <li key={k} className="flex items-center gap-3 px-5 py-3 border-b border-neutral-100 last:border-0">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center text-white shrink-0",
                    p.loading ? "bg-neutral-300" : p.ok ? "bg-emerald-600" : "bg-rose-500"
                  )}
                >
                  {p.loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : p.ok ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </span>
                <span className="text-[13.5px] flex-1 font-medium">{p.label}</span>
                <span className="text-[12px] text-neutral-500">{p.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-[12.5px] uppercase tracking-wider text-neutral-500 font-medium">Test scenario</span>
            <a
              href="/test-invoice-hvac.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              View test PDF <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-4 text-[13px]">
            <Pair label="Vendor" value="Cornerstone HVAC Services" />
            <Pair label="Invoice #" value="CHV-4821" />
            <Pair label="Issued" value="2026-04-22" />
            <Pair label="Due" value="2026-05-22" />
            <Pair label="Job ref" value="JOB-2026-0418 · 418 Maple St HVAC Spring Tune-Up" highlight />
            <Pair label="Total" value="$1,228.88" />
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={runEndToEnd}
              disabled={running || !allGreen}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-md text-[13.5px] font-medium",
                running || !allGreen
                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  : "bg-neutral-900 text-white hover:opacity-90"
              )}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Running…" : "Run end-to-end test"}
            </button>
            {!allGreen && (
              <span className="ml-3 text-[12px] text-neutral-500">
                Requires Gmail (any state), QuickBooks vendors, and at least one expense account.
              </span>
            )}
          </div>
        </section>

        {steps.length > 0 && (
          <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2 text-[12.5px] uppercase tracking-wider text-neutral-500 font-medium">
              <Sparkles className="w-3 h-3" /> Pipeline run
            </div>
            <ul>
              {steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 px-5 py-3 border-b border-neutral-100 last:border-0">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full grid place-items-center text-white shrink-0 text-[11px] font-semibold",
                      s.status === "pending" && "bg-neutral-200 text-neutral-500",
                      s.status === "running" && "bg-neutral-900",
                      s.status === "ok" && "bg-emerald-600",
                      s.status === "fail" && "bg-rose-600"
                    )}
                  >
                    {s.status === "running" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : s.status === "ok" ? (
                      <Check className="w-3 h-3" />
                    ) : s.status === "fail" ? (
                      <X className="w-3 h-3" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{s.label}</div>
                    {s.detail && <div className="text-[12px] text-neutral-500 mt-0.5">{s.detail}</div>}
                    {s.error && (
                      <div className="text-[12px] text-rose-700 mt-0.5 break-words font-mono">{s.error}</div>
                    )}
                  </div>
                  {s.millis !== undefined && (
                    <span className="text-[11px] text-neutral-400 shrink-0 tabular-nums">
                      {s.millis < 1000 ? `${s.millis} ms` : `${(s.millis / 1000).toFixed(2)} s`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {postedBillId && (
              <div className="px-5 py-4 border-t border-neutral-200 bg-emerald-50 text-emerald-900 text-[13px] flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> Bill <strong>#{postedBillId}</strong> created in QuickBooks. Open the
                  sandbox to verify.
                </span>
                <a
                  href="https://sandbox.qbo.intuit.com/app/bills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800"
                >
                  Open QBO sandbox bills <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Pair({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-neutral-500 font-medium">{label}</div>
      <div className={cn("mt-0.5", highlight && "text-emerald-700 font-medium")}>{value}</div>
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
