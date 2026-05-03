"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CreateBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [ein, setEin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, legalName: legalName || undefined, ein: ein || undefined }),
    });
    if (!res.ok) {
      setBusy(false);
      setError(`Could not create business: ${await res.text()}`);
      return;
    }
    router.push("/onboarding/connect");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">Business name</label>
        <input
          type="text"
          required
          placeholder="e.g. Acme HVAC"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
        />
        <p className="mt-1 text-[11.5px] text-neutral-400">What you call this client internally.</p>
      </div>
      <div>
        <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">
          Legal name <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Acme Heating &amp; Cooling LLC"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
        />
        <p className="mt-1 text-[11.5px] text-neutral-400">
          Used to match invoices addressed to this business by name.
        </p>
      </div>
      <div>
        <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">
          EIN <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="12-3456789"
          value={ein}
          onChange={(e) => setEin(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-[13px]">{error}</div>
      )}

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-neutral-900 text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
    </form>
  );
}
