"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, PlayCircle, RefreshCw } from "lucide-react";
import { TopBar } from "./topbar";
import { SceneIntro } from "./scene-intro";
import { SceneInbox } from "./scene-inbox";
import { SceneMatch } from "./scene-match";
import { SceneDiscrepancy } from "./scene-discrepancy";
import { SceneDigest } from "./scene-digest";
import { SceneOutro } from "./scene-outro";
import { SceneMonthly } from "./scene-monthly";
import { SceneChat } from "./scene-chat";
import { Button, Kbd } from "./primitives";
import { cn } from "@/lib/utils";

type Scene = {
  id: string;
  label: string;
  topbarLabel: string;
  render: () => React.ReactNode;
  hideTopBar?: boolean;
};

const scenes: Scene[] = [
  {
    id: "intro",
    label: "The problem",
    topbarLabel: "Demo · Scene 1",
    render: () => <SceneIntro />,
    hideTopBar: true,
  },
  {
    id: "inbox",
    label: "Invoice arrives",
    topbarLabel: "Inbox · ap@greenfieldpm.com",
    render: () => <SceneInbox />,
  },
  {
    id: "match",
    label: "Three-way match",
    topbarLabel: "Processing SP-4821 · Summit Plumbing",
    render: () => <SceneMatch />,
  },
  {
    id: "discrepancy",
    label: "Discrepancy caught",
    topbarLabel: "Processing RL-2210 · Reliable Landscaping",
    render: () => <SceneDiscrepancy />,
  },
  {
    id: "digest",
    label: "Daily digest",
    topbarLabel: "Daily digest · 2026-04-18",
    render: () => <SceneDigest />,
  },
  {
    id: "monthly",
    label: "Monthly operations",
    topbarLabel: "Monthly · aging, statements, 1099, close",
    render: () => <SceneMonthly />,
  },
  {
    id: "chat",
    label: "Ask the agent",
    topbarLabel: "Chat · talk to your books",
    render: () => <SceneChat />,
  },
  {
    id: "outro",
    label: "Close",
    topbarLabel: "",
    render: () => <SceneOutro />,
    hideTopBar: true,
  },
];

export function DemoOrchestrator({ embedded = false }: { embedded?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);

  const goto = useCallback((n: number) => {
    const next = Math.min(Math.max(n, 0), scenes.length - 1);
    setIdx(next);
    setKey((k) => k + 1);
  }, []);

  const next = useCallback(() => goto(idx + 1), [idx, goto]);
  const prev = useCallback(() => goto(idx - 1), [idx, goto]);
  const replay = useCallback(() => setKey((k) => k + 1), []);

  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "r" || e.key === "R") {
        replay();
      } else if (/^[1-9]$/.test(e.key)) {
        goto(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, replay, goto, embedded]);

  const scene = scenes[idx];

  return (
    <div
      className={cn(
        "flex flex-col bg-surface relative",
        embedded ? "h-full overflow-hidden" : "min-h-screen"
      )}
    >
      {!scene.hideTopBar && <TopBar sceneLabel={scene.topbarLabel} />}
      <main key={key} className={cn("flex-1 min-h-0 overflow-auto scrollbar-thin", embedded && "pb-20")}>
        {scene.render()}
      </main>

      <div
        className={cn(
          "left-1/2 bottom-4 -translate-x-1/2 z-50 flex items-center gap-2 px-2 py-1.5 rounded-full border border-border bg-background shadow-[0_8px_24px_rgba(27,42,74,0.08)]",
          embedded ? "absolute" : "fixed"
        )}
      >
        <Button variant="ghost" onClick={prev} disabled={idx === 0}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 px-2">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goto(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-foreground" : "w-3 bg-border hover:bg-muted"
              }`}
              aria-label={`Go to scene ${i + 1}`}
            />
          ))}
        </div>
        <div className="px-2 text-xs text-muted hidden sm:flex items-center gap-2">
          <span>{scene.label}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>R</Kbd>
          </span>
        </div>
        <Button variant="ghost" onClick={replay} aria-label="Replay scene">
          <RefreshCw className="w-4 h-4" />
        </Button>
        {idx === scenes.length - 1 ? (
          <Button onClick={() => goto(0)}>
            <PlayCircle className="w-4 h-4" />
            Restart demo
          </Button>
        ) : (
          <Button onClick={next}>
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
