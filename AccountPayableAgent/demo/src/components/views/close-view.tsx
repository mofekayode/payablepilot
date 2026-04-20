"use client";
import { CalendarCheck, Check, Clock, User, Sparkles } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "../primitives";
import { monthEnd, CloseTask } from "@/lib/app-data";
import { cn } from "@/lib/utils";

export function CloseView() {
  const done = monthEnd.tasks.filter((t) => t.status === "done").length;
  const total = monthEnd.tasks.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Month-end close</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Close the books without the weekend.</h1>
        <p className="text-sm text-muted mt-1">
          Period ending {monthEnd.periodEnd} · {monthEnd.daysRemaining} days remaining. Agent owns the repeatable steps; you own the judgment calls.
        </p>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Close progress</span>
            </div>
            <div className="text-sm text-muted">
              {done} of {total} steps complete · <span className="font-medium text-foreground">{pct}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium">Checklist</span>
        </CardHeader>
        <CardBody className="p-0">
          <ul>
            {monthEnd.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-4 px-5 py-4 border-t border-border first:border-t-0">
                <StatusDot status={task.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", task.status === "done" ? "text-muted line-through" : "font-medium")}>
                      {task.title}
                    </span>
                    <OwnerBadge owner={task.owner} />
                  </div>
                  {task.sub && <div className="text-xs text-muted mt-0.5">{task.sub}</div>}
                </div>
                <StatusPill status={task.status} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <span className="text-sm font-medium">What the agent is doing right now</span>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            <ActivityLine when="live" text="Reconciling Metro Electric statement against posted invoices." />
            <ActivityLine when="10 min ago" text="Queued accrual draft for unreceived Hillcrest month 3 progress." />
            <ActivityLine when="1 hr ago" text="Posted GL entries for yesterday&apos;s matched batch." />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <span className="text-sm font-medium">What needs you</span>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            {monthEnd.tasks
              .filter((t) => t.owner === "erin" && t.status !== "done")
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-surface">
                  <span>{t.title}</span>
                  <StatusPill status={t.status} />
                </div>
              ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: CloseTask["status"] }) {
  if (status === "done")
    return (
      <div className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center">
        <Check className="w-4 h-4" />
      </div>
    );
  if (status === "ready")
    return (
      <div className="w-7 h-7 rounded-full border-2 border-brand text-brand grid place-items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
      </div>
    );
  return (
    <div className="w-7 h-7 rounded-full border border-border text-muted grid place-items-center">
      <Clock className="w-3.5 h-3.5" />
    </div>
  );
}

function OwnerBadge({ owner }: { owner: CloseTask["owner"] }) {
  if (owner === "pilot")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-soft text-brand border border-[color:var(--brand)]/20">
        <Sparkles className="w-3 h-3" /> Pilot
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-surface text-muted border border-border">
      <User className="w-3 h-3" /> Erin
    </span>
  );
}

function StatusPill({ status }: { status: CloseTask["status"] }) {
  if (status === "done") return <Badge tone="brand">Done</Badge>;
  if (status === "ready") return <Badge tone="brand">Ready to run</Badge>;
  return <Badge tone="neutral">Waiting</Badge>;
}

function ActivityLine({ when, text }: { when: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-[11px] font-mono text-muted w-16 pt-0.5">{when}</div>
      <div className="flex-1">
        <span className="inline-block mr-2 align-middle w-1.5 h-1.5 rounded-full bg-brand" />
        <span className="text-foreground">{text}</span>
      </div>
    </div>
  );
}
