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

// Hydrate the store from /api/bills (the DB-backed source of truth).
// Merges DB rows with any in-flight local mutations: existing local
// items keep the user's qbo* picks and statuses, but get refreshed
// extracted fields and posted_at / qbo_bill_id from the server.
//
// New DB rows that aren't in localStorage yet get added so the user
// sees newly arrived/extracted invoices in the queue.
//
// Local-only items (e.g. manual uploads not yet synced to the DB)
// are preserved.
type DbExtractedLineItem = {
  description?: string;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
  project_ref?: string | null;
};
type DbExtractedFields = {
  vendor_name?: string | null;
  vendor_email?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  po_number?: string | null;
  project_ref?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;
  line_items?: DbExtractedLineItem[];
};
type DbBill = {
  id: string;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  receivedAt: string | null;
  extractionStatus: "pending" | "extracting" | "done" | "failed" | "skipped";
  extractionError: string | null;
  extractedFields: DbExtractedFields | null;
  postedAt: string | null;
  qboBillId: string | null;
  qboVendorId: string | null;
  qboProjectId: string | null;
  postingError: string | null;
};

function dbRowToCaptured(row: DbBill): CapturedInvoice {
  const f = row.extractedFields ?? {};
  return {
    id: row.id,
    createdAt: row.receivedAt ?? new Date().toISOString(),
    status: row.postedAt ? "posted" : row.postingError ? "error" : row.extractionStatus === "done" ? "ready" : "extracted",
    source: {
      kind: "gmail",
      messageId: row.id,
      attachmentId: "",
      fromEmail: row.fromEmail ?? "",
      fromName: row.fromName ?? row.fromEmail ?? "",
      subject: row.subject ?? "",
    },
    vendorName: f.vendor_name ?? null,
    vendorEmail: f.vendor_email ?? null,
    invoiceNumber: f.invoice_number ?? null,
    issueDate: f.issue_date ?? null,
    dueDate: f.due_date ?? null,
    poNumber: f.po_number ?? null,
    projectRefRaw: f.project_ref ?? null,
    subtotal: f.subtotal ?? null,
    tax: f.tax ?? null,
    total: f.total ?? null,
    currency: f.currency ?? null,
    lines: (f.line_items ?? []).map((l) => ({
      description: l.description ?? "",
      quantity: l.quantity ?? null,
      unitPrice: l.unit_price ?? null,
      amount: l.amount ?? null,
      projectRef: l.project_ref ?? null,
    })),
    qboVendorId: row.qboVendorId,
    qboVendorName: null,
    qboVendorSource: row.qboVendorId ? "auto" : null,
    qboProjectId: row.qboProjectId,
    qboProjectName: null,
    qboProjectSource: row.qboProjectId ? "auto" : null,
    qboAccountId: null,
    qboAccountName: null,
    qboAccountSource: null,
    qboBillId: row.qboBillId,
    postedAt: row.postedAt,
    errorMessage: row.postingError ?? row.extractionError ?? null,
    duplicateOfBillId: null,
  };
}

export async function hydrateFromDb(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/bills", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { bills: DbBill[] };
    const dbRows = data.bills ?? [];
    const localItems = loadCaptured();
    const localById = new Map(localItems.map((it) => [it.id, it]));

    const merged: CapturedInvoice[] = [];
    for (const row of dbRows) {
      const existing = localById.get(row.id);
      if (existing) {
        const fromDb = dbRowToCaptured(row);
        merged.push({
          ...existing,
          // Refresh extraction-side fields from the DB.
          vendorName: fromDb.vendorName ?? existing.vendorName,
          vendorEmail: fromDb.vendorEmail ?? existing.vendorEmail,
          invoiceNumber: fromDb.invoiceNumber ?? existing.invoiceNumber,
          issueDate: fromDb.issueDate ?? existing.issueDate,
          dueDate: fromDb.dueDate ?? existing.dueDate,
          poNumber: fromDb.poNumber ?? existing.poNumber,
          projectRefRaw: fromDb.projectRefRaw ?? existing.projectRefRaw,
          subtotal: fromDb.subtotal ?? existing.subtotal,
          tax: fromDb.tax ?? existing.tax,
          total: fromDb.total ?? existing.total,
          currency: fromDb.currency ?? existing.currency,
          lines: fromDb.lines.length > 0 ? fromDb.lines : existing.lines,
          // DB always wins for posted_at / qboBillId since that's the
          // server-of-record after a successful Post.
          status: row.postedAt ? "posted" : existing.status,
          qboBillId: row.qboBillId ?? existing.qboBillId,
          postedAt: row.postedAt ?? existing.postedAt,
          errorMessage: row.postingError ?? row.extractionError ?? existing.errorMessage,
        });
      } else {
        merged.push(dbRowToCaptured(row));
      }
      localById.delete(row.id);
    }
    // Anything still in localById is local-only (manual upload not in DB).
    for (const orphan of localById.values()) {
      merged.push(orphan);
    }

    saveCaptured(merged);
  } catch (e) {
    console.error("[captured-store] hydrateFromDb failed:", e);
  }
}
