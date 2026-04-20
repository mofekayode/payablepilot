export type Vendor = {
  name: string;
  email: string;
  terms: string;
  glHint: string;
};

export type LineItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  vendor: Vendor;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  poNumber: string;
  propertyRef: string;
  lines: LineItem[];
  total: number;
  glCode: string;
  glLabel: string;
};

export type PurchaseOrder = {
  poNumber: string;
  vendor: string;
  lines: LineItem[];
  total: number;
  approvedBy: string;
  approvedOn: string;
};

export type ReceivingReport = {
  poNumber: string;
  receivedOn: string;
  signedBy: string;
  itemsReceived: { description: string; qty: number }[];
};

export const company = {
  name: "Greenfield Property Management",
  unitsManaged: 40,
  email: "ap@greenfieldpm.com",
};

export const vendors: Record<string, Vendor> = {
  summit: {
    name: "Summit Plumbing",
    email: "billing@summitplumbing.com",
    terms: "Net 30",
    glHint: "6120 · Repairs & Maintenance",
  },
  reliable: {
    name: "Reliable Landscaping",
    email: "accounts@reliablelandscaping.com",
    terms: "Net 15",
    glHint: "6130 · Grounds & Landscaping",
  },
  metro: {
    name: "Metro Electric",
    email: "ar@metroelectric.com",
    terms: "Net 30",
    glHint: "6140 · Electrical Repairs",
  },
  allied: {
    name: "Allied Insurance",
    email: "billing@alliedins.com",
    terms: "Net 10",
    glHint: "6210 · Property Insurance",
  },
};

export const matchedInvoice: Invoice = {
  id: "inv-summit-4821",
  vendor: vendors.summit,
  invoiceNumber: "SP-4821",
  issueDate: "2026-04-16",
  dueDate: "2026-05-16",
  poNumber: "PO-1042",
  propertyRef: "Unit 12B · 418 Maple St",
  lines: [
    { description: "Kitchen faucet replacement (Moen 87039)", qty: 1, unitPrice: 189.5 },
    { description: "Shut-off valve replacement", qty: 2, unitPrice: 24.75 },
    { description: "Labor (1.5 hrs @ $106.50/hr)", qty: 1.5, unitPrice: 106.5 },
  ],
  total: 399.0,
  glCode: "6120",
  glLabel: "Repairs & Maintenance",
};
matchedInvoice.total = matchedInvoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

export const matchedPO: PurchaseOrder = {
  poNumber: "PO-1042",
  vendor: vendors.summit.name,
  lines: matchedInvoice.lines,
  total: matchedInvoice.total,
  approvedBy: "Erin Boyd, Property Manager",
  approvedOn: "2026-04-10",
};

export const matchedReceiving: ReceivingReport = {
  poNumber: "PO-1042",
  receivedOn: "2026-04-15",
  signedBy: "Marcus Hill, Unit 12B tenant",
  itemsReceived: [
    { description: "Kitchen faucet installed, tested", qty: 1 },
    { description: "Shut-off valves replaced", qty: 2 },
    { description: "Service hours completed", qty: 1.5 },
  ],
};

export const discrepancyInvoice: Invoice = {
  id: "inv-reliable-2210",
  vendor: vendors.reliable,
  invoiceNumber: "RL-2210",
  issueDate: "2026-04-17",
  dueDate: "2026-05-02",
  poNumber: "PO-1055",
  propertyRef: "Portfolio · April grounds service",
  lines: [
    { description: "Lawn service visits (April, 4 properties)", qty: 16, unitPrice: 85.0 },
    { description: "Mulch delivery & install (yards)", qty: 12, unitPrice: 95.0 },
  ],
  total: 0,
  glCode: "6130",
  glLabel: "Grounds & Landscaping",
};
discrepancyInvoice.total = discrepancyInvoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

export const discrepancyPO: PurchaseOrder = {
  poNumber: "PO-1055",
  vendor: vendors.reliable.name,
  lines: [
    { description: "Lawn service visits (April, 4 properties)", qty: 16, unitPrice: 75.0 },
    { description: "Mulch delivery & install (yards)", qty: 12, unitPrice: 95.0 },
  ],
  total: 16 * 75.0 + 12 * 95.0,
  approvedBy: "Erin Boyd, Property Manager",
  approvedOn: "2026-03-28",
};

export const digest = {
  date: "2026-04-18",
  invoicesProcessed: 12,
  matched: 10,
  matchedTotal: 34512.45,
  discrepancies: 2,
  duplicatesBlocked: 1,
  overdue30: 3,
  byVendor: [
    { vendor: "Summit Plumbing", count: 3, total: 1247.5, status: "matched" as const },
    { vendor: "Reliable Landscaping", count: 2, total: 2500, status: "flagged" as const },
    { vendor: "Metro Electric", count: 2, total: 4180, status: "matched" as const },
    { vendor: "Allied Insurance", count: 1, total: 18650, status: "matched" as const },
    { vendor: "Hillcrest Builders", count: 2, total: 6820, status: "matched" as const },
    { vendor: "Pacific Pest Control", count: 2, total: 1115, status: "matched" as const },
  ],
};

export const draftedVendorEmail = (inv: Invoice, po: PurchaseOrder) => `Hi ${inv.vendor.name} team,

Quick follow-up on invoice ${inv.invoiceNumber}. The line for "${po.lines[0].description}" is billed at $${inv.lines[0].unitPrice.toFixed(2)}/unit, but our approved PO ${po.poNumber} shows $${po.lines[0].unitPrice.toFixed(2)}/unit.

Could you confirm the correct rate or send a revised invoice? Happy to release the remaining matched lines for payment in the meantime.

Thanks,
Greenfield PM · Accounts Payable`;
