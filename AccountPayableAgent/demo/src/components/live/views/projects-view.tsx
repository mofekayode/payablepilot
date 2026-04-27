"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Briefcase, ExternalLink, AlertCircle } from "lucide-react";

type Project = { Id: string; DisplayName: string; ParentRef?: { value: string; name?: string }; Active?: boolean };

export function ProjectsView() {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; projects: Project[] } | { kind: "error"; message: string }>(
    { kind: "loading" }
  );
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrations/qbo/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setState({ kind: "ready", projects: data.projects ?? [] });
      } catch (e) {
        setState({ kind: "error", message: (e as Error).message });
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = filter.trim().toLowerCase();
    if (!q) return state.projects;
    return state.projects.filter(
      (p) => p.DisplayName.toLowerCase().includes(q) || (p.ParentRef?.name ?? "").toLowerCase().includes(q)
    );
  }, [state, filter]);

  const notConnected = state.kind === "error" && /not connected|configured/i.test(state.message);

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">QuickBooks</div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted max-w-prose">
              Pulled live from your QuickBooks Online company. Bills posted with a project assignment will roll up under
              the right job.
            </p>
          </div>
          {state.kind === "ready" && (
            <span className="text-[12px] text-muted">{state.projects.length} active</span>
          )}
        </div>

        {notConnected && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-950">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" />
            <div className="flex-1 text-[13.5px]">
              <div className="font-medium">QuickBooks isn&apos;t connected.</div>
              <div className="mt-0.5">Connect it from settings to start syncing your projects.</div>
            </div>
            <Link
              href="/settings"
              className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-md bg-amber-900 text-amber-50 text-[13px] font-medium hover:bg-amber-800"
            >
              Open settings <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {state.kind === "error" && !notConnected && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
          </div>
        )}

        {state.kind === "loading" && (
          <div className="rounded-xl border border-border bg-background p-10 text-center text-[13px] text-muted">
            Loading projects from QuickBooks…
          </div>
        )}

        {state.kind === "ready" && state.projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
            <Briefcase className="w-6 h-6 text-muted mx-auto" />
            <div className="mt-2 text-[15px] font-medium">No projects in QuickBooks yet.</div>
            <div className="mt-1 text-[13px] text-muted max-w-md mx-auto">
              Enable Projects in QuickBooks (Settings → Account and Settings → Advanced → Projects). Once you create one,
              it shows up here.
            </div>
          </div>
        )}

        {state.kind === "ready" && state.projects.length > 0 && (
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search projects…"
                className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <div key={p.Id} className="bg-background rounded-xl border border-border p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded bg-brand-soft text-brand grid place-items-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold truncate">{p.DisplayName}</div>
                    {p.ParentRef?.name && (
                      <div className="text-[12px] text-muted truncate">Customer: {p.ParentRef.name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
