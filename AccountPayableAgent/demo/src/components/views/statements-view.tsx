"use client";
import { useState } from "react";
import { FileSpreadsheet, Check, AlertTriangle, Clock, Send } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { statements, vendors, VendorStatement } from "@/lib/app-data";
import { cn, money } from "@/lib/utils";

export function StatementsView() {
  const [selected, setSelected] = useState<string>(statements[0].id);
  const current = statements.find((s) => s.id === selected)!;

  return (
    <div className="grid grid-cols-[320px_1fr] h-full min-h-0">
      <aside className="border-r border-border bg-background overflow-auto scrollbar-thin">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-muted">Vendor statements</div>
          <div className="text-sm font-semibold mt-1">Statements received this period</div>
        </div>
        <ul>
          {statements.map((s) => {
            const v = vendors[s.vendorKey];
            const isActive = s.id === selected;
            const variance = s.theirTotal - s.ourTotal;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "w-full text-left px-5 py-3 border-b border-border flex flex-col gap-1",
                    isActive ? "bg-surface" : "hover:bg-surface"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{v.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-[11px] font-mono text-muted">{s.statementNumber}</div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>Period ended {s.periodEnd}</span>
                    <span className={cn(variance === 0 ? "text-muted" : "text-accent font-medium")}>
                      {variance === 0 ? "Balanced" : `Δ ${money(variance)}`}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="overflow-auto scrollbar-thin p-6 bg-surface">
        <StatementDetail stmt={current} />
      </section>
    </div>
  );
}

function StatementDetail({ stmt }: { stmt: VendorStatement }) {
  const v = vendors[stmt.vendorKey];
  const variance = stmt.theirTotal - stmt.ourTotal;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">{stmt.statementNumber}</div>
          <h1 className="text-[24px] font-semibold tracking-tight">{v.name}</h1>
          <p className="text-sm text-muted mt-1">
            Received {stmt.receivedOn} · period ended {stmt.periodEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={stmt.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Their total" value={money(stmt.theirTotal)} />
        <Stat label="Our posted total" value={money(stmt.ourTotal)} />
        <Stat
          label="Variance"
          value={variance === 0 ? money(0) : money(variance)}
          tone={variance === 0 ? "brand" : "accent"}
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Line-by-line reconciliation
          </span>
          <Badge tone="neutral">{stmt.lines.length} lines</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Invoice</th>
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-right font-medium py-2 w-28">Amount</th>
                <th className="text-right font-medium py-2 w-52 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {stmt.lines.map((l) => (
                <tr key={l.invoiceNumber} className="border-t border-border">
                  <td className="py-2.5 pl-5 font-mono text-[12.5px]">{l.invoiceNumber}</td>
                  <td className="py-2.5 text-muted">{l.date}</td>
                  <td className="py-2.5 text-right font-mono">{money(l.amount)}</td>
                  <td className="py-2.5 pr-5 text-right">
                    <LineStatus status={l.reconciled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {stmt.note && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface grid place-items-center text-muted">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-sm text-foreground">{stmt.note}</div>
            </div>
          </CardBody>
        </Card>
      )}

      {stmt.status !== "reconciled" && (
        <Card>
          <CardHeader>
            <span className="text-sm font-medium">Pilot next actions</span>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <Action label="Email vendor to request PDF of any missing invoices" />
            <Action label="Cross-check QuickBooks posting dates for on-our-side variance" />
            <Action label="Mark reconciled after owner confirms variance resolution" />
            <div className="pt-2">
              <Button>
                <Send className="w-4 h-4" /> Send reconciliation reply to {v.name}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "accent";
}) {
  const ring =
    tone === "brand" ? "ring-[color:var(--brand)]/20" : tone === "accent" ? "ring-[color:var(--accent)]/25" : "ring-transparent";
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4 ring-1", ring)}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: VendorStatement["status"] }) {
  if (status === "reconciled") return <Badge tone="brand"><Check className="w-3 h-3" /> Reconciled</Badge>;
  if (status === "variance") return <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Variance</Badge>;
  return <Badge tone="neutral"><Clock className="w-3 h-3" /> Pending</Badge>;
}

function LineStatus({ status }: { status: "matched" | "missing_on_our_side" | "missing_on_their_side" }) {
  if (status === "matched") return <Badge tone="brand">Matched</Badge>;
  if (status === "missing_on_our_side")
    return <Badge tone="accent">On their statement, not in our books</Badge>;
  return <Badge tone="accent">In our books, not on statement</Badge>;
}

function Action({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface">
      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
      <span>{label}</span>
    </div>
  );
}
