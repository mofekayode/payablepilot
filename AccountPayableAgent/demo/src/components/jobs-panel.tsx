"use client";
import { useMemo, useState } from "react";
import {
  Check,
  X,
  ExternalLink,
  MapPin,
  Building2,
  DollarSign,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  position: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  jobType: string[] | null;
  url: string | null;
  externalApplyLink: string | null;
  postedAt: string | null;
  description: string;
  score: number | null;
  handled: string[];
  notHandled: string[];
};

type Summary = {
  total: number;
  scored: number;
  avgScore: number;
  highCoverage: number;
  midCoverage: number;
  lowCoverage: number;
  categoriesHandled: string[];
  categoriesNotHandled: string[];
};

type Tier = "all" | "high" | "mid" | "low";

function tierOf(score: number | null): Exclude<Tier, "all"> | null {
  if (score === null) return null;
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function scoreColor(score: number | null) {
  if (score === null) return "bg-neutral-200 text-neutral-600";
  if (score >= 70) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (score >= 40) return "bg-amber-100 text-amber-800 border border-amber-200";
  return "bg-rose-100 text-rose-800 border border-rose-200";
}

export function JobsPanel({ summary, jobs }: { summary: Summary; jobs: Job[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const t = tierOf(j.score);
      if (tier !== "all" && t !== tier) return false;
      if (!q) return true;
      return (
        (j.position ?? "").toLowerCase().includes(q) ||
        (j.company ?? "").toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    });
  }, [query, tier, jobs]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-md bg-neutral-900 text-white grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-semibold tracking-tight">PayablePilot · Job coverage</div>
            <div className="text-[12px] text-neutral-500">
              {summary.total} AP clerk roles scored against the agent's capabilities
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-[1280px] mx-auto px-6 pt-6">
        <SummaryBar summary={summary} />
      </section>

      <section className="max-w-[1280px] mx-auto px-6 mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, title, description…"
              className="w-full h-10 rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-neutral-200 p-1">
            {(
              [
                { key: "all", label: `All (${summary.total})` },
                { key: "high", label: `70%+ (${summary.highCoverage})` },
                { key: "mid", label: `40-69% (${summary.midCoverage})` },
                { key: "low", label: `<40% (${summary.lowCoverage})` },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTier(t.key as Tier)}
                className={cn(
                  "px-3 h-8 rounded-md text-[12.5px] font-medium",
                  tier === t.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-[12.5px] text-neutral-500">
            {filtered.length} showing
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 mt-5 pb-24 space-y-2">
        {filtered.map((j) => (
          <JobRow key={j.id} job={j} expanded={expanded.has(j.id)} onToggle={() => toggle(j.id)} />
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-neutral-500 text-sm">No jobs match.</div>
        )}
      </section>
    </div>
  );
}

function SummaryBar({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Average coverage" value={`${summary.avgScore}%`} accent="neutral" />
      <StatCard label="≥70% coverage" value={String(summary.highCoverage)} accent="emerald" />
      <StatCard label="40-69% coverage" value={String(summary.midCoverage)} accent="amber" />
      <StatCard label="<40% coverage" value={String(summary.lowCoverage)} accent="rose" />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose" | "neutral";
}) {
  const bar = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    neutral: "bg-neutral-900",
  }[accent];
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
      <span className={cn("w-1.5 h-10 rounded-full", bar)} />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function JobRow({ job, expanded, onToggle }: { job: Job; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <div className={cn("shrink-0 w-14 h-14 rounded-lg grid place-items-center font-semibold text-[15px]", scoreColor(job.score))}>
          {job.score === null ? "—" : `${job.score}%`}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14.5px] truncate">{job.position ?? "(no title)"}</span>
            <span className="text-neutral-400 text-[13px]">·</span>
            <span className="text-[13.5px] text-neutral-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" /> {job.company ?? "Unknown"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[12.5px] text-neutral-500 flex-wrap">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {job.location}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> {job.salary}
              </span>
            )}
            {job.postedAt && <span>Posted {job.postedAt}</span>}
          </div>
          {!expanded && (job.handled.length > 0 || job.notHandled.length > 0) && (
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {job.handled.slice(0, 4).map((h) => (
                <Pill key={h} kind="yes" label={h} />
              ))}
              {job.notHandled.slice(0, 3).map((n) => (
                <Pill key={n} kind="no" label={n} />
              ))}
              {job.handled.length + job.notHandled.length > 7 && (
                <span className="text-[11.5px] text-neutral-400 self-center">
                  +{job.handled.length + job.notHandled.length - 7} more
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-neutral-400 shrink-0">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 bg-neutral-50/50 px-5 pt-4 pb-5 grid md:grid-cols-[1.2fr_2fr] gap-6">
          <div>
            <div className="space-y-4">
              <Section title={`Handled (${job.handled.length})`} kind="yes" items={job.handled} />
              <Section title={`Not handled (${job.notHandled.length})`} kind="no" items={job.notHandled} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-neutral-900 text-white text-[12.5px] font-medium hover:opacity-90"
                >
                  View on Indeed <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {job.externalApplyLink && (
                <a
                  href={job.externalApplyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-300 text-neutral-800 text-[12.5px] font-medium hover:bg-white"
                >
                  Company site <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium mb-2">
              Job description
            </div>
            <div className="text-[13px] leading-[1.65] text-neutral-800 whitespace-pre-wrap max-h-[520px] overflow-auto pr-2">
              {job.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ kind, label }: { kind: "yes" | "no"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full",
        kind === "yes"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-rose-50 text-rose-700 border border-rose-200"
      )}
    >
      {kind === "yes" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {label}
    </span>
  );
}

function Section({ title, kind, items }: { title: string; kind: "yes" | "no"; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-[12.5px] text-neutral-400">—</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[13px]">
              {kind === "yes" ? (
                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white grid place-items-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
              ) : (
                <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white grid place-items-center shrink-0">
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
              <span className="text-neutral-800">{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
