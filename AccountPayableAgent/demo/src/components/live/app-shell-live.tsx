"use client";
import { useCallback, useEffect, useState } from "react";
import { SidebarLive, type LiveView } from "./sidebar-live";
import { TopbarLive } from "./topbar-live";
import { DashboardView } from "./views/dashboard-view";
import { InboxLiveView } from "./views/inbox-live-view";
import { BillsView } from "./views/bills-view";
import { VendorsView } from "./views/vendors-view";
import { ProjectsView } from "./views/projects-view";
import type { Business } from "@/lib/supabase/types";

type ConnectionState = {
  gmail: boolean;
  qbo: boolean;
  qboCompany: string | null;
  loading: boolean;
};

const ALLOWED_VIEWS: LiveView[] = ["dashboard", "inbox", "bills", "vendors", "projects"];

function readViewFromUrl(): LiveView {
  if (typeof window === "undefined") return "dashboard";
  const v = new URLSearchParams(window.location.search).get("view");
  if (v && (ALLOWED_VIEWS as string[]).includes(v)) return v as LiveView;
  return "dashboard";
}

export function AppShellLive({
  activeBusiness,
  businesses,
}: {
  activeBusiness: Business | null;
  businesses: Business[];
}) {
  // Lazy init from the URL so a refresh on /app?view=bills lands on the same
  // tab. Default tab (dashboard) is left implicit so the URL stays clean at /app.
  const [view, setView] = useState<LiveView>(readViewFromUrl);
  const [conn, setConn] = useState<ConnectionState>({ gmail: false, qbo: false, qboCompany: null, loading: true });

  // navigate(): single setter that mirrors view state into the URL via
  // history.replaceState so the back/forward buttons aren't littered with
  // sidebar clicks.
  const navigate = useCallback((next: LiveView) => {
    setView(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === "dashboard") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Respect browser back/forward by syncing state when popstate fires.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPop() {
      setView(readViewFromUrl());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
      <TopbarLive
        gmailConnected={conn.gmail}
        qboConnected={conn.qbo}
        activeBusiness={activeBusiness}
        businesses={businesses}
      />
      <div className="flex-1 min-h-0 flex">
        <SidebarLive active={view} onSelect={navigate} />
        <main className="flex-1 min-w-0 overflow-hidden bg-surface">
          {view === "dashboard" && <DashboardView onNavigate={navigate} conn={conn} />}
          {view === "inbox" && (
            <InboxLiveView onNavigate={navigate} activeBusinessId={activeBusiness?.id ?? null} />
          )}
          {view === "bills" && (
            <BillsView onNavigate={navigate} activeBusinessId={activeBusiness?.id ?? null} />
          )}
          {view === "vendors" && <VendorsView />}
          {view === "projects" && <ProjectsView />}
        </main>
      </div>
    </div>
  );
}
