"use client";
import { Calendar } from "lucide-react";
import { Button } from "./primitives";
import { PilotMark } from "./pilot-mark";

export function SceneOutro() {
  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center px-8 bg-surface">
      <div className="max-w-2xl text-center">
        <div className="w-14 h-14 rounded-xl bg-foreground text-background grid place-items-center mx-auto mb-7 animate-fade-in-up">
          <PilotMark className="w-7 h-7" />
        </div>
        <h2 className="text-[36px] leading-tight font-semibold tracking-tight animate-fade-in-up">
          AP under control.
          <br />
          Without adding headcount.
        </h2>
        <p className="mt-5 text-lg text-muted animate-fade-in-up">
          PayablePilot works inside whatever books you already use, handles the repetitive part, and leaves every payment for you to approve.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in-up">
          <Button>
            <Calendar className="w-4 h-4" />
            See it run on your invoices
          </Button>
          <div className="text-sm text-muted">Setup in one week.</div>
        </div>
      </div>
    </div>
  );
}
