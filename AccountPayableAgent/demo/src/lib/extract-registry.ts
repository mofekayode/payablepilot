"use client";
import { useEffect, useReducer } from "react";
import type { ExtractedInvoice } from "./use-extract-stream";

// Singleton registry of in-flight + recently-completed Claude extractions,
// keyed by Gmail attachmentId. Lets the inbox row that fires an auto-extract
// and the right-pane MessageDetail share the same streaming state — click
// into a message that's currently auto-extracting and you see the same
// field-by-field reveal as a manual click would produce.

export type StreamEntry = {
  partial: Partial<ExtractedInvoice> | null;
  extracted: ExtractedInvoice | null;
  streaming: boolean;
  elapsedMs: number;
  error: string | null;
  startedAt: number;
};

const streams = new Map<string, StreamEntry>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getStream(attachmentId: string | null | undefined): StreamEntry | null {
  if (!attachmentId) return null;
  return streams.get(attachmentId) ?? null;
}

export function subscribeStream(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function startStream(attachmentId: string): StreamEntry {
  const entry: StreamEntry = {
    partial: null,
    extracted: null,
    streaming: true,
    elapsedMs: 0,
    error: null,
    startedAt: performance.now(),
  };
  streams.set(attachmentId, entry);
  emit();
  return entry;
}

export function updateStream(attachmentId: string, patch: Partial<StreamEntry>): void {
  const cur = streams.get(attachmentId);
  if (!cur) return;
  streams.set(attachmentId, { ...cur, ...patch });
  emit();
}

export function useStreamEntry(attachmentId: string | null | undefined): StreamEntry | null {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    return subscribeStream(force);
  }, []);
  if (!attachmentId) return null;
  return streams.get(attachmentId) ?? null;
}
