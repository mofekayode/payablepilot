"use client";
import { useCallback, useRef, useState } from "react";
import { parse as parsePartial, Allow } from "partial-json";

export type ExtractedInvoice = {
  vendor_name: string | null;
  vendor_email: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  po_number: string | null;
  project_ref: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    amount: number | null;
    project_ref: string | null;
  }>;
};

export type StreamState = {
  // Best-effort partial JSON as it streams in. Always defined while streaming.
  partial: Partial<ExtractedInvoice> | null;
  // Set after the final 'done' event arrives.
  extracted: ExtractedInvoice | null;
  // Set if the stream errors.
  error: string | null;
  // True from start until done/error.
  streaming: boolean;
  // Wall-clock ms from the moment streaming started.
  elapsedMs: number;
};

const initial: StreamState = {
  partial: null,
  extracted: null,
  error: null,
  streaming: false,
  elapsedMs: 0,
};

type Source =
  | { source: "gmail"; messageId: string; attachmentId: string }
  | { source: "upload"; base64: string };

export function useExtractStream() {
  const [state, setState] = useState<StreamState>(initial);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState(initial);
  }, []);

  const run = useCallback(async (source: Source) => {
    cancelled.current = false;
    setState({ ...initial, streaming: true });
    const startedAt = performance.now();

    let res: Response;
    try {
      res = await fetch("/api/extract/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
    } catch (e) {
      setState({ ...initial, error: (e as Error).message });
      return;
    }

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      setState({ ...initial, error: (data as { error?: string }).error ?? `HTTP ${res.status}` });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (cancelled.current) {
        reader.cancel().catch(() => {});
        return;
      }
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are delimited by \n\n.
      let idx;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseSSE(block);
        if (!evt) continue;
        const elapsed = performance.now() - startedAt;
        if (evt.event === "text" && typeof evt.data?.raw === "string") {
          const raw = evt.data.raw as string;
          const cleaned = raw.replace(/^```(?:json)?\s*/i, "");
          let partial: Partial<ExtractedInvoice> | null = null;
          try {
            partial = parsePartial(cleaned, Allow.ALL) as Partial<ExtractedInvoice>;
          } catch {
            partial = null;
          }
          setState((s) => ({ ...s, partial, elapsedMs: Math.round(elapsed) }));
        } else if (evt.event === "done" && evt.data?.extracted) {
          setState({
            partial: evt.data.extracted as ExtractedInvoice,
            extracted: evt.data.extracted as ExtractedInvoice,
            error: null,
            streaming: false,
            elapsedMs: Math.round(elapsed),
          });
        } else if (evt.event === "error") {
          setState((s) => ({
            ...s,
            error: (evt.data?.error as string) ?? "stream error",
            streaming: false,
            elapsedMs: Math.round(elapsed),
          }));
        }
      }
    }
  }, []);

  return { ...state, run, reset };
}

function parseSSE(block: string): { event: string; data: Record<string, unknown> | null } | null {
  // Minimal SSE field parser. Each block is a sequence of `event: x` and `data: y` lines.
  let event = "message";
  let dataRaw = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
  }
  if (!dataRaw) return { event, data: null };
  try {
    return { event, data: JSON.parse(dataRaw) };
  } catch {
    return null;
  }
}
