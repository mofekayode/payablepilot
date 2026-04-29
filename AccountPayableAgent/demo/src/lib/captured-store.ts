// Captured-invoice store. Holds invoices the user has extracted from Gmail or
// uploaded manually, persisted in localStorage so refreshing doesn't lose state.
// Production swap target: a database keyed by (workspaceId, captured_id).

export type CapturedStatus = "extracted" | "ready" | "posted" | "error";

export type CapturedSource =
  | { kind: "gmail"; messageId: string; attachmentId: string; fromEmail: string; fromName: string; subject: string }
  | { kind: "upload"; fileName: string; sizeKb: number };

export type CapturedLineItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  projectRef: string | null;
};

export type CapturedInvoice = {
  id: string;
  createdAt: string; // ISO
  status: CapturedStatus;
  source: CapturedSource;

  // Pulled from Claude vision extraction.
  vendorName: string | null;
  vendorEmail: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  poNumber: string | null;
  projectRefRaw: string | null; // The project label Claude saw on the invoice.
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  lines: CapturedLineItem[];

  // User-mapped to QBO. Each picker tracks whether the agent auto-filled it
  // ("auto") or the user overrode ("manual"). Used to surface "Auto-coded"
  // badges and to know whether a re-extraction should re-run auto-fill.
  qboVendorId: string | null;
  qboVendorName: string | null;
  qboVendorSource: "auto" | "manual" | null;
  qboProjectId: string | null;
  qboProjectName: string | null;
  // "auto" — matched an existing QBO project. "created" — PayablePilot
  // created this project in QBO because the invoice mentioned one that didn't
  // exist yet. "manual" — user picked it themselves.
  qboProjectSource: "auto" | "created" | "manual" | null;
  qboAccountId: string | null;
  qboAccountName: string | null;
  qboAccountSource: "auto" | "manual" | null;

  // Posting result.
  qboBillId: string | null;
  postedAt: string | null;
  errorMessage: string | null;

  // Duplicate-detection cache. Set when we've found an existing bill in QBO
  // matching (vendorId, invoiceNumber). Posting is blocked while this is set.
  duplicateOfBillId: string | null;
};

const KEY = "pp_captured_v1";

export function loadCaptured(): CapturedInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CapturedInvoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCaptured(items: CapturedInvoice[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  // Notify other components in the same tab.
  window.dispatchEvent(new CustomEvent("pp:captured:changed"));
}

export function addCaptured(item: CapturedInvoice) {
  const items = loadCaptured();
  saveCaptured([item, ...items]);
}

export function updateCaptured(id: string, patch: Partial<CapturedInvoice>) {
  const items = loadCaptured();
  saveCaptured(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
}

export function removeCaptured(id: string) {
  const items = loadCaptured();
  saveCaptured(items.filter((it) => it.id !== id));
}

export function newCaptured(): { id: string; createdAt: string } {
  return {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}
