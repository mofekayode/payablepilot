"use client";
import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { emails, invoices, Invoice, EmailThread, InvoiceStatus, vendors } from "./app-data";

function guessInvoiceFromFileName(fileName: string): { vendorKey: keyof typeof vendors; invoiceNumber: string } {
  const lower = fileName.toLowerCase();
  let vendorKey: keyof typeof vendors = "summit";
  if (/reli|landscap|grounds/.test(lower)) vendorKey = "reliable";
  else if (/metro|electric/.test(lower)) vendorKey = "metro";
  else if (/allied|insur/.test(lower)) vendorKey = "allied";
  const stem = fileName.replace(/\.[^.]+$/, "").slice(0, 24);
  return { vendorKey, invoiceNumber: stem || `MANUAL-${Date.now().toString().slice(-5)}` };
}

type State = {
  emails: EmailThread[];
  invoices: Invoice[];
  toast: string | null;
  arrivingEmailId: string | null;
};

type Action =
  | { type: "READ_EMAIL"; id: string }
  | { type: "CAPTURE"; emailId: string }
  | { type: "UPLOAD_INVOICE"; fileName: string; sizeKb: number }
  | { type: "SET_STATUS"; invoiceId: string; status: InvoiceStatus }
  | { type: "SET_PROJECT"; invoiceId: string; projectId: string | null; projectName: string | null }
  | { type: "APPROVE_BATCH" }
  | { type: "TOAST"; message: string | null }
  | { type: "ARRIVING"; emailId: string | null }
  | { type: "RESET_DEMO" };

const initial: State = {
  emails: emails.map((e) => ({ ...e })),
  invoices: invoices.map((i) => ({ ...i })),
  toast: null,
  arrivingEmailId: null,
};

// IDs the demo cascades will reset when the composer fires.
const DEMO_INVOICE_IDS = new Set(["inv-summit-4821", "inv-reliable-2210"]);
const DEMO_EMAIL_IDS = new Set(["em-summit", "em-reliable"]);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "READ_EMAIL":
      return {
        ...state,
        emails: state.emails.map((e) => (e.id === action.id ? { ...e, unread: false, readable: true } : e)),
      };
    case "CAPTURE": {
      const email = state.emails.find((e) => e.id === action.emailId);
      if (!email?.invoiceId) return state;
      const invoiceId = email.invoiceId;
      return {
        ...state,
        toast: `Captured ${email.attachment?.name ?? "invoice"} to PayablePilot`,
        emails: state.emails.map((e) => (e.id === action.emailId ? { ...e, captured: true, unread: false } : e)),
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId && inv.status === "inbox" ? { ...inv, status: "captured" as InvoiceStatus } : inv
        ),
      };
    }
    case "UPLOAD_INVOICE": {
      const id = `inv-upload-${Date.now()}`;
      const guess = guessInvoiceFromFileName(action.fileName);
      const newInvoice: Invoice = {
        id,
        vendorKey: guess.vendorKey,
        invoiceNumber: guess.invoiceNumber,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        poNumber: "—",
        propertyRef: "Pending review",
        lines: [
          { description: `From upload (${action.fileName})`, qty: 1, unitPrice: 0 },
        ],
        total: 0,
        suggestedGL: { code: "—", label: "Awaiting extraction" },
        status: "captured",
        note: `Manually uploaded · ${action.sizeKb} KB · OCR running`,
      };
      return {
        ...state,
        toast: `Uploaded ${action.fileName} · extracting fields…`,
        invoices: [newInvoice, ...state.invoices],
      };
    }
    case "SET_STATUS":
      return {
        ...state,
        invoices: state.invoices.map((inv) => (inv.id === action.invoiceId ? { ...inv, status: action.status } : inv)),
      };
    case "SET_PROJECT":
      return {
        ...state,
        invoices: state.invoices.map((inv) =>
          inv.id === action.invoiceId
            ? {
                ...inv,
                projectId: action.projectId ?? undefined,
                projectName: action.projectName ?? undefined,
              }
            : inv
        ),
      };
    case "APPROVE_BATCH":
      return {
        ...state,
        invoices: state.invoices.map((inv) => (inv.status === "matched" ? { ...inv, status: "paid" as InvoiceStatus } : inv)),
        toast: "Bills posted to QuickBooks",
      };
    case "TOAST":
      return { ...state, toast: action.message };
    case "ARRIVING":
      return { ...state, arrivingEmailId: action.emailId };
    case "RESET_DEMO":
      return {
        ...state,
        emails: state.emails.map((e) =>
          DEMO_EMAIL_IDS.has(e.id) ? { ...e, captured: false, unread: true, readable: false } : e
        ),
        invoices: state.invoices.map((inv) =>
          DEMO_INVOICE_IDS.has(inv.id) ? { ...inv, status: "inbox" as InvoiceStatus } : inv
        ),
        toast: null,
        arrivingEmailId: null,
      };
    default:
      return state;
  }
}

type StoreValue = State & {
  readEmail: (id: string) => void;
  capture: (emailId: string) => void;
  uploadInvoice: (fileName: string, sizeKb: number) => void;
  setStatus: (invoiceId: string, status: InvoiceStatus) => void;
  setProject: (invoiceId: string, projectId: string | null, projectName: string | null) => void;
  approveBatch: () => void;
  dismissToast: () => void;
  setToast: (message: string | null, autoHideMs?: number) => void;
  setArriving: (emailId: string | null, autoClearMs?: number) => void;
  resetDemo: () => void;
};

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const readEmail = useCallback((id: string) => dispatch({ type: "READ_EMAIL", id }), []);
  const capture = useCallback((emailId: string) => {
    dispatch({ type: "CAPTURE", emailId });
    setTimeout(() => dispatch({ type: "TOAST", message: null }), 2400);
  }, []);
  const uploadInvoice = useCallback((fileName: string, sizeKb: number) => {
    dispatch({ type: "UPLOAD_INVOICE", fileName, sizeKb });
    setTimeout(() => dispatch({ type: "TOAST", message: null }), 2800);
  }, []);
  const setStatus = useCallback(
    (invoiceId: string, status: InvoiceStatus) => dispatch({ type: "SET_STATUS", invoiceId, status }),
    []
  );
  const setProject = useCallback(
    (invoiceId: string, projectId: string | null, projectName: string | null) =>
      dispatch({ type: "SET_PROJECT", invoiceId, projectId, projectName }),
    []
  );
  const approveBatch = useCallback(() => {
    dispatch({ type: "APPROVE_BATCH" });
    setTimeout(() => dispatch({ type: "TOAST", message: null }), 2400);
  }, []);
  const dismissToast = useCallback(() => dispatch({ type: "TOAST", message: null }), []);
  const setToast = useCallback((message: string | null, autoHideMs?: number) => {
    dispatch({ type: "TOAST", message });
    if (message && autoHideMs && autoHideMs > 0) {
      setTimeout(() => dispatch({ type: "TOAST", message: null }), autoHideMs);
    }
  }, []);
  const resetDemo = useCallback(() => dispatch({ type: "RESET_DEMO" }), []);
  const setArriving = useCallback((emailId: string | null, autoClearMs?: number) => {
    dispatch({ type: "ARRIVING", emailId });
    if (emailId && autoClearMs && autoClearMs > 0) {
      setTimeout(() => dispatch({ type: "ARRIVING", emailId: null }), autoClearMs);
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, readEmail, capture, uploadInvoice, setStatus, setProject, approveBatch, dismissToast, setToast, setArriving, resetDemo }),
    [state, readEmail, capture, uploadInvoice, setStatus, setProject, approveBatch, dismissToast, setToast, setArriving, resetDemo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
