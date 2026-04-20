"use client";
import { CreditCard, Check, AlertTriangle, Mail } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { cardTransactions, CardTransaction } from "@/lib/app-data";
import { cn, money } from "@/lib/utils";

export function CardsView() {
  const matched = cardTransactions.filter((t) => t.status === "matched" || t.status === "coded_auto");
  const missing = cardTransactions.filter((t) => t.status === "missing_receipt");
  const flagged = cardTransactions.filter((t) => t.status === "flagged");
  const total = cardTransactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Credit card reconciliation</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Card charges, auto-matched to receipts.</h1>
        <p className="text-sm text-muted mt-1">
          Live feed from Chase Ink. Agent codes by vendor memory, requests missing receipts, blocks duplicates.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat icon={<CreditCard className="w-4 h-4" />} label="Charges this period" value={String(cardTransactions.length)} sub={money(total)} />
        <Stat icon={<Check className="w-4 h-4 text-brand" />} label="Matched or auto-coded" value={String(matched.length)} sub="no action needed" tone="brand" />
        <Stat icon={<AlertTriangle className="w-4 h-4 text-accent" />} label="Missing receipts" value={String(missing.length)} sub="agent is chasing" tone="accent" />
        <Stat icon={<AlertTriangle className="w-4 h-4 text-danger" />} label="Flagged" value={String(flagged.length)} sub="for your review" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Transactions
          </span>
          <Badge tone="neutral">Chase Ink · feed live</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Posted</th>
                <th className="text-left font-medium py-2">Cardholder</th>
                <th className="text-left font-medium py-2">Merchant</th>
                <th className="text-left font-medium py-2">Category</th>
                <th className="text-right font-medium py-2 w-28">Amount</th>
                <th className="text-right font-medium py-2 w-52 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {cardTransactions.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2.5 pl-5 text-muted">{t.postedAt}</td>
                  <td className="py-2.5">
                    <div className="font-medium">{t.cardholder}</div>
                    <div className="text-xs text-muted font-mono">•••• {t.last4}</div>
                  </td>
                  <td className="py-2.5">{t.merchant}</td>
                  <td className="py-2.5 text-muted">{t.category}</td>
                  <td className="py-2.5 text-right font-mono">{money(t.amount)}</td>
                  <td className="py-2.5 pr-5 text-right">
                    <StatusBadge t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {missing.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" /> Drafted receipt requests
            </span>
            <Badge tone="accent">{missing.length} pending</Badge>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            {missing.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border bg-surface">
                <div>
                  <div className="text-sm font-medium">
                    {t.cardholder} · {t.merchant} · {money(t.amount)}
                  </div>
                  <div className="text-xs text-muted">{t.note}</div>
                </div>
                <Button variant="outline">Preview email</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
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
  tone?: "neutral" | "brand" | "accent";
}) {
  const ring =
    tone === "brand" ? "ring-[color:var(--brand)]/20" : tone === "accent" ? "ring-[color:var(--accent)]/25" : "ring-transparent";
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

function StatusBadge({ t }: { t: CardTransaction }) {
  if (t.status === "matched") return <Badge tone="brand"><Check className="w-3 h-3" /> Matched · {t.matchedTo}</Badge>;
  if (t.status === "coded_auto") return <Badge tone="brand">Auto-coded</Badge>;
  if (t.status === "missing_receipt") return <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Receipt requested</Badge>;
  return <Badge tone="danger"><AlertTriangle className="w-3 h-3" /> Flagged</Badge>;
}
