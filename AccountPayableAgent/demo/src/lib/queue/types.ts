// Job type registry. Adding a new background job:
//   1. Add a new entry to JobPayloads with the payload shape.
//   2. Implement the handler in src/lib/queue/handlers/ and register it
//      in src/lib/queue/handlers/index.ts.

export type JobPayloads = {
  process_inbound_email: {
    inboxMessageId: string;
  };
  // Reserved for future use:
  //   refresh_gmail_watch: { connectionId: string };
};

export type JobType = keyof JobPayloads;

export type Job<T extends JobType = JobType> = {
  id: number;
  firm_id: string;
  type: T;
  payload: JobPayloads[T];
  status: "pending" | "running" | "done" | "failed" | "dead";
  attempts: number;
  max_attempts: number;
};
