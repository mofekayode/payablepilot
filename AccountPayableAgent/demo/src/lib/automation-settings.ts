// Per-tenant automation preferences. For the demo these live in localStorage —
// production would persist server-side and gate agent runs against them.

export type AutomationKey =
  | "autoExtractFields"
  | "autoMatchPOs"
  | "autoBlockDuplicates"
  | "autoReplyDiscrepancies"
  | "autoChaseReceipts"
  | "autoChaseW9"
  | "autoRemindOverdue"
  | "autoReconcileStatements"
  | "autoPostToQuickBooks"
  | "sendDailyDigest"
  | "notifyOnDiscrepancies";

export type WorkflowStyle = "strict" | "standard" | "bills_only";

export type AutomationSettings = Record<AutomationKey, boolean> & {
  digestTime: string; // HH:MM 24h
  // Per-tenant workflow style. SMB / trades default to "standard".
  // strict     = POs required, full 3-way match before posting.
  // standard   = POs optional. Match if the bookkeeper provides a PO, otherwise post directly.
  // bills_only = no matching step at all. Captured invoices flow straight to "ready to post".
  workflowStyle: WorkflowStyle;
};

export const DEFAULT_AUTOMATION: AutomationSettings = {
  // Always-safe: read & process inbound work.
  autoExtractFields: true,
  autoMatchPOs: true,
  autoBlockDuplicates: true,

  // Outbound communication: opinionated defaults but easy to tune.
  autoReplyDiscrepancies: false,
  autoChaseReceipts: true,
  autoChaseW9: true,
  autoRemindOverdue: true,
  autoReconcileStatements: true,

  // Posting to books: off by default — humans authorize.
  autoPostToQuickBooks: false,

  // Notifications.
  sendDailyDigest: true,
  notifyOnDiscrepancies: true,

  digestTime: "08:00",

  // SMB-friendly default. Bookkeepers without formal POs get less friction.
  workflowStyle: "standard",
};

const KEY = "pp_automation";

export function loadAutomation(): AutomationSettings {
  if (typeof window === "undefined") return DEFAULT_AUTOMATION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUTOMATION;
    const parsed = JSON.parse(raw) as Partial<AutomationSettings>;
    return { ...DEFAULT_AUTOMATION, ...parsed };
  } catch {
    return DEFAULT_AUTOMATION;
  }
}

export function saveAutomation(settings: AutomationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}
