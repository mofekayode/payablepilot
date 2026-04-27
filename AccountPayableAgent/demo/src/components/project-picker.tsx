"use client";
import { useEffect, useState } from "react";
import { Briefcase, Check, X, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Project = { Id: string; DisplayName: string };
type State = "loading" | "ready" | "not-connected" | "empty" | "error";

type Cache = { state: State; projects: Project[]; error?: string };
let cache: Cache | null = null;

async function loadProjects(force = false): Promise<Cache> {
  if (cache && !force) return cache;
  try {
    const res = await fetch("/api/integrations/qbo/projects", { cache: "no-store" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const err = data.error ?? `HTTP ${res.status}`;
      const state: State = /not connected/i.test(err) ? "not-connected" : "error";
      cache = { state, projects: [], error: err };
      return cache;
    }
    const data = (await res.json()) as { projects: Project[] };
    cache = { state: data.projects.length === 0 ? "empty" : "ready", projects: data.projects };
    return cache;
  } catch (e) {
    cache = { state: "error", projects: [], error: (e as Error).message };
    return cache;
  }
}

export function ProjectPicker({
  value,
  valueLabel,
  onChange,
  compact,
}: {
  value: string | null | undefined;
  valueLabel: string | null | undefined;
  onChange: (id: string | null, name: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Cache>({ state: "loading", projects: [] });

  useEffect(() => {
    loadProjects().then(setData);
  }, []);

  const triggerLabel = valueLabel ?? "Assign project";
  const triggerTone = value ? "assigned" : "empty";

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium border transition-colors",
          compact ? "h-7 px-2" : "h-8 px-2.5",
          triggerTone === "assigned"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-border bg-surface text-foreground hover:bg-background"
        )}
      >
        <Briefcase className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[180px]">{triggerLabel}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-[280px] z-40 rounded-md border border-border bg-background shadow-[0_12px_32px_rgba(15,23,42,0.18)] overflow-hidden">
            <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> QuickBooks Projects
            </div>

            {data.state === "loading" && (
              <div className="px-3 py-4 text-[13px] text-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading projects…
              </div>
            )}

            {data.state === "not-connected" && (
              <div className="px-3 py-4 text-[12.5px] text-muted leading-relaxed">
                <span className="block font-medium text-foreground">QuickBooks not connected.</span>
                <a href="/settings" className="text-[12px] underline">
                  Connect QuickBooks
                </a>{" "}
                to load your projects.
              </div>
            )}

            {data.state === "empty" && (
              <div className="px-3 py-4 text-[12.5px] text-muted leading-relaxed">
                No projects found in your QuickBooks company. Enable Projects in QuickBooks (Settings → Account and
                Settings → Advanced → Projects) and refresh.
              </div>
            )}

            {data.state === "error" && (
              <div className="px-3 py-4 text-[12.5px] text-rose-700 leading-relaxed">
                {data.error ?? "Couldn't load projects."}
              </div>
            )}

            {data.state === "ready" && (
              <>
                {value && (
                  <button
                    onClick={() => {
                      onChange(null, null);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-rose-700 hover:bg-rose-50"
                  >
                    <X className="w-3.5 h-3.5" /> Clear assignment
                  </button>
                )}
                <ul className="max-h-[260px] overflow-auto py-1">
                  {data.projects.map((p) => {
                    const selected = p.Id === value;
                    return (
                      <li key={p.Id}>
                        <button
                          onClick={() => {
                            onChange(p.Id, p.DisplayName);
                            setOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-surface",
                            selected && "bg-brand-soft text-foreground font-medium"
                          )}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5 text-brand shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{p.DisplayName}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
