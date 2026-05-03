"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  CreditCard,
  Users,
  Briefcase,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { PilotMark } from "../pilot-mark";
import { cn } from "@/lib/utils";
import { loadCaptured } from "@/lib/captured-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type LiveView = "dashboard" | "inbox" | "bills" | "vendors" | "projects";

export function SidebarLive({
  active,
  onSelect,
}: {
  active: LiveView;
  onSelect: (v: LiveView) => void;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // Track captured-invoice counts so the badges stay accurate as the user works.
  const [counts, setCounts] = useState({ extracted: 0, ready: 0 });

  async function signOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  useEffect(() => {
    function refresh() {
      const items = loadCaptured();
      setCounts({
        extracted: items.filter((i) => i.status === "extracted").length,
        ready: items.filter((i) => i.status === "ready").length,
      });
    }
    refresh();
    window.addEventListener("pp:captured:changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("pp:captured:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <aside className="w-[248px] shrink-0 border-r border-border bg-background flex flex-col">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-md bg-foreground text-background grid place-items-center">
          <PilotMark className="w-4 h-4" />
        </div>
        <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
      </div>

      <nav className="flex-1 overflow-auto scrollbar-thin px-3 py-3 flex flex-col gap-0.5">
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => onSelect("dashboard")}
        />
        <NavItem
          icon={<InboxIcon className="w-4 h-4" />}
          label="Inbox"
          badge={counts.extracted || undefined}
          active={active === "inbox"}
          onClick={() => onSelect("inbox")}
        />
        <NavItem
          icon={<CreditCard className="w-4 h-4" />}
          label="Bills to post"
          badge={counts.ready || undefined}
          active={active === "bills"}
          onClick={() => onSelect("bills")}
        />
        <NavItem
          icon={<Users className="w-4 h-4" />}
          label="Vendors"
          active={active === "vendors"}
          onClick={() => onSelect("vendors")}
        />
        <NavItem
          icon={<Briefcase className="w-4 h-4" />}
          label="Projects"
          active={active === "projects"}
          onClick={() => onSelect("projects")}
        />
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-xs text-muted hover:text-foreground px-3 py-2 rounded-md border border-border bg-surface"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          Settings &amp; integrations
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2 text-xs text-muted hover:text-foreground px-3 py-2 rounded-md border border-border bg-surface disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 h-9 rounded-md text-[13.5px] text-left transition-colors",
        active ? "bg-foreground text-background font-medium" : "text-foreground hover:bg-surface"
      )}
    >
      <span className={cn(active ? "text-background" : "text-muted")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-semibold grid place-items-center",
            active ? "bg-background/20 text-background" : "bg-brand-soft text-brand"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
