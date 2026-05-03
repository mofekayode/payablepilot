"use client";
import Link from "next/link";
import { Settings as SettingsIcon, Mail, BookOpen, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { Business } from "@/lib/supabase/types";

export function TopbarLive({
  gmailConnected,
  qboConnected,
  activeBusiness,
  businesses,
}: {
  gmailConnected: boolean;
  qboConnected: boolean;
  activeBusiness: Business | null;
  businesses: Business[];
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background">
      <div className="flex items-center gap-2 min-w-0">
        <WorkspaceSwitcher businesses={businesses} active={activeBusiness} />
      </div>
      <div className="flex items-center gap-3 text-sm">
        <ConnectionBadge label="Gmail" connected={gmailConnected} icon={<Mail className="w-3.5 h-3.5" />} />
        <ConnectionBadge label="QuickBooks" connected={qboConnected} icon={<BookOpen className="w-3.5 h-3.5" />} />
        <Link
          href="/settings"
          className="w-8 h-8 rounded-full bg-surface border border-border grid place-items-center text-muted hover:text-foreground hover:bg-background"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function ConnectionBadge({
  label,
  connected,
  icon,
}: {
  label: string;
  connected: boolean;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium border",
        connected
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-amber-50 text-amber-900 border-amber-200"
      )}
    >
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
      {connected ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    </span>
  );
}
