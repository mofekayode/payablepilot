"use client";
import { Users } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "../primitives";
import { vendors } from "@/lib/app-data";
import { useStore } from "@/lib/store";
import { money } from "@/lib/utils";

export function VendorsView() {
  const { invoices } = useStore();
  const byVendor = new Map<string, { count: number; total: number }>();
  for (const inv of invoices) {
    const key = inv.vendorKey;
    const current = byVendor.get(key) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += inv.total;
    byVendor.set(key, current);
  }

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Vendors</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Your vendor book</h1>
        <p className="text-sm text-muted mt-1">
          PayablePilot learns each vendor&apos;s GL hint, terms, and email. W-9 status tracked for 1099 filings.
        </p>
      </div>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" /> Active vendors
          </span>
          <Badge tone="neutral">{Object.keys(vendors).length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Vendor</th>
                <th className="text-left font-medium py-2">Email</th>
                <th className="text-left font-medium py-2">Default GL</th>
                <th className="text-left font-medium py-2">Terms</th>
                <th className="text-right font-medium py-2 w-24">Invoices</th>
                <th className="text-right font-medium py-2 w-28 pr-5">MTD spend</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(vendors).map(([key, v]) => {
                const agg = byVendor.get(key) ?? { count: 0, total: 0 };
                return (
                  <tr key={key} className="border-t border-border">
                    <td className="py-2.5 pl-5 font-medium">{v.name}</td>
                    <td className="py-2.5 text-muted">{v.email}</td>
                    <td className="py-2.5">{v.glHint}</td>
                    <td className="py-2.5">{v.terms}</td>
                    <td className="py-2.5 text-right">{agg.count}</td>
                    <td className="py-2.5 pr-5 text-right font-mono">{money(agg.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
