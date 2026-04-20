"use client";
import { ReceiptText, Check, AlertTriangle, Send, Download, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { vendorCompliance, vendors } from "@/lib/app-data";
import { money, cn } from "@/lib/utils";

const THRESHOLD_1099 = 600;

export function ComplianceView() {
  const needsW9 = vendorCompliance.filter((v) => !v.w9OnFile).length;
  const above1099 = vendorCompliance.filter((v) => v.is1099Eligible && v.ytdPaid >= THRESHOLD_1099).length;
  const totalYtd = vendorCompliance.reduce((s, v) => s + v.ytdPaid, 0);

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">W-9 & 1099</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Tax compliance per vendor.</h1>
        <p className="text-sm text-muted mt-1">
          PayablePilot tracks every W-9, watches the ${THRESHOLD_1099} 1099 threshold, and prepares filings in January.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat icon={<ReceiptText className="w-4 h-4" />} label="Active vendors" value={String(vendorCompliance.length)} sub="on file" />
        <Stat icon={<AlertTriangle className="w-4 h-4 text-accent" />} label="W-9 missing" value={String(needsW9)} sub="agent is requesting" tone="accent" />
        <Stat icon={<ShieldCheck className="w-4 h-4 text-brand" />} label="1099 tracking" value={String(above1099)} sub={`above $${THRESHOLD_1099} YTD`} tone="brand" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <ReceiptText className="w-4 h-4" /> Vendor tax status
          </span>
          <Badge tone="neutral">YTD paid {money(totalYtd)}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Vendor</th>
                <th className="text-left font-medium py-2">Entity</th>
                <th className="text-left font-medium py-2">Tax ID</th>
                <th className="text-left font-medium py-2">W-9</th>
                <th className="text-right font-medium py-2 w-28">YTD paid</th>
                <th className="text-right font-medium py-2 w-44 pr-5">1099 status</th>
              </tr>
            </thead>
            <tbody>
              {vendorCompliance.map((v) => {
                const vendor = vendors[v.vendorKey];
                return (
                  <tr key={v.vendorKey} className="border-t border-border">
                    <td className="py-2.5 pl-5 font-medium">{vendor.name}</td>
                    <td className="py-2.5 text-muted">{v.entityType}</td>
                    <td className="py-2.5 font-mono text-[12.5px]">{v.taxIdMasked}</td>
                    <td className="py-2.5">
                      {v.w9OnFile ? (
                        <Badge tone="brand"><Check className="w-3 h-3" /> On file · exp {v.w9ExpiresOn}</Badge>
                      ) : (
                        <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Missing</Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono">{money(v.ytdPaid)}</td>
                    <td className="py-2.5 pr-5 text-right">
                      <Status1099 value={v.status1099} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" /> W-9 requests in motion
            </span>
            <Badge tone="accent">{needsW9}</Badge>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            {vendorCompliance
              .filter((v) => !v.w9OnFile)
              .map((v) => (
                <div key={v.vendorKey} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border bg-surface">
                  <div>
                    <div className="text-sm font-medium">{vendors[v.vendorKey].name}</div>
                    <div className="text-xs text-muted">Agent emailed the vendor on 2026-04-16. Auto-follow-up scheduled for 2026-04-21.</div>
                  </div>
                  <Button variant="outline">
                    <Send className="w-3.5 h-3.5" /> Preview
                  </Button>
                </div>
              ))}
            {needsW9 === 0 && (
              <div className="text-muted text-sm px-3 py-2">All vendors on file. Nothing to chase.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" /> 1099 filing packet (January 2027)
            </span>
            <Badge tone="brand">Draft auto-maintained</Badge>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            <div className="px-3 py-2 rounded-md border border-border bg-surface">
              Agent builds 1099-NEC data in real time. Threshold ${THRESHOLD_1099} watched per vendor.
            </div>
            <div className="px-3 py-2 rounded-md border border-border bg-surface">
              Packet will be produced as <span className="font-mono text-[12.5px]">greenfield-1099-2026.zip</span> in January with per-vendor forms, IRS copy, and state copy.
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4" /> Preview current draft
            </Button>
          </CardBody>
        </Card>
      </div>
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
    tone === "brand"
      ? "ring-[color:var(--brand)]/20"
      : tone === "accent"
      ? "ring-[color:var(--accent)]/25"
      : "ring-transparent";
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

function Status1099({ value }: { value: "ready" | "threshold_watch" | "not_required" | "missing_info" }) {
  if (value === "ready") return <Badge tone="brand"><Check className="w-3 h-3" /> Ready for Jan filing</Badge>;
  if (value === "threshold_watch") return <Badge tone="neutral">Watching threshold</Badge>;
  if (value === "missing_info") return <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Missing W-9</Badge>;
  return <Badge tone="neutral">Not required (corp)</Badge>;
}
