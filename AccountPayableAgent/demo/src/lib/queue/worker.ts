// Queue worker. Claims a batch of pending jobs via the claim_jobs SQL
// function (uses FOR UPDATE SKIP LOCKED so multiple worker invocations
// can run concurrently without double-claiming) and dispatches each one
// through the handler registry.
//
// Triggered by Vercel Cron (/api/queue/run, every minute) and can also be
// invoked synchronously from the inbound webhook for "fast path" latency.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handlers, type HandlerResult } from "./handlers";
import type { JobType, JobPayloads } from "./types";

const DEFAULT_BATCH = 5;
const RETRY_BACKOFF = (attempts: number) =>
  Math.min(60 * 60, 30 * Math.pow(2, attempts - 1)); // 30s, 60s, 120s, ... up to 1h

type ClaimedRow = {
  id: number;
  firm_id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export async function runQueueOnce(opts: { batchSize?: number } = {}) {
  const admin = createSupabaseAdminClient();
  const batchSize = opts.batchSize ?? DEFAULT_BATCH;

  const { data, error } = await admin.rpc("claim_jobs", { batch_size: batchSize });
  if (error) throw new Error(`claim_jobs failed: ${error.message}`);
  const jobs = (data ?? []) as ClaimedRow[];
  if (jobs.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const handler = handlers[job.type as JobType];
    if (!handler) {
      await markDead(admin, job.id, `unknown job type: ${job.type}`);
      failed++;
      continue;
    }
    let result: HandlerResult;
    try {
      result = await handler(
        job.payload as JobPayloads[JobType],
        { jobId: job.id, firmId: job.firm_id, attempts: job.attempts }
      );
    } catch (e) {
      result = { status: "failed", error: (e as Error).message };
    }
    if (result.status === "done") {
      await markDone(admin, job.id, result.result ?? null);
      succeeded++;
    } else {
      const willRetry = job.attempts < job.max_attempts;
      if (!willRetry) {
        await markDead(admin, job.id, result.error ?? "exceeded max_attempts");
      } else {
        const retryIn = result.retryInSeconds ?? RETRY_BACKOFF(job.attempts);
        await markRetry(admin, job.id, result.error ?? "unknown error", retryIn);
      }
      failed++;
    }
  }

  return { processed: jobs.length, succeeded, failed };
}

async function markDone(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  jobId: number,
  result: Record<string, unknown> | null
) {
  await admin
    .from("processing_jobs")
    .update({ status: "done", result, last_error: null })
    .eq("id", jobId);
}

async function markRetry(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  jobId: number,
  error: string,
  delaySeconds: number
) {
  await admin
    .from("processing_jobs")
    .update({
      status: "pending",
      next_run_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      claimed_at: null,
      claimed_by: null,
      last_error: error,
    })
    .eq("id", jobId);
}

async function markDead(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  jobId: number,
  error: string
) {
  await admin
    .from("processing_jobs")
    .update({ status: "dead", last_error: error })
    .eq("id", jobId);
}
