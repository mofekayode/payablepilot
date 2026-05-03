// Handler registry. The worker dispatches to the right function based on
// job.type. Add new handlers here.

import type { JobPayloads, JobType } from "../types";
import { processInboundEmail } from "./process-inbound-email";

export type HandlerCtx = { jobId: number; firmId: string; attempts: number };

export type HandlerResult = {
  status: "done" | "failed";
  // For status=failed, optionally provide a delay (seconds) before retry.
  retryInSeconds?: number;
  result?: Record<string, unknown>;
  error?: string;
};

type Handler<T extends JobType> = (
  payload: JobPayloads[T],
  ctx: HandlerCtx
) => Promise<HandlerResult>;

export const handlers: { [T in JobType]: Handler<T> } = {
  process_inbound_email: processInboundEmail,
};
