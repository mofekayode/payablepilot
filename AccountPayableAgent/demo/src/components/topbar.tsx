"use client";
import { Feather } from "lucide-react";
import { company } from "@/lib/demo-data";

export function TopBar({ sceneLabel }: { sceneLabel: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center text-background">
          <Feather className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-semibold tracking-tight text-[17px]">PayablePilot</span>
          <span className="text-xs text-muted">Greenfield PM · AP assistant</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted">{sceneLabel}</span>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          <span className="text-xs">Connected to QuickBooks Online</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[13px] font-medium">
          EB
        </div>
      </div>
    </div>
  );
}
