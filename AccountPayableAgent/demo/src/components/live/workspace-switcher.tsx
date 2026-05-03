"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus, Loader2, LayoutGrid } from "lucide-react";
import type { Business } from "@/lib/supabase/types";

export function WorkspaceSwitcher({
  businesses,
  active,
}: {
  businesses: Business[];
  active: Business | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function switchTo(id: string) {
    if (id === active?.id) {
      setOpen(false);
      return;
    }
    setSwitching(id);
    const res = await fetch("/api/businesses/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId: id }),
    });
    if (res.ok) {
      router.refresh();
      // Force a hard refetch of the page so server components re-render with the new business.
      setTimeout(() => window.location.reload(), 50);
    } else {
      setSwitching(null);
    }
  }

  if (!active) {
    return (
      <a
        href="/onboarding/business"
        className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md text-[13px] font-medium text-neutral-700 hover:bg-neutral-100"
      >
        <Plus className="w-4 h-4" /> Add a business
      </a>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md text-left text-[13.5px] font-medium text-neutral-900 hover:bg-neutral-100 max-w-[260px]"
      >
        <span className="w-6 h-6 rounded-md bg-neutral-900 text-white grid place-items-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </span>
        <span className="truncate">{active.name}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-[280px] rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
            Your businesses
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => switchTo(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13.5px] hover:bg-neutral-50 text-left"
              >
                <span className="w-6 h-6 rounded-md bg-neutral-100 grid place-items-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-neutral-600" />
                </span>
                <span className="flex-1 truncate">{b.name}</span>
                {switching === b.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                ) : b.id === active.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100">
            {businesses.length > 1 && (
              <a
                href="/firm"
                className="flex items-center gap-2 px-3 py-2 text-[13.5px] text-neutral-700 hover:bg-neutral-50"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> View all businesses
              </a>
            )}
            <a
              href="/onboarding/business"
              className="flex items-center gap-2 px-3 py-2 text-[13.5px] text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add a business
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
