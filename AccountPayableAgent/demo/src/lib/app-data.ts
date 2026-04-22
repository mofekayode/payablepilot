import { vendors, company } from "./demo-data";

export { company, vendors };

export type LineItem = { description: string; qty: number; unitPrice: number };

export type InvoiceStatus =
  | "inbox"
  | "captured"
  | "matched"
  | "flagged"
  | "duplicate"
  | "paid";

export type EmailThread = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  bodyParagraphs: string[];
  receivedAt: string;
  attachment?: { name: string; pages: number };
  invoiceId?: string;
  readable?: boolean;
  captured?: boolean;
  starred?: boolean;
  unread?: boolean;
};

export type Invoice = {
  id: string;
  vendorKey: keyof typeof vendors;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  poNumber: string;
  propertyRef: string;
  lines: LineItem[];
  total: number;
  suggestedGL: { code: string; label: string };
  status: InvoiceStatus;
  note?: string;
  poLines?: LineItem[];
  poTotal?: number;
  poApprovedBy?: string;
  poApprovedOn?: string;
  receivingSignedBy?: string;
  receivingDate?: string;
  discrepancyReason?: string;
  originalPaidInvoice?: string;
};

const sum = (l: LineItem[]) => l.reduce((s, x) => s + x.qty * x.unitPrice, 0);

const summitLines: LineItem[] = [
  { description: "Kitchen faucet replacement (Moen 87039)", qty: 1, unitPrice: 189.5 },
  { description: "Shut-off valve replacement", qty: 2, unitPrice: 24.75 },
  { description: "Labor (1.5 hrs @ $106.50/hr)", qty: 1.5, unitPrice: 106.5 },
];

const reliableLines: LineItem[] = [
  { description: "Lawn service visits (April, 4 properties)", qty: 16, unitPrice: 85.0 },
  { description: "Mulch delivery & install (yards)", qty: 12, unitPrice: 95.0 },
];
const reliablePO: LineItem[] = [
  { description: "Lawn service visits (April, 4 properties)", qty: 16, unitPrice: 75.0 },
  { description: "Mulch delivery & install (yards)", qty: 12, unitPrice: 95.0 },
];

const metroLines: LineItem[] = [
  { description: "Panel inspection · 720 Oak St", qty: 1, unitPrice: 185.0 },
  { description: "GFCI outlet replacement", qty: 3, unitPrice: 65.0 },
];

const metroDuplicateLines: LineItem[] = [
  { description: "Panel inspection · 720 Oak St", qty: 1, unitPrice: 185.0 },
  { description: "GFCI outlet replacement", qty: 3, unitPrice: 65.0 },
];

const alliedLines: LineItem[] = [
  { description: "Property liability premium · April", qty: 1, unitPrice: 1850.0 },
];

const hillcrestLines: LineItem[] = [
  { description: "Month 2 of 3 · exterior rehab · 418 Maple", qty: 1, unitPrice: 3410.0 },
];

const pacificLines: LineItem[] = [
  { description: "Quarterly pest service · 40 units", qty: 40, unitPrice: 27.5 },
];

export const invoices: Invoice[] = [
  {
    id: "inv-summit-4821",
    vendorKey: "summit",
    invoiceNumber: "SP-4821",
    issueDate: "2026-04-18",
    dueDate: "2026-05-18",
    poNumber: "PO-1042",
    propertyRef: "Unit 12B · 418 Maple St",
    lines: summitLines,
    total: sum(summitLines),
    suggestedGL: { code: "6120", label: "Repairs & Maintenance" },
    status: "inbox",
    poLines: summitLines,
    poTotal: sum(summitLines),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-04-10",
    receivingSignedBy: "Marcus Hill (Unit 12B tenant)",
    receivingDate: "2026-04-15",
  },
  {
    id: "inv-reliable-2210",
    vendorKey: "reliable",
    invoiceNumber: "RL-2210",
    issueDate: "2026-04-17",
    dueDate: "2026-05-02",
    poNumber: "PO-1055",
    propertyRef: "Portfolio · April grounds service",
    lines: reliableLines,
    total: sum(reliableLines),
    suggestedGL: { code: "6130", label: "Grounds & Landscaping" },
    status: "flagged",
    poLines: reliablePO,
    poTotal: sum(reliablePO),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-03-28",
    discrepancyReason: "Lawn service billed at $85/unit; approved PO is $75/unit. Over-billed by $160.",
  },
  {
    id: "inv-metro-0912",
    vendorKey: "metro",
    invoiceNumber: "ME-0912",
    issueDate: "2026-04-17",
    dueDate: "2026-05-17",
    poNumber: "PO-1061",
    propertyRef: "720 Oak St",
    lines: metroLines,
    total: sum(metroLines),
    suggestedGL: { code: "6140", label: "Electrical Repairs" },
    status: "matched",
    poLines: metroLines,
    poTotal: sum(metroLines),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-04-08",
    receivingSignedBy: "Dana Ortiz, on-site",
    receivingDate: "2026-04-15",
  },
  {
    id: "inv-metro-0912-dup",
    vendorKey: "metro",
    invoiceNumber: "ME-0912",
    issueDate: "2026-04-17",
    dueDate: "2026-05-17",
    poNumber: "PO-1061",
    propertyRef: "720 Oak St",
    lines: metroDuplicateLines,
    total: sum(metroDuplicateLines),
    suggestedGL: { code: "6140", label: "Electrical Repairs" },
    status: "duplicate",
    originalPaidInvoice: "paid 2026-04-12, ref CHK-20418",
  },
  {
    id: "inv-allied-april",
    vendorKey: "allied",
    invoiceNumber: "AI-77301",
    issueDate: "2026-04-15",
    dueDate: "2026-04-25",
    poNumber: "PO-1002",
    propertyRef: "Portfolio · April premium",
    lines: alliedLines,
    total: sum(alliedLines),
    suggestedGL: { code: "6210", label: "Property Insurance" },
    status: "matched",
    poLines: alliedLines,
    poTotal: sum(alliedLines),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-01-02",
  },
  {
    id: "inv-hillcrest-prog",
    vendorKey: "summit",
    invoiceNumber: "SP-4810",
    issueDate: "2026-04-16",
    dueDate: "2026-05-16",
    poNumber: "PO-0987",
    propertyRef: "418 Maple St · exterior rehab",
    lines: hillcrestLines,
    total: sum(hillcrestLines),
    suggestedGL: { code: "6190", label: "Capital Improvements" },
    status: "matched",
    poLines: hillcrestLines,
    poTotal: sum(hillcrestLines),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-02-20",
    receivingSignedBy: "Site photos · Apr 14",
    receivingDate: "2026-04-14",
  },
  {
    id: "inv-pacific-q2",
    vendorKey: "reliable",
    invoiceNumber: "PP-2211",
    issueDate: "2026-04-14",
    dueDate: "2026-05-14",
    poNumber: "PO-0950",
    propertyRef: "Portfolio · Q2 pest service",
    lines: pacificLines,
    total: sum(pacificLines),
    suggestedGL: { code: "6160", label: "Pest & Exterior Services" },
    status: "paid",
    poLines: pacificLines,
    poTotal: sum(pacificLines),
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-01-12",
    receivingSignedBy: "Service logs attached",
    receivingDate: "2026-04-12",
  },
  {
    id: "inv-wilco-0418",
    vendorKey: "summit",
    invoiceNumber: "WC-0418",
    issueDate: "2026-04-16",
    dueDate: "2026-05-16",
    poNumber: "PO-1031",
    propertyRef: "Unit 7A · 412 Birch",
    lines: [{ description: "Water heater replacement", qty: 1, unitPrice: 1284.9 }],
    total: 1284.9,
    suggestedGL: { code: "6120", label: "Repairs & Maintenance" },
    status: "paid",
    poApprovedBy: "Erin Boyd, Property Manager",
    poApprovedOn: "2026-04-05",
  },
  {
    id: "inv-metro-0905",
    vendorKey: "metro",
    invoiceNumber: "ME-0905",
    issueDate: "2026-04-15",
    dueDate: "2026-05-15",
    poNumber: "PO-1052",
    propertyRef: "Unit 3C · 418 Maple",
    lines: [{ description: "Breaker panel upgrade", qty: 1, unitPrice: 1740 }],
    total: 1740,
    suggestedGL: { code: "6140", label: "Electrical Repairs" },
    status: "paid",
  },
  {
    id: "inv-allied-03",
    vendorKey: "allied",
    invoiceNumber: "AI-77228",
    issueDate: "2026-04-12",
    dueDate: "2026-04-22",
    poNumber: "PO-1002",
    propertyRef: "Portfolio · March premium",
    lines: [{ description: "Property liability premium · March", qty: 1, unitPrice: 1850 }],
    total: 1850,
    suggestedGL: { code: "6210", label: "Property Insurance" },
    status: "paid",
  },
  {
    id: "inv-ridgeline",
    vendorKey: "summit",
    invoiceNumber: "RG-2244",
    issueDate: "2026-04-15",
    dueDate: "2026-05-15",
    poNumber: "PO-1064",
    propertyRef: "Unit 9B · 205 Cedar",
    lines: [{ description: "Roof patch and flashing repair", qty: 1, unitPrice: 825 }],
    total: 825,
    suggestedGL: { code: "6120", label: "Repairs & Maintenance" },
    status: "paid",
  },
  {
    id: "inv-glendale-cleaning",
    vendorKey: "reliable",
    invoiceNumber: "GC-0410",
    issueDate: "2026-04-14",
    dueDate: "2026-05-14",
    poNumber: "PO-0999",
    propertyRef: "Portfolio · common-area cleaning",
    lines: [{ description: "Weekly common-area cleaning · April", qty: 4, unitPrice: 185 }],
    total: 740,
    suggestedGL: { code: "6150", label: "Cleaning & Janitorial" },
    status: "matched",
  },
];

export const emails: EmailThread[] = [
  {
    id: "em-summit",
    fromName: "Summit Plumbing Billing",
    fromEmail: "billing@summitplumbing.com",
    subject: "Invoice SP-4821 · Unit 12B faucet + service",
    snippet: "Attached invoice for the recent work completed at 418 Maple St, Unit 12B.",
    bodyParagraphs: [
      "Hi Greenfield team,",
      "Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement, two shut-off valves, and 1.5 hours of service time.",
      "Let me know if you need a W-9 refresh for the year. Payment terms are Net 30 as always.",
      "Thanks,",
      "Summit Plumbing · Billing",
    ],
    receivedAt: "7:58 AM",
    attachment: { name: "SP-4821.pdf", pages: 1 },
    invoiceId: "inv-summit-4821",
    unread: true,
  },
  {
    id: "em-reliable",
    fromName: "Reliable Landscaping",
    fromEmail: "accounts@reliablelandscaping.com",
    subject: "April invoice · portfolio grounds service",
    snippet: "Please find April service invoice attached for processing.",
    bodyParagraphs: [
      "Hi,",
      "Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on for the Maple and Oak properties.",
      "Our updated rate is reflected in this invoice.",
      "Reliable Landscaping",
    ],
    receivedAt: "7:42 AM",
    attachment: { name: "RL-2210.pdf", pages: 2 },
    invoiceId: "inv-reliable-2210",
    captured: true,
  },
  {
    id: "em-metro",
    fromName: "Metro Electric · AR",
    fromEmail: "ar@metroelectric.com",
    subject: "Invoice ME-0912 · 720 Oak panel + outlets",
    snippet: "Panel inspection and GFCI replacements at 720 Oak.",
    bodyParagraphs: [
      "Greenfield AP,",
      "Attached invoice ME-0912 for the recent panel inspection and GFCI outlet replacements at 720 Oak St.",
      "Metro Electric",
    ],
    receivedAt: "6:51 AM",
    attachment: { name: "ME-0912.pdf", pages: 1 },
    invoiceId: "inv-metro-0912",
    captured: true,
  },
  {
    id: "em-metro-dup",
    fromName: "Metro Electric · AR",
    fromEmail: "ar@metroelectric.com",
    subject: "Re: Invoice ME-0912 · please confirm receipt",
    snippet: "Resending invoice in case the first one bounced.",
    bodyParagraphs: [
      "Hi team,",
      "Resending invoice ME-0912 in case the earlier copy didn't come through. Please confirm receipt.",
      "Metro Electric",
    ],
    receivedAt: "6:54 AM",
    attachment: { name: "ME-0912.pdf", pages: 1 },
    invoiceId: "inv-metro-0912-dup",
    captured: true,
  },
  {
    id: "em-allied",
    fromName: "Allied Insurance",
    fromEmail: "billing@alliedins.com",
    subject: "April premium invoice · policy AI-77301",
    snippet: "Monthly property liability premium invoice attached.",
    bodyParagraphs: [
      "Hello,",
      "Attached is your April property liability premium invoice. Due by the 25th as agreed in your policy schedule.",
      "Allied Insurance Billing",
    ],
    receivedAt: "6:30 AM",
    attachment: { name: "AI-77301.pdf", pages: 1 },
    invoiceId: "inv-allied-april",
    captured: true,
  },
  {
    id: "em-hillcrest",
    fromName: "Hillcrest Builders",
    fromEmail: "progress@hillcrestbuilders.com",
    subject: "Progress invoice · 418 Maple exterior · month 2 of 3",
    snippet: "Photos and sign-offs attached for month 2 progress payment.",
    bodyParagraphs: [
      "Hi Erin,",
      "Month 2 of the 418 Maple exterior rehab is complete. Progress photos and sign-offs attached along with invoice SP-4810.",
      "Third and final progress invoice will come at punch-list walk.",
      "Hillcrest Builders",
    ],
    receivedAt: "6:12 AM",
    attachment: { name: "SP-4810.pdf", pages: 5 },
    invoiceId: "inv-hillcrest-prog",
    captured: true,
  },
  {
    id: "em-pacific",
    fromName: "Pacific Pest Control",
    fromEmail: "invoices@pacificpest.com",
    subject: "Q2 service · all properties",
    snippet: "Q2 service completed across all 40 units.",
    bodyParagraphs: [
      "Hi,",
      "Q2 service completed across all 40 units. Invoice PP-2211 attached, service logs included.",
      "Pacific Pest Control",
    ],
    receivedAt: "Yesterday",
    attachment: { name: "PP-2211.pdf", pages: 3 },
    invoiceId: "inv-pacific-q2",
    captured: true,
  },
  {
    id: "em-erin",
    fromName: "Erin Boyd",
    fromEmail: "erin@greenfieldpm.com",
    subject: "Re: Unit 12B move-in Saturday",
    snippet: "Confirmed for Saturday. Summit scheduled the faucet install Friday.",
    bodyParagraphs: [
      "Hi all,",
      "Confirmed move-in for Saturday. Summit Plumbing has the faucet install on Friday so we should be clear.",
      "Erin",
    ],
    receivedAt: "Yesterday",
  },
  {
    id: "em-newsletter",
    fromName: "Property Manager Weekly",
    fromEmail: "hello@pmweekly.com",
    subject: "5 tax deadlines you're about to miss",
    snippet: "Quick refresher on Q2 federal, state, and insurance filings.",
    bodyParagraphs: [
      "Quick refresher on Q2 federal, state, and insurance filings. Nothing too scary.",
    ],
    receivedAt: "Yesterday",
  },
];

// -------- AP aging --------

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export type AgingRow = {
  invoiceNumber: string;
  vendorKey: keyof typeof vendors;
  amount: number;
  issueDate: string;
  dueDate: string;
  daysPastDue: number;
  bucket: AgingBucket;
  note?: string;
};

export const agingReport: AgingRow[] = [
  { invoiceNumber: "SP-4821", vendorKey: "summit", amount: 399, issueDate: "2026-04-18", dueDate: "2026-05-18", daysPastDue: -30, bucket: "current" },
  { invoiceNumber: "AI-77301", vendorKey: "allied", amount: 1850, issueDate: "2026-04-15", dueDate: "2026-04-25", daysPastDue: -7, bucket: "current" },
  { invoiceNumber: "SP-4810", vendorKey: "summit", amount: 3410, issueDate: "2026-04-16", dueDate: "2026-05-16", daysPastDue: -28, bucket: "current" },
  { invoiceNumber: "GC-0410", vendorKey: "reliable", amount: 740, issueDate: "2026-04-14", dueDate: "2026-05-14", daysPastDue: -26, bucket: "current" },
  { invoiceNumber: "SP-4780", vendorKey: "summit", amount: 612, issueDate: "2026-03-20", dueDate: "2026-04-04", daysPastDue: 14, bucket: "1-30", note: "Invoice on hold pending property manager approval." },
  { invoiceNumber: "ME-0881", vendorKey: "metro", amount: 1240, issueDate: "2026-03-12", dueDate: "2026-04-11", daysPastDue: 7, bucket: "1-30" },
  { invoiceNumber: "RL-2195", vendorKey: "reliable", amount: 1320, issueDate: "2026-02-28", dueDate: "2026-03-15", daysPastDue: 34, bucket: "31-60", note: "Waiting on revised invoice." },
  { invoiceNumber: "SP-4012", vendorKey: "summit", amount: 2100, issueDate: "2026-02-10", dueDate: "2026-03-12", daysPastDue: 37, bucket: "31-60" },
  { invoiceNumber: "AI-77182", vendorKey: "allied", amount: 1850, issueDate: "2026-01-30", dueDate: "2026-02-10", daysPastDue: 67, bucket: "61-90", note: "Auto-reminder sent to Allied on 2026-04-10." },
  { invoiceNumber: "PP-2198", vendorKey: "reliable", amount: 1115, issueDate: "2025-12-20", dueDate: "2026-01-19", daysPastDue: 89, bucket: "61-90" },
  { invoiceNumber: "ME-0710", vendorKey: "metro", amount: 4280, issueDate: "2025-10-15", dueDate: "2025-11-14", daysPastDue: 155, bucket: "90+", note: "Disputed. Vendor rejected discrepancy reply; legal CC'd." },
];

// -------- Vendor statements reconciliation --------

export type StatementLine = {
  invoiceNumber: string;
  date: string;
  amount: number;
  reconciled: "matched" | "missing_on_our_side" | "missing_on_their_side";
};

export type VendorStatement = {
  id: string;
  vendorKey: keyof typeof vendors;
  statementNumber: string;
  periodEnd: string;
  theirTotal: number;
  ourTotal: number;
  status: "reconciled" | "variance" | "pending";
  receivedOn: string;
  lines: StatementLine[];
  note?: string;
};

export const statements: VendorStatement[] = [
  {
    id: "stmt-summit-apr",
    vendorKey: "summit",
    statementNumber: "STMT-SP-2026-04",
    periodEnd: "2026-04-15",
    theirTotal: 8492.4,
    ourTotal: 8492.4,
    status: "reconciled",
    receivedOn: "2026-04-16",
    lines: [
      { invoiceNumber: "SP-4732", date: "2026-04-02", amount: 412.0, reconciled: "matched" },
      { invoiceNumber: "SP-4780", date: "2026-03-20", amount: 612.0, reconciled: "matched" },
      { invoiceNumber: "SP-4821", date: "2026-04-18", amount: 399.0, reconciled: "matched" },
    ],
  },
  {
    id: "stmt-reliable-apr",
    vendorKey: "reliable",
    statementNumber: "STMT-RL-2026-04",
    periodEnd: "2026-04-15",
    theirTotal: 4820.0,
    ourTotal: 4480.0,
    status: "variance",
    receivedOn: "2026-04-17",
    lines: [
      { invoiceNumber: "RL-2210", date: "2026-04-17", amount: 2500.0, reconciled: "matched" },
      { invoiceNumber: "GC-0410", date: "2026-04-14", amount: 740.0, reconciled: "matched" },
      { invoiceNumber: "RL-2175", date: "2026-03-18", amount: 1240.0, reconciled: "matched" },
      { invoiceNumber: "RL-2203", date: "2026-04-09", amount: 340.0, reconciled: "missing_on_our_side" },
    ],
    note: "RL-2203 appears on their statement but not in our posted invoices. Agent asked Reliable for the original invoice PDF.",
  },
  {
    id: "stmt-metro-apr",
    vendorKey: "metro",
    statementNumber: "STMT-ME-2026-04",
    periodEnd: "2026-04-15",
    theirTotal: 3180.0,
    ourTotal: 3180.0,
    status: "pending",
    receivedOn: "2026-04-18",
    lines: [
      { invoiceNumber: "ME-0881", date: "2026-03-12", amount: 1240.0, reconciled: "matched" },
      { invoiceNumber: "ME-0905", date: "2026-04-15", amount: 1740.0, reconciled: "matched" },
      { invoiceNumber: "ME-0912", date: "2026-04-17", amount: 380.0, reconciled: "matched" },
    ],
    note: "Awaiting end-of-day QuickBooks sync before marking reconciled.",
  },
];

// -------- Vendor tax compliance (W-9 & 1099) --------

export type VendorCompliance = {
  vendorKey: keyof typeof vendors;
  entityType: "LLC" | "Sole Prop" | "C-Corp" | "S-Corp" | "Individual";
  w9OnFile: boolean;
  w9CollectedOn?: string;
  w9ExpiresOn?: string;
  taxIdMasked: string;
  is1099Eligible: boolean;
  ytdPaid: number;
  status1099: "ready" | "threshold_watch" | "not_required" | "missing_info";
};

export const vendorCompliance: VendorCompliance[] = [
  {
    vendorKey: "summit",
    entityType: "LLC",
    w9OnFile: true,
    w9CollectedOn: "2025-11-12",
    w9ExpiresOn: "2027-11-12",
    taxIdMasked: "XX-XXX4821",
    is1099Eligible: true,
    ytdPaid: 24812.65,
    status1099: "ready",
  },
  {
    vendorKey: "reliable",
    entityType: "Sole Prop",
    w9OnFile: true,
    w9CollectedOn: "2025-10-03",
    w9ExpiresOn: "2027-10-03",
    taxIdMasked: "XXX-XX-1155",
    is1099Eligible: true,
    ytdPaid: 18620.0,
    status1099: "ready",
  },
  {
    vendorKey: "metro",
    entityType: "LLC",
    w9OnFile: false,
    taxIdMasked: "pending",
    is1099Eligible: true,
    ytdPaid: 9845.0,
    status1099: "missing_info",
  },
  {
    vendorKey: "allied",
    entityType: "C-Corp",
    w9OnFile: true,
    w9CollectedOn: "2026-01-02",
    w9ExpiresOn: "2028-01-02",
    taxIdMasked: "XX-XXX0998",
    is1099Eligible: false,
    ytdPaid: 7400.0,
    status1099: "not_required",
  },
];

// -------- Credit card reconciliation --------

export type CardTransaction = {
  id: string;
  postedAt: string;
  cardholder: string;
  last4: string;
  merchant: string;
  amount: number;
  category: string;
  status: "matched" | "missing_receipt" | "coded_auto" | "flagged";
  matchedTo?: string;
  note?: string;
};

export const cardTransactions: CardTransaction[] = [
  { id: "ct-1", postedAt: "2026-04-17", cardholder: "Erin Boyd", last4: "4411", merchant: "Home Depot", amount: 184.22, category: "6120 · Repairs", status: "matched", matchedTo: "Receipt HD-4491" },
  { id: "ct-2", postedAt: "2026-04-17", cardholder: "Dana Ortiz", last4: "2073", merchant: "Uber", amount: 22.5, category: "6170 · Travel", status: "coded_auto", note: "Auto-coded by vendor history." },
  { id: "ct-3", postedAt: "2026-04-16", cardholder: "Erin Boyd", last4: "4411", merchant: "Staples", amount: 67.9, category: "6220 · Office Supplies", status: "missing_receipt", note: "Agent emailed Erin a reminder to upload the receipt." },
  { id: "ct-4", postedAt: "2026-04-16", cardholder: "Marcus Hill", last4: "8802", merchant: "Lowes", amount: 312.85, category: "6120 · Repairs", status: "matched", matchedTo: "Receipt LOW-22811" },
  { id: "ct-5", postedAt: "2026-04-15", cardholder: "Erin Boyd", last4: "4411", merchant: "Amazon Business", amount: 98.15, category: "6220 · Office Supplies", status: "coded_auto" },
  { id: "ct-6", postedAt: "2026-04-15", cardholder: "Dana Ortiz", last4: "2073", merchant: "Shell", amount: 64.8, category: "6170 · Travel", status: "flagged", note: "Duplicate of card txn 2026-04-14. Confirming with cardholder before posting." },
];

// -------- Employee expense reports --------

export type ExpenseReport = {
  id: string;
  employee: string;
  periodEnd: string;
  items: number;
  total: number;
  status: "submitted" | "needs_receipt" | "approved" | "reimbursed";
  note?: string;
  categoryBreakdown: { label: string; amount: number }[];
};

export const expenseReports: ExpenseReport[] = [
  {
    id: "er-dana-apr1",
    employee: "Dana Ortiz",
    periodEnd: "2026-04-12",
    items: 7,
    total: 312.45,
    status: "approved",
    categoryBreakdown: [
      { label: "Travel", amount: 180.5 },
      { label: "Property supplies", amount: 131.95 },
    ],
  },
  {
    id: "er-marcus-apr",
    employee: "Marcus Hill (contractor)",
    periodEnd: "2026-04-14",
    items: 4,
    total: 420.1,
    status: "reimbursed",
    categoryBreakdown: [
      { label: "Repair materials", amount: 420.1 },
    ],
  },
  {
    id: "er-erin-apr2",
    employee: "Erin Boyd",
    periodEnd: "2026-04-18",
    items: 12,
    total: 889.4,
    status: "submitted",
    note: "Agent pre-coded all items. Waiting on owner approval.",
    categoryBreakdown: [
      { label: "Travel", amount: 310.25 },
      { label: "Meals · client", amount: 98.15 },
      { label: "Office supplies", amount: 166.0 },
      { label: "Repair materials", amount: 315.0 },
    ],
  },
  {
    id: "er-dana-apr2",
    employee: "Dana Ortiz",
    periodEnd: "2026-04-18",
    items: 3,
    total: 142.3,
    status: "needs_receipt",
    note: "Missing receipt for Shell $64.80 fuel on 2026-04-15.",
    categoryBreakdown: [
      { label: "Travel", amount: 87.3 },
      { label: "Property supplies", amount: 55.0 },
    ],
  },
];

// -------- Month-end close --------

export type CloseTask = {
  id: string;
  title: string;
  owner: "pilot" | "erin";
  status: "done" | "ready" | "waiting";
  sub?: string;
};

// -------- Agent outbox (sent + drafted) --------

export type OutboxCategory =
  | "vendor_followup"
  | "w9_request"
  | "receipt_request"
  | "statement_recon"
  | "aging_reminder"
  | "internal_notify";

export type OutboxItem = {
  id: string;
  sentAt: string; // ISO-ish date-time for display
  category: OutboxCategory;
  to: string;
  toName: string;
  subject: string;
  bodyPreview: string;
  status: "sent" | "drafted" | "awaiting_reply" | "replied";
  relatesTo?: string; // invoice / statement / card txn reference
};

export const outbox: OutboxItem[] = [
  {
    id: "ob-1",
    sentAt: "2026-04-18 02:16 AM",
    category: "vendor_followup",
    to: "accounts@reliablelandscaping.com",
    toName: "Reliable Landscaping",
    subject: "Invoice RL-2210 pricing vs PO-1055",
    bodyPreview: "Hi Reliable Landscaping team, line 1 is billed at $85/unit but our approved PO shows $75/unit…",
    status: "awaiting_reply",
    relatesTo: "RL-2210",
  },
  {
    id: "ob-2",
    sentAt: "2026-04-18 02:17 AM",
    category: "vendor_followup",
    to: "ar@metroelectric.com",
    toName: "Metro Electric",
    subject: "ME-0912 already paid on 2026-04-12",
    bodyPreview: "Thanks for the follow-up. Invoice ME-0912 was paid on 2026-04-12, ref CHK-20418. Nothing more needed…",
    status: "sent",
    relatesTo: "ME-0912 (duplicate)",
  },
  {
    id: "ob-3",
    sentAt: "2026-04-18 02:22 AM",
    category: "receipt_request",
    to: "erin@greenfieldpm.com",
    toName: "Erin Boyd",
    subject: "Receipt needed: Staples $67.90 on 2026-04-16",
    bodyPreview: "Your Chase Ink ending 4411 posted a $67.90 Staples charge on 2026-04-16 with no receipt on file…",
    status: "awaiting_reply",
    relatesTo: "Card txn ct-3",
  },
  {
    id: "ob-4",
    sentAt: "2026-04-17 04:02 AM",
    category: "statement_recon",
    to: "billing@summitplumbing.com",
    toName: "Summit Plumbing",
    subject: "April statement reconciled · thank you",
    bodyPreview: "Quick confirmation that your April statement (STMT-SP-2026-04) reconciles line-for-line with our books…",
    status: "sent",
    relatesTo: "STMT-SP-2026-04",
  },
  {
    id: "ob-5",
    sentAt: "2026-04-17 04:08 AM",
    category: "statement_recon",
    to: "accounts@reliablelandscaping.com",
    toName: "Reliable Landscaping",
    subject: "Missing invoice RL-2203 on April statement",
    bodyPreview: "Your April statement includes RL-2203 ($340) that we don't have on file. Can you send the original PDF?",
    status: "awaiting_reply",
    relatesTo: "STMT-RL-2026-04",
  },
  {
    id: "ob-6",
    sentAt: "2026-04-16 05:30 AM",
    category: "w9_request",
    to: "ar@metroelectric.com",
    toName: "Metro Electric",
    subject: "W-9 needed for 2026 records",
    bodyPreview: "Quick ask: we don't have a current W-9 on file for Metro Electric. Could you send one over when you get a chance?",
    status: "awaiting_reply",
    relatesTo: "Metro Electric",
  },
  {
    id: "ob-7",
    sentAt: "2026-04-15 06:45 AM",
    category: "aging_reminder",
    to: "billing@alliedins.com",
    toName: "Allied Insurance",
    subject: "Reminder · invoice AI-77182 past due",
    bodyPreview: "Friendly reminder that AI-77182 ($1,850) is 67 days past due. Can we align on a payment date?",
    status: "replied",
    relatesTo: "AI-77182",
  },
  {
    id: "ob-8",
    sentAt: "2026-04-14 05:55 AM",
    category: "aging_reminder",
    to: "ar@metroelectric.com",
    toName: "Metro Electric",
    subject: "Escalation · ME-0710 (155 days past due)",
    bodyPreview: "We need to resolve ME-0710 before month-end. CC'ing Erin as property manager on file. Please confirm next step…",
    status: "awaiting_reply",
    relatesTo: "ME-0710",
  },
  {
    id: "ob-9",
    sentAt: "2026-04-18 06:15 AM",
    category: "internal_notify",
    to: "erin@greenfieldpm.com",
    toName: "Erin Boyd",
    subject: "Morning digest · 11 invoices processed overnight",
    bodyPreview: "Good morning. Overnight I matched 10 invoices, flagged 1 pricing mismatch, and blocked 1 duplicate…",
    status: "sent",
    relatesTo: "Daily digest",
  },
  {
    id: "ob-10",
    sentAt: "2026-04-12 05:40 AM",
    category: "vendor_followup",
    to: "progress@hillcrestbuilders.com",
    toName: "Hillcrest Builders",
    subject: "Need receiving sign-off for SP-4810",
    bodyPreview: "We're ready to process month 2 progress invoice. Can you forward the signed receiving doc for our files?",
    status: "replied",
    relatesTo: "SP-4810",
  },
];

// -------- Month-end close --------

export const monthEnd = {
  periodEnd: "2026-04-30",
  daysRemaining: 12,
  tasks: [
    { id: "me-1", title: "Post all captured invoices to GL", owner: "pilot", status: "done", sub: "11 of 11 processed through today." },
    { id: "me-2", title: "Three-way match coverage check", owner: "pilot", status: "done", sub: "All matched invoices have a PO and signed receiving." },
    { id: "me-3", title: "Vendor statement reconciliation", owner: "pilot", status: "ready", sub: "Summit reconciled. Reliable variance of $340 awaiting vendor reply." },
    { id: "me-4", title: "Review flagged discrepancies", owner: "erin", status: "waiting", sub: "1 pricing mismatch (Reliable RL-2210)." },
    { id: "me-5", title: "Credit card batch recon", owner: "pilot", status: "ready", sub: "1 missing receipt, 1 flagged duplicate." },
    { id: "me-6", title: "Accruals for unreceived invoices", owner: "pilot", status: "waiting", sub: "Draft accrual entries auto-posted at 26th." },
    { id: "me-7", title: "AP aging review with owner", owner: "erin", status: "waiting", sub: "Meeting on 2026-04-27." },
    { id: "me-8", title: "Final QuickBooks sync & close", owner: "pilot", status: "waiting", sub: "Triggered after owner approves aging review." },
  ] as CloseTask[],
};
