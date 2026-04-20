"use client";
import { useEffect, useState } from "react";

export function SceneIntro() {
  const [showSub, setShowSub] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowSub(true), 850);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center px-8 bg-surface">
      <div className="max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background text-xs text-muted mb-8 animate-fade-in-up">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          Greenfield Property Management · Accounts Payable
        </div>
        <h1 className="text-[44px] leading-[1.1] font-semibold tracking-tight text-foreground animate-fade-in-up">
          The invoices don&apos;t stop coming.
          <br />
          Matching, coding, chasing. Before the real work starts.
        </h1>
        {showSub && (
          <p className="mt-6 text-xl text-muted animate-fade-in-up">
            PayablePilot handles the repetitive part inside your existing books. Your team stays focused on what matters.
          </p>
        )}
      </div>
    </div>
  );
}
