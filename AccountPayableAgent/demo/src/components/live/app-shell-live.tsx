"use client";
import { useEffect, useState } from "react";
import { SidebarLive, type LiveView } from "./sidebar-live";
import { TopbarLive } from "./topbar-live";
import { DashboardView } from "./views/dashboard-view";
import { InboxLiveView } from "./views/inbox-live-view";
import { BillsView } from "./views/bills-view";
import { VendorsView } from "./views/vendors-view";
import { ProjectsView } from "./views/projects-view";

type ConnectionState = {
  gmail: boolean;
  qbo: boolean;
  qboCompany: string | null;
  loading: boolean;
};

export function AppShellLive() {
  const [view, setView] = useState<LiveView>("dashboard");
  const [conn, setConn] = useState<ConnectionState>({ gmail: false, qbo: false, qboCompany: null, loading: true });

  useEffect(() => {
    // Probe both integrations once on mount so the rest of the app knows whether
    // to render empty-but-helpful states or live data.
    let cancelled = false;
    async function probe() {
      const [gmailRes, qboRes] = await Promise.all([
        fetch("/api/integrations/gmail/messages?max=1&days=30").catch(() => null),
        fetch("/api/integrations/qbo/vendors").catch(() => null),
      ]);
      if (cancelled) return;
      const gmail = !!gmailRes && gmailRes.ok;
      const qbo = !!qboRes && qboRes.ok;
      setConn({ gmail, qbo, qboCompany: null, loading: false });
    }
    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <TopbarLive gmailConnected={conn.gmail} qboConnected={conn.qbo} />
      <div className="flex-1 min-h-0 flex">
        <SidebarLive active={view} onSelect={setView} />
        <main className="flex-1 min-w-0 overflow-hidden bg-surface">
          {view === "dashboard" && <DashboardView onNavigate={setView} conn={conn} />}
          {view === "inbox" && <InboxLiveView onNavigate={setView} />}
          {view === "bills" && <BillsView onNavigate={setView} />}
          {view === "vendors" && <VendorsView />}
          {view === "projects" && <ProjectsView />}
        </main>
      </div>
    </div>
  );
}
