"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  ClipboardList,
  PackageCheck,
  Sparkles,
  AlertTriangle,
  Mail,
  Ban,
  Send,
  Play,
} from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Row } from "../primitives";
import { money } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { vendors, Invoice, LineItem } from "@/lib/app-data";

type Mode = "match" | "flag" | "duplicate";

function pickMode(inv: Invoice): Mode {
  if (inv.originalPaidInvoice) return "duplicate";
  if (inv.discrepancyReason) return "flag";
  return "match";
}

export function InvoiceDetail({
  invoiceId,
  onBack,
}: {
  invoiceId: string;
  onBack: () => void;
}) {
  const { invoices, setStatus } = useStore();
  const invoice = invoices.find((i) => i.id === invoiceId);

  const mode = invoice ? pickMode(invoice) : "match";

  const [stage, setStage] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const maxStage = mode === "duplicate" ? 4 : 6;

  useEffect(() => {
    setStage(0);
    setAutoPlay(false);
    // auto-start the match animation whenever this invoice is opened
    const t = setTimeout(() => setAutoPlay(true), 350);
    return () => clearTimeout(t);
  }, [invoiceId]);

  useEffect(() => {
    if (!autoPlay) return;
    if (stage >= maxStage) {
      setAutoPlay(false);
      return;
    }
    const t = setTimeout(() => setStage((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [autoPlay, stage, maxStage]);

  // Persist terminal status when we reach final stage
  useEffect(() => {
    if (!invoice) return;
    if (stage < maxStage) return;
    if (mode === "match" && invoice.status !== "matched") setStatus(invoice.id, "matched");
    if (mode === "flag" && invoice.status !== "flagged") setStatus(invoice.id, "flagged");
    if (mode === "duplicate" && invoice.status !== "duplicate") setStatus(invoice.id, "duplicate");
  }, [stage, maxStage, mode, invoice, setStatus]);

  if (!invoice) return null;
  const vendor = vendors[invoice.vendorKey];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-3 border-b border-border bg-background flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Queue
        </Button>
        <div className="text-sm text-muted">/</div>
        <div className="text-sm font-medium">
          {vendor.name} · {invoice.invoiceNumber}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={autoPlay ? "outline" : "primary"}
            onClick={() => {
              if (stage >= maxStage) setStage(0);
              setAutoPlay(!autoPlay);
            }}
          >
            <Play className="w-4 h-4" />
            {stage === 0 ? "Run pilot" : autoPlay ? "Pause" : stage >= maxStage ? "Replay" : "Resume"}
          </Button>
          <Button variant="outline" onClick={() => setStage((s) => Math.min(s + 1, maxStage))} disabled={stage >= maxStage}>
            Step
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin bg-surface">
        <div className="grid grid-cols-12 gap-5 p-6">
          <div className="col-span-3">
            <InvoicePDFCard invoice={invoice} vendorName={vendor.name} />
          </div>
          <div className="col-span-9 space-y-4 min-w-0">
            <AgentProgress mode={mode} stage={stage} />
            {mode === "match" && <MatchView invoice={invoice} stage={stage} />}
            {mode === "flag" && <FlagView invoice={invoice} stage={stage} />}
            {mode === "duplicate" && <DuplicateView invoice={invoice} stage={stage} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentProgress({ mode, stage }: { mode: Mode; stage: number }) {
  const steps =
    mode === "duplicate"
      ? [
          "Reading PDF and extracting fields",
          "Checking against posted invoices",
          "Duplicate of ME-0912 paid on 2026-04-12",
          "Blocking and notifying vendor",
        ]
      : [
          "Reading PDF and extracting fields",
          "Identifying vendor and invoice number",
          "Locating matching purchase order",
          "Retrieving receiving confirmation",
          mode === "flag" ? "Comparing line items vs PO" : "Running three-way match",
          mode === "flag" ? "Drafting vendor email" : "Posting to GL and queuing for approval",
        ];
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium">Agent activity</span>
        </div>
        {stage < steps.length ? (
          <Badge tone="brand">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
            Processing · step {Math.max(stage, 1)} of {steps.length}
          </Badge>
        ) : mode === "match" ? (
          <Badge tone="brand">Complete</Badge>
        ) : mode === "flag" ? (
          <Badge tone="accent">Held for review</Badge>
        ) : (
          <Badge tone="danger">Blocked</Badge>
        )}
      </CardHeader>
      <CardBody>
        <div className="space-y-2 text-sm">
          {steps.map((s, i) => {
            const done = stage > i;
            const active = stage === i;
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full grid place-items-center border ${
                    done
                      ? "bg-brand border-brand text-white"
                      : active
                      ? "border-brand text-brand"
                      : "border-border text-muted"
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : active ? <span className="w-1 h-1 rounded-full bg-brand animate-pulse-soft" /> : <span className="w-1 h-1 rounded-full bg-muted" />}
                </div>
                <span className={done ? "text-foreground" : active ? "text-foreground" : "text-muted"}>{s}</span>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function MatchView({ invoice, stage }: { invoice: Invoice; stage: number }) {
  const vendor = vendors[invoice.vendorKey];
  const poLines = invoice.poLines ?? invoice.lines;
  const poTotal = invoice.poTotal ?? invoice.total;
  const showInvoiceCard = stage >= 2;
  const showPOCard = stage >= 3;
  const showReceivingCard = stage >= 4;
  const showMatched = stage >= 5;
  const showCoded = stage >= 6;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <DocCard icon={<FileText className="w-4 h-4" />} title="Invoice" badge="Extracted" show={showInvoiceCard}>
          <Row label="Vendor" value={vendor.name} />
          <Row label="Invoice #" value={invoice.invoiceNumber} mono />
          <Row label="PO reference" value={invoice.poNumber} mono />
          <Row label="Property" value={invoice.propertyRef} />
          <Row label="Total" value={<span className="font-semibold">{money(invoice.total)}</span>} />
        </DocCard>

        <DocCard icon={<ClipboardList className="w-4 h-4" />} title="Purchase order" badge="In QuickBooks" show={showPOCard}>
          <Row label="PO #" value={invoice.poNumber} mono />
          <Row label="Approved by" value={invoice.poApprovedBy ?? "—"} />
          <Row label="Approved" value={invoice.poApprovedOn ?? "—"} />
          <Row label="Lines" value={poLines.length} />
          <Row label="Total" value={money(poTotal)} />
        </DocCard>

        <DocCard icon={<PackageCheck className="w-4 h-4" />} title="Receiving" badge="Signed" show={showReceivingCard}>
          <Row label="Received on" value={invoice.receivingDate ?? "—"} />
          <Row label="Signed by" value={invoice.receivingSignedBy ?? "—"} />
          <Row label="Status" value={<span className="text-brand font-medium">Complete</span>} />
        </DocCard>
      </div>

      {showMatched && (
        <Card className="animate-fade-in-up border-[color:var(--brand)]/30">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Three-way match confirmed</div>
                  <div className="text-xs text-muted">
                    Invoice {invoice.invoiceNumber} matches PO {invoice.poNumber} and signed receiving.
                  </div>
                </div>
              </div>
              {showCoded && (
                <div className="flex items-center gap-3 animate-fade-in-up">
                  <div className="text-right">
                    <div className="text-xs text-muted">Posted to</div>
                    <div className="text-sm font-medium">
                      {invoice.suggestedGL.code} · {invoice.suggestedGL.label}
                    </div>
                  </div>
                  <Badge tone="brand">Queued</Badge>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function FlagView({ invoice, stage }: { invoice: Invoice; stage: number }) {
  const vendor = vendors[invoice.vendorKey];
  const poLines = invoice.poLines ?? invoice.lines;
  const poTotal = invoice.poTotal ?? invoice.total;
  const showInvoice = stage >= 2;
  const showPO = stage >= 3;
  const showCompare = stage >= 4;
  const showDraft = stage >= 5;
  const showNotif = stage >= 6;

  const diff = invoice.total - poTotal;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card className={showInvoice ? "animate-fade-in-up" : "opacity-0"}>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Invoice {invoice.invoiceNumber}
            </span>
            <Badge tone="neutral">Received</Badge>
          </CardHeader>
          <CardBody>
            <LineTable lines={invoice.lines} highlight={0} tone="accent" />
            <Row label="Invoice total" value={<span className="font-semibold">{money(invoice.total)}</span>} />
          </CardBody>
        </Card>
        <Card className={showPO ? "animate-fade-in-up" : "opacity-0"}>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Approved PO {invoice.poNumber}
            </span>
            <Badge tone="brand">On file</Badge>
          </CardHeader>
          <CardBody>
            <LineTable lines={poLines} highlight={0} tone="brand" />
            <Row label="PO total" value={<span className="font-semibold">{money(poTotal)}</span>} />
          </CardBody>
        </Card>
      </div>

      {showCompare && (
        <Card className="animate-fade-in-up border-[color:var(--accent)]/40">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-soft text-accent grid place-items-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Pricing discrepancy detected</div>
                <div className="text-xs text-muted mt-1">{invoice.discrepancyReason}</div>
                <div className="mt-2 text-xs text-muted">
                  Difference: <span className="text-accent font-medium">{money(diff)}</span> · payment hold placed until confirmed.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {showDraft && (
        <DraftedVendorEmail
          initialTo={vendor.email}
          initialSubject={`Invoice ${invoice.invoiceNumber} pricing vs PO ${invoice.poNumber}`}
          initialBody={`Hi ${vendor.name} team,

Quick follow-up on invoice ${invoice.invoiceNumber}. Line 1 is billed at ${money(invoice.lines[0].unitPrice)}/unit but our approved PO ${invoice.poNumber} shows ${money(poLines[0].unitPrice)}/unit.

Can you confirm the correct rate or send a revised invoice? I can release the remaining matched lines in the meantime.

Thanks,
Greenfield PM · Accounts Payable`}
        />
      )}

      {showNotif && (
        <Card className="animate-fade-in-up border-[color:var(--accent)]/40">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-soft text-accent grid place-items-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-semibold">1 invoice needs your review</div>
                <div className="text-xs text-muted">
                  {vendor.name} · {invoice.invoiceNumber} · billed {money(invoice.total)}, expected {money(poTotal)}.
                </div>
              </div>
              <Badge tone="accent">Held for review</Badge>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function DuplicateView({ invoice, stage }: { invoice: Invoice; stage: number }) {
  const vendor = vendors[invoice.vendorKey];
  const show2 = stage >= 2;
  const show3 = stage >= 3;
  const show4 = stage >= 4;

  return (
    <>
      {show2 && (
        <Card className="animate-fade-in-up border-[color:var(--danger)]/30">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-danger-soft text-danger grid place-items-center">
                <Ban className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Duplicate of already-paid invoice</div>
                <div className="text-xs text-muted mt-1">
                  {vendor.name} · {invoice.invoiceNumber} was {invoice.originalPaidInvoice}. Blocking to prevent double payment.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      {show3 && (
        <DraftedVendorEmail
          headerLabel="Polite reply drafted to vendor"
          initialTo={vendor.email}
          initialSubject={`Invoice ${invoice.invoiceNumber} · already paid`}
          initialBody={`Hi ${vendor.name} team,

Thanks for the follow up. Invoice ${invoice.invoiceNumber} was already paid on ${invoice.originalPaidInvoice?.replace(/^paid /, "") ?? "the posted date"}. Nothing more needed on our side.

Thanks,
Greenfield PM · Accounts Payable`}
        />
      )}
      {show4 && (
        <Card className="animate-fade-in-up">
          <CardBody>
            <div className="text-sm">
              <span className="font-semibold">Nothing reaches payment run.</span>
              <span className="text-muted"> PayablePilot logs the attempt in your audit trail and moves on.</span>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function DocCard({
  icon,
  title,
  badge,
  show,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={show ? "animate-fade-in-up" : "opacity-0"}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge tone="brand">{badge}</Badge>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function LineTable({
  lines,
  highlight,
  tone,
}: {
  lines: LineItem[];
  highlight?: number;
  tone?: "brand" | "accent";
}) {
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
          <th className="text-left font-medium py-1.5">Description</th>
          <th className="text-right font-medium py-1.5 w-10">Qty</th>
          <th className="text-right font-medium py-1.5 w-16">Unit</th>
          <th className="text-right font-medium py-1.5 w-20">Total</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const isH = highlight === i;
          const bg = isH && tone === "accent" ? "bg-accent-soft" : isH && tone === "brand" ? "bg-brand-soft" : "";
          return (
            <tr key={i} className={`${bg} border-b border-border`}>
              <td className="py-1.5 pr-2">{l.description}</td>
              <td className="py-1.5 text-right">{l.qty}</td>
              <td className={`py-1.5 text-right ${isH ? "font-semibold" : ""}`}>{money(l.unitPrice)}</td>
              <td className="py-1.5 text-right">{money(l.qty * l.unitPrice)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InvoicePDFCard({
  invoice,
  vendorName,
}: {
  invoice: Invoice;
  vendorName: string;
}) {
  const total = useMemo(() => invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), [invoice.lines]);
  return (
    <div className="sticky top-4 rounded-xl shadow-[0_8px_40px_rgba(27,42,74,0.08)] border border-border bg-white overflow-hidden">
      <div className="h-1.5 bg-brand" />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.2em] font-semibold text-muted">INVOICE</div>
            <div className="text-lg font-semibold mt-0.5">{vendorName}</div>
          </div>
          <div className="text-right text-xs text-muted">
            <div>#: {invoice.invoiceNumber}</div>
            <div>Issued: {invoice.issueDate}</div>
            <div>Due: {invoice.dueDate}</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted">Bill to</div>
        <div className="text-sm font-medium">Greenfield Property Management</div>
        <div className="text-xs text-muted">{invoice.propertyRef}</div>
        <div className="text-xs text-muted">Ref PO: {invoice.poNumber}</div>
        <table className="w-full mt-4 text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
              <th className="text-left font-medium py-1.5">Description</th>
              <th className="text-right font-medium py-1.5 w-10">Qty</th>
              <th className="text-right font-medium py-1.5 w-16">Unit</th>
              <th className="text-right font-medium py-1.5 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-1.5 pr-2">{l.description}</td>
                <td className="py-1.5 text-right">{l.qty}</td>
                <td className="py-1.5 text-right">{money(l.unitPrice)}</td>
                <td className="py-1.5 text-right">{money(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2" />
              <td />
              <td className="py-2 text-right text-muted text-xs">Total due</td>
              <td className="py-2 text-right font-semibold">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DraftedVendorEmail({
  initialTo,
  initialSubject,
  initialBody,
  headerLabel = "Drafted email to vendor",
}: {
  initialTo: string;
  initialSubject: string;
  initialBody: string;
  headerLabel?: string;
}) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [stage, setStage] = useState<"idle" | "sending" | "sent">("idle");
  const [sentAt, setSentAt] = useState<string | null>(null);

  const onSend = () => {
    if (stage !== "idle") return;
    setStage("sending");
    setTimeout(() => {
      const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setSentAt(now);
      setStage("sent");
    }, 1500);
  };

  const onSendAnother = () => {
    setStage("idle");
    setSentAt(null);
  };

  if (stage === "sent") {
    return (
      <Card className="animate-fade-in-up border-[color:var(--brand)]/30">
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-brand text-white grid place-items-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold">Email sent</div>
              <div className="text-xs text-muted mt-0.5">
                Delivered to <span className="text-foreground font-medium">{to}</span> at {sentAt}
              </div>
              <div className="mt-4 rounded-md border border-border bg-surface p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Subject</div>
                <div className="text-sm font-medium">{subject}</div>
                <div className="mt-3 text-[11px] uppercase tracking-wider text-muted mb-1">Message</div>
                <div className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground">
                  {body}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge tone="brand">
                  <Check className="w-3 h-3" /> Logged in Agent outbox
                </Badge>
                <Badge tone="neutral">Awaiting reply</Badge>
                <button
                  onClick={onSendAnother}
                  className="ml-auto text-xs text-muted hover:text-foreground underline"
                >
                  Undo
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const sending = stage === "sending";

  return (
    <Card className="animate-fade-in-up relative overflow-hidden">
      {sending && (
        <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[1px] grid place-items-center animate-fade-in-up">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-14 h-14">
              <span className="absolute inset-0 rounded-full bg-brand-soft animate-ping" />
              <span className="absolute inset-0 rounded-full bg-brand text-white grid place-items-center">
                <Send className="w-6 h-6" />
              </span>
            </div>
            <div className="text-sm font-medium">Sending to {to}…</div>
            <div className="text-xs text-muted">Encrypting, handing off to mail server</div>
          </div>
        </div>
      )}
      <CardHeader className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Mail className="w-4 h-4" /> {headerLabel}
        </span>
        <Badge tone="brand">Editable</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-[70px_1fr] gap-x-3 gap-y-2 items-center">
          <label className="text-xs text-muted">From</label>
          <div className="text-sm font-medium">ap@greenfieldpm.com</div>
          <label className="text-xs text-muted">To</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none text-sm py-1.5"
          />
          <label className="text-xs text-muted">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none text-sm font-medium py-1.5"
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          className="mt-4 w-full rounded-md border border-border bg-surface focus:bg-background focus:border-foreground outline-none p-3 font-mono text-[12.5px] leading-relaxed text-foreground resize-y"
        />
        <div className="flex items-center gap-2 mt-4">
          <Button onClick={onSend} disabled={sending}>
            <Send className="w-4 h-4" /> Send
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTo(initialTo);
              setSubject(initialSubject);
              setBody(initialBody);
            }}
          >
            Reset draft
          </Button>
          <span className="ml-auto text-xs text-muted">Auto-send after 10 min if unreviewed</span>
        </div>
      </CardBody>
    </Card>
  );
}
