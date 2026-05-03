// Enqueue a job. Inserts a row into processing_jobs that the worker will
// claim on its next tick.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobPayloads, JobType } from "./types";

export async function enqueue<T extends JobType>(opts: {
  firmId: string;
  type: T;
  payload: JobPayloads[T];
  delaySeconds?: number;
  maxAttempts?: number;
}): Promise<{ jobId: number }> {
  const admin = createSupabaseAdminClient();
  const next_run_at =
    opts.delaySeconds && opts.delaySeconds > 0
      ? new Date(Date.now() + opts.delaySeconds * 1000).toISOString()
      : new Date().toISOString();
  const { data, error } = await admin
    .from("processing_jobs")
    .insert({
      firm_id: opts.firmId,
      type: opts.type,
      payload: opts.payload as Record<string, unknown>,
      next_run_at,
      max_attempts: opts.maxAttempts ?? 5,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`enqueue failed: ${error?.message ?? "unknown"}`);
  }
  return { jobId: data.id };
}
