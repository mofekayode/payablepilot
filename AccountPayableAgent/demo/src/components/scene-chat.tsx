"use client";
import { Sparkles, ArrowUp, Check, Send } from "lucide-react";
import { useEffect, useState } from "react";

export function SceneChat() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const times = [500, 1800, 2600, 3700, 5200];
    const ts = times.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center bg-surface px-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-wider text-muted">Ask the agent</div>
          <h1 className="text-[28px] font-semibold tracking-tight mt-1">Talk to it like a teammate.</h1>
          <p className="text-sm text-muted mt-1">
            Every question answered from your live books. No reports, no searching spreadsheets, no waiting.
          </p>
        </div>

        <div className="rounded-[24px] bg-background border border-border/70 shadow-[0_20px_60px_-24px_rgba(27,42,74,0.25)] overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand-soft grid place-items-center">
                <Sparkles className="w-[18px] h-[18px] text-brand" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand ring-2 ring-background" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
              <div className="text-[11.5px] text-muted">Online · knows your books</div>
            </div>
          </div>

          <div className="px-5 pb-4 space-y-5 bg-surface min-h-[360px]">
            {step >= 1 && (
              <div className="flex justify-end animate-fade-in-up">
                <div className="max-w-[85%] rounded-[18px] rounded-br-sm bg-foreground text-background px-4 py-2.5 text-[14px]">
                  How much do we owe Summit Plumbing right now?
                </div>
              </div>
            )}

            {step >= 2 && (
              <div className="flex flex-col items-start gap-2 animate-fade-in-up">
                <div className="flex items-center gap-2 pl-1">
                  <div className="w-6 h-6 rounded-full bg-brand-soft grid place-items-center">
                    <Sparkles className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-[11.5px] font-medium">PayablePilot</span>
                  <span className="text-[10.5px] text-muted">· thinking</span>
                </div>
                <div className="max-w-[92%] rounded-[20px] rounded-tl-sm bg-background border border-border/70 px-4 py-3 text-[13px] space-y-2">
                  <Step done={step >= 3} label="pulling Summit Plumbing's ledger" />
                  <Step done={step >= 4} label="checking today's batch" />
                  <Step done={step >= 5} active={step === 4} label="sorting by age" />
                </div>
              </div>
            )}

            {step >= 5 && (
              <div className="flex flex-col items-start gap-2 animate-fade-in-up">
                <div className="flex items-center gap-2 pl-1">
                  <div className="w-6 h-6 rounded-full bg-brand-soft grid place-items-center">
                    <Sparkles className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-[11.5px] font-medium">PayablePilot</span>
                  <span className="text-[10.5px] text-muted">· just now</span>
                </div>
                <div className="max-w-[92%] rounded-[20px] rounded-tl-sm bg-background border border-border/70 px-4 py-3 text-[14px] leading-[1.6]">
                  Looking at Summit Plumbing, <b>three</b> open invoices, <b>$5,122.50</b> total.
                  <br />
                  <br />
                  The oldest is <b>SP-4780</b> for <b>$612</b>. Due date was 2026-04-04, so it&apos;s sitting at +14 days. One of them (<b>SP-4821</b>) is already matched and queued for today&apos;s batch.
                  <br />
                  <br />
                  Want me to prioritize the overdue one, or let the full batch flow through?
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pt-3 pb-4 flex items-end gap-2 bg-background">
            <div className="flex-1 flex items-center gap-2 border border-border rounded-full bg-surface pl-4 pr-1.5 py-1.5">
              <span className="text-[14px] text-muted">Ask anything...</span>
              <div className="ml-auto w-8 h-8 rounded-full bg-foreground text-background grid place-items-center">
                <ArrowUp className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted">
          One text field instead of twelve dashboard reports.
        </div>
      </div>
    </div>
  );
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <span className="w-4 h-4 rounded-full bg-brand text-white grid place-items-center shrink-0">
          <Check className="w-2.5 h-2.5" />
        </span>
      ) : active ? (
        <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin shrink-0" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-border shrink-0" />
      )}
      <span className={done ? "text-muted" : "text-foreground"}>{label}</span>
    </div>
  );
}
