"use client";
import { useEffect, useState } from "react";
import { Sidebar, ViewId } from "./sidebar";
import { InboxView } from "./views/inbox-view";
import { QueueView } from "./views/queue-view";
import { DiscrepanciesView } from "./views/discrepancies-view";
import { BatchView } from "./views/batch-view";
import { VendorsView } from "./views/vendors-view";
import { DigestView } from "./views/digest-view";
import { InvoiceDetail } from "./views/invoice-detail";
import { AgingView } from "./views/aging-view";
import { StatementsView } from "./views/statements-view";
import { ComplianceView } from "./views/compliance-view";
import { ExpensesView } from "./views/expenses-view";
import { CardsView } from "./views/cards-view";
import { CloseView } from "./views/close-view";
import { OutboxView } from "./views/outbox-view";
import { ChatBar } from "./chat-bar";
import { StoreProvider, useStore } from "@/lib/store";
import { subscribeDemo } from "@/lib/demo-channel";
import { Mail } from "lucide-react";

export function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

const VIEW_IDS = new Set<ViewId>([
  "digest",
  "outbox",
  "inbox",
  "queue",
  "discrepancies",
  "batch",
  "aging",
  "statements",
  "compliance",
  "expenses",
  "cards",
  "close",
  "vendors",
]);

function readInitialView(): ViewId {
  if (typeof window === "undefined") return "digest";
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v && VIEW_IDS.has(v as ViewId)) return v as ViewId;
  return "digest";
}

function Shell() {
  const [view, setView] = useState<ViewId>(() => readInitialView());
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const store = useStore();

  const onOpenInvoice = (id: string) => {
    setOpenInvoice(id);
    setView("queue");
  };

  // Listen for cross-tab demo messages (from /mail compose)
  useEffect(() => {
    return subscribeDemo((msg) => {
      if (msg.type === "reset") {
        store.resetDemo();
        setOpenInvoice(null);
        setView("digest");
        store.setToast("Demo reset.", 1600);
        return;
      }
      if (msg.type === "invoice_sent") {
        store.resetDemo();
        setOpenInvoice(null);
        setView("inbox");
        store.setArriving(msg.emailId, 8000);
        // Auto-capture after a short beat so the agent feels autonomous
        setTimeout(() => store.capture(msg.emailId), 1600);
      }
    });
  }, [store]);

  return (
    <div className="flex h-screen w-screen bg-surface text-foreground">
      <Sidebar
        active={view}
        onSelect={(id) => {
          setView(id);
          setOpenInvoice(null);
        }}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        {openInvoice ? (
          <InvoiceDetail
            invoiceId={openInvoice}
            onBack={() => setOpenInvoice(null)}
          />
        ) : (
          <ViewPane view={view} onOpenInvoice={onOpenInvoice} />
        )}
      </main>
      <Toaster />
      <ArrivingNotification
        onOpen={() => {
          setView("inbox");
          setOpenInvoice(null);
        }}
      />
      <ChatBar />
    </div>
  );
}

function ArrivingNotification({ onOpen }: { onOpen: () => void }) {
  const { arrivingEmailId, emails, setArriving } = useStore();
  if (!arrivingEmailId) return null;
  const email = emails.find((e) => e.id === arrivingEmailId);
  if (!email) return null;
  return (
    <div className="fixed top-5 right-5 z-[60] w-[360px] animate-fade-in-up">
      <button
        onClick={() => {
          onOpen();
          setArriving(null);
        }}
        className="w-full text-left bg-background border border-border rounded-xl shadow-[0_20px_50px_rgba(27,42,74,0.22)] p-4 hover:shadow-[0_24px_60px_rgba(27,42,74,0.28)] transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center shrink-0">
            <ArrivingIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12.5px] font-semibold">PayablePilot</span>
              <span className="text-[10.5px] text-muted">just now</span>
              <span className="ml-auto text-[10.5px] text-brand font-medium">New email</span>
            </div>
            <div className="text-[13.5px] font-medium truncate">{email.fromName}</div>
            <div className="text-[12px] text-muted line-clamp-2">{email.subject}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-brand font-medium">
              Open in inbox
              <span aria-hidden>→</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function ArrivingIcon() {
  return <Mail className="w-4 h-4 text-brand" />;
}

function ViewPane({ view, onOpenInvoice }: { view: ViewId; onOpenInvoice: (id: string) => void }) {
  switch (view) {
    case "digest":
      return <DigestView />;
    case "outbox":
      return <OutboxView />;
    case "inbox":
      return <InboxView onOpenInvoice={onOpenInvoice} />;
    case "queue":
      return <QueueView onOpenInvoice={onOpenInvoice} />;
    case "discrepancies":
      return <DiscrepanciesView onOpenInvoice={onOpenInvoice} />;
    case "batch":
      return <BatchView onOpenInvoice={onOpenInvoice} />;
    case "aging":
      return <AgingView />;
    case "statements":
      return <StatementsView />;
    case "compliance":
      return <ComplianceView />;
    case "expenses":
      return <ExpensesView />;
    case "cards":
      return <CardsView />;
    case "close":
      return <CloseView />;
    case "vendors":
      return <VendorsView />;
  }
}

function Toaster() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-foreground text-background shadow-[0_8px_30px_rgba(27,42,74,0.25)]">
        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
        <span className="text-sm">{toast}</span>
      </div>
    </div>
  );
}
