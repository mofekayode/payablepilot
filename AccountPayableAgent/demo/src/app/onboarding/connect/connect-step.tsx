"use client";

import { Check } from "lucide-react";

export function ConnectStep({
  name,
  description,
  icon,
  connected,
  connectHref,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  connectHref: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200 grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">{name}</span>
          {connected && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3" /> Connected
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500 leading-relaxed">{description}</p>
      </div>
      {connected ? (
        <span className="text-[12.5px] text-neutral-400">Done</span>
      ) : (
        <a
          href={connectHref}
          className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-neutral-900 text-white text-[13px] font-medium hover:opacity-90"
        >
          Connect
        </a>
      )}
    </div>
  );
}
