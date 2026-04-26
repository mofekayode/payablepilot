"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, X, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  vendorCompliance,
  agingReport,
  cardTransactions,
  expenseReports,
  vendors,
  outbox,
  Invoice,
} from "@/lib/app-data";
import { money, cn } from "@/lib/utils";

type Role = "user" | "agent";
type Message = { role: Role; text: string; suggestions?: string[]; at: string };

type PendingPrompt = "prioritize-overdue" | null;
type AgentResult = { text: string; steps: string[]; suggestions?: string[]; pending?: PendingPrompt };

type VendorKey = keyof typeof vendors;

const DEFAULT_SUGGESTIONS = [
  "How much do we owe Summit Plumbing right now?",
  "What needs my approval today?",
  "Any invoices more than 30 days overdue?",
  "Is Metro Electric's W-9 on file?",
  "How much have we spent on landscaping this year?",
  "Who's our biggest overdue vendor?",
];

function detectVendor(q: string): VendorKey | null {
  const l = q.toLowerCase();
  if (/\bsummit\b/.test(l)) return "summit";
  if (/\breliable\b|\blandscap/.test(l)) return "reliable";
  if (/\bmetro\b|\belectric\b/.test(l)) return "metro";
  if (/\ballied\b|\binsur/.test(l)) return "allied";
  return null;
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type StoreSnapshot = { invoices: Invoice[]; pending?: PendingPrompt };

function welcomeText(state: StoreSnapshot): string {
  const matched = state.invoices.filter((i) => i.status === "matched");
  const matchedTotal = matched.reduce((s, i) => s + i.total, 0);
  const flagged = state.invoices.filter((i) => i.status === "flagged").length;
  const dupes = state.invoices.filter((i) => i.status === "duplicate").length;

  const bits: string[] = [];
  if (matched.length > 0) bits.push(`**${matched.length}** matched and ready to post to QuickBooks (**${money(matchedTotal)}**)`);
  if (flagged > 0) bits.push(`**${flagged}** flagged discrepancy`);
  if (dupes > 0) bits.push(`**${dupes}** duplicate I blocked`);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  if (bits.length === 0) {
    return `${greet}. Inbox is clear, nothing waiting on you. Ask me anything about AP and I'll dig through the books.`;
  }
  return `${greet}, Erin. Overnight run finished at 5:30 AM. Right now you've got ${bits.join(", ")}. What do you want to dig into?`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function humanList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function answer(q: string, state: StoreSnapshot): AgentResult {
  const l = q.toLowerCase();
  const trimmed = l.trim();
  const vendor = detectVendor(l);

  // Follow-up: user was asked whether to prioritize the overdue invoice or let the full batch flow.
  if (state.pending === "prioritize-overdue") {
    const affirmative = /^(yes|yeah|yep|yup|sure|ok|okay|please|do it|go ahead|sounds good|prioritize|priority|overdue)/.test(trimmed);
    const negative = /^(no|nope|let it|full batch|batch|flow|normal|standard|don'?t|leave it)/.test(trimmed);

    if (affirmative) {
      return {
        steps: ["bumping the overdue invoice to the front", "re-sequencing the batch", "queueing for your approval"],
        text: `Done. I've moved the overdue invoice to the front of today's batch and pushed it to QuickBooks. It's sitting in your approval queue — release the batch and it'll go out first, then the rest in order.`,
        suggestions: ["What else needs my approval today?", "Any other vendors overdue?"],
      };
    }
    if (negative) {
      return {
        steps: ["keeping standard batch order", "no reshuffle needed"],
        text: `Got it — batch stays in its usual order, queued in QuickBooks and waiting on your release. The overdue one still goes out in today's run, just not jumped to the front.`,
        suggestions: ["What else needs my approval today?", "Show me the full batch"],
      };
    }
    // Couldn't tell — ask again but keep context open.
    return {
      steps: ["not quite sure what you meant"],
      text: `Want me to **prioritize the overdue invoice** (pay it first), or **let the full matched batch** flow through in the usual order?`,
      pending: "prioritize-overdue",
    };
  }

  // Owed to vendor
  if (vendor && /(owe|outstanding|unpaid|open|owed|balance)/.test(l)) {
    const v = vendors[vendor];
    const open = agingReport.filter((r) => r.vendorKey === vendor);
    const steps = [`pulling ${v.name}'s ledger`, "checking today's batch", "sorting by age"];
    if (open.length === 0) {
      return { steps, text: `Nothing open to **${v.name}** right now. Everything's either paid or sitting in the current matched batch.` };
    }
    const total = open.reduce((s, r) => s + r.amount, 0);
    const overdue = open.filter((r) => r.daysPastDue > 0);
    const oldest = [...open].sort((a, b) => b.daysPastDue - a.daysPastDue)[0];
    const matchedInBatch = state.invoices.filter((i) => i.vendorKey === vendor && i.status === "matched");

    const intro = pick([
      `OK so ${v.name} has`,
      `Right now **${v.name}** has`,
      `Looking at ${v.name},`,
    ]);
    const countWord = open.length === 1 ? "one" : open.length === 2 ? "two" : open.length === 3 ? "three" : String(open.length);
    let text = `${intro} **${countWord}** open invoice${open.length === 1 ? "" : "s"}, **${money(total)}** total.\n\n`;

    if (oldest.daysPastDue > 0) {
      text += `The oldest is **${oldest.invoiceNumber}** for **${money(oldest.amount)}**. Due date was ${oldest.dueDate}, so it's sitting at +${oldest.daysPastDue} days.`;
    } else {
      text += `The closest one coming due is **${oldest.invoiceNumber}** (**${money(oldest.amount)}**, due ${oldest.dueDate}).`;
    }

    if (matchedInBatch.length > 0) {
      text += ` ${matchedInBatch.length === 1 ? "One of them" : `${matchedInBatch.length} of them`} (${matchedInBatch.map((m) => `**${m.invoiceNumber}**`).join(", ")}) is already matched and queued for today's batch.`;
    }

    if (overdue.length > 0) {
      text += `\n\nWant me to prioritize the overdue one, or let the full batch flow through?`;
      return { steps, text, pending: "prioritize-overdue" };
    }
    text += `\n\nNothing urgent. You're clean on this one.`;
    return { steps, text };
  }

  // Category / YTD spend
  if ((vendor && /(spent|paid|spend|total|year|ytd)/.test(l)) || /(landscap|grounds|repair|insur|electric)/.test(l)) {
    const key: VendorKey =
      vendor ??
      (/landscap|grounds/.test(l) ? "reliable" : /insur/.test(l) ? "allied" : /electric/.test(l) ? "metro" : "summit");
    const comp = vendorCompliance.find((c) => c.vendorKey === key);
    const v = vendors[key];
    const steps = [`adding up payments to ${v.name}`, "rolling into YTD", "checking 1099 threshold"];
    if (!comp) return { steps, text: `I don't have the YTD roll-up on ${v.name} yet.` };
    const thisMonth = state.invoices
      .filter((i) => i.vendorKey === key && i.status === "paid")
      .reduce((s, i) => s + i.total, 0);
    const w9Line = comp.w9OnFile
      ? `W-9 is on file, expires ${comp.w9ExpiresOn}.`
      : `No W-9 on file yet — I emailed them about it on 2026-04-16.`;
    const taxLine = comp.is1099Eligible
      ? `They're 1099-eligible and well past the $600 threshold.`
      : `They're a corp so no 1099 needed.`;

    return {
      steps,
      text: `YTD paid to **${v.name}**: **${money(comp.ytdPaid)}** across every invoice since January. This month's already at **${money(thisMonth)}** through today. ${taxLine} ${w9Line}`,
    };
  }

  // Overdue
  if (/(overdue|past due|late|aging)/.test(l)) {
    const days = l.match(/(\d+)\s*day/);
    const threshold = days ? parseInt(days[1]) : 30;
    const steps = ["opening aging report", `filtering past +${threshold} days`, "sorting by age"];
    const overdue = agingReport.filter((r) => r.daysPastDue > threshold).sort((a, b) => b.daysPastDue - a.daysPastDue);
    if (overdue.length === 0) {
      return { steps, text: `Nothing past **${threshold}** days. Everything open is inside that window.` };
    }
    const total = overdue.reduce((s, r) => s + r.amount, 0);
    const big = overdue[0];
    const bigV = vendors[big.vendorKey];

    let text = `${overdue.length === 1 ? "One invoice" : `${overdue.length} invoices`} past **${threshold}** days, **${money(total)}** total.\n\n`;

    if (big.daysPastDue > 90) {
      text += `The loud one is **${bigV.name} ${big.invoiceNumber}** at **${money(big.amount)}** — that's ${big.daysPastDue} days old and ${big.note ? "in dispute (legal's CC'd)" : "stale"}.`;
    } else {
      text += `Biggest exposure is **${bigV.name} ${big.invoiceNumber}** at **${money(big.amount)}** (+${big.daysPastDue} days).`;
    }

    const others = overdue.slice(1);
    if (others.length > 0) {
      text += `\n\nThe rest:\n${others.map((r) => `• ${vendors[r.vendorKey].name} ${r.invoiceNumber} · ${money(r.amount)} · +${r.daysPastDue}d`).join("\n")}`;
    }

    text += `\n\nAuto-reminders go out tomorrow at 10 AM. The 90+ day ones are already CC'd to you.`;
    return { steps, text };
  }

  // What needs approval
  if (/(approve|approval|review|pending|need me|need you|need your|my plate|todo)/.test(l) || /what.*today/.test(l)) {
    const flagged = state.invoices.filter((i) => i.status === "flagged");
    const matched = state.invoices.filter((i) => i.status === "matched");
    const batchTotal = matched.reduce((s, i) => s + i.total, 0);
    const submittedExp = expenseReports.filter((e) => e.status === "submitted");
    const missingReceipts = cardTransactions.filter((t) => t.status === "missing_receipt").length;

    const steps = ["scanning bills to post", "pulling flagged items", "checking expenses + cards"];

    const items: string[] = [];
    if (matched.length > 0) {
      items.push(
        `**Bills to post:** ${matched.length} matched invoice${matched.length === 1 ? "" : "s"}, **${money(batchTotal)}**. One click pushes them to QuickBooks.`
      );
    }
    if (flagged.length > 0) {
      const f = flagged[0];
      items.push(
        `**Discrepancy:** ${vendors[f.vendorKey].name} **${f.invoiceNumber}**, billed ${money(f.total)} vs PO for ${money(f.poTotal ?? 0)}. I already emailed them; they haven't replied yet.`
      );
    }
    if (submittedExp.length > 0) {
      const e = submittedExp[0];
      items.push(`**Expense report:** ${e.employee}, **${money(e.total)}**, pre-coded and ready for your sign-off.`);
    }
    if (missingReceipts > 0) {
      items.push(`**Receipts:** ${missingReceipts} card charge without a receipt. I've pinged the cardholders.`);
    }

    if (items.length === 0) return { steps, text: `You're clear. Nothing waiting on your approval.` };

    const head = pick([
      `A few things need you:`,
      `Here's what's actually waiting on you:`,
      `Three buckets on your plate:`,
    ]);
    const tail = matched.length > 0
      ? `\n\nIf you want to clear the biggest dollar value first, start with bills to post.`
      : `\n\nThe discrepancy is probably the highest-priority thing here.`;

    return { steps, text: `${head}\n\n${items.join("\n\n")}${tail}` };
  }

  // W-9 / 1099
  if (vendor && (/w-?9|w9|1099|tax/.test(l))) {
    const v = vendors[vendor];
    const c = vendorCompliance.find((x) => x.vendorKey === vendor);
    const steps = [`pulling ${v.name}'s compliance file`, "checking W-9 date", "scanning outbox"];
    if (!c) return { steps, text: `I don't have tax records on ${v.name}.` };
    if (c.w9OnFile) {
      return {
        steps,
        text: `Yeah, W-9 is on file for **${v.name}**. Collected ${c.w9CollectedOn}, good through ${c.w9ExpiresOn}. Tax ID **${c.taxIdMasked}**, YTD paid **${money(c.ytdPaid)}**. ${c.is1099Eligible ? "On track for the January 1099 packet." : "They're a C-Corp so no 1099 is required."}`,
      };
    }
    return {
      steps,
      text: `No. **${v.name}** doesn't have a W-9 on file and they're 1099-eligible, which is a problem since they're already at **${money(c.ytdPaid)}** YTD.\n\nI emailed them about it on 2026-04-16 and queued an auto follow-up for 2026-04-21. If they don't respond by then I can escalate or hold their next payment. Your call.`,
    };
  }

  // Missing receipts
  if (/receipt|missing/.test(l)) {
    const cardMissing = cardTransactions.filter((t) => t.status === "missing_receipt");
    const expMissing = expenseReports.filter((e) => e.status === "needs_receipt");
    const steps = ["scanning card feed", "cross-referencing inbox", "checking expense reports"];
    if (cardMissing.length === 0 && expMissing.length === 0) {
      return { steps, text: `All clean. Every charge and expense has a matching receipt.` };
    }
    const cardLines = cardMissing.map((t) => `• ${t.cardholder} · ${t.merchant} · ${money(t.amount)} · posted ${t.postedAt}`);
    const expLines = expMissing.map((e) => `• ${e.employee} · ${e.note ?? "expense report"}`);
    const all = [...cardLines, ...expLines];
    return {
      steps,
      text: `${all.length === 1 ? "One" : all.length} missing right now:\n\n${all.join("\n")}\n\nI've pinged the cardholders. Next reminder goes out 9 AM tomorrow.`,
    };
  }

  // Outbox by vendor
  if (vendor && /(send|sent|email|outbox|reach)/.test(l)) {
    const v = vendors[vendor];
    const domain = v.email.split("@")[1];
    const steps = ["opening the outbox", `filtering to ${v.name}`, "summarizing"];
    const mails = outbox.filter((o) => o.to.includes(domain) || o.toName === v.name);
    if (mails.length === 0) return { steps, text: `Nothing in the outbox to **${v.name}** yet.` };
    const lines = mails.map((m) => `• ${m.sentAt} · *${m.subject}* · ${m.status.replace("_", " ")}`).join("\n");
    return {
      steps,
      text: `${mails.length} thread${mails.length === 1 ? "" : "s"} with **${v.name}**:\n\n${lines}\n\nFull history is in the Agent outbox.`,
    };
  }

  // Biggest overdue
  if (/biggest|largest|most/.test(l) && /(overdue|past due|owe)/.test(l)) {
    const steps = ["summing overdue by vendor", "sorting exposure", "checking 90+ bucket"];
    const byVendor = new Map<VendorKey, number>();
    for (const r of agingReport) {
      if (r.daysPastDue <= 0) continue;
      byVendor.set(r.vendorKey, (byVendor.get(r.vendorKey) ?? 0) + r.amount);
    }
    if (byVendor.size === 0) return { steps, text: "No overdue balances right now." };
    const sorted = [...byVendor.entries()].sort((a, b) => b[1] - a[1]);
    const [key, total] = sorted[0];
    const v = vendors[key];
    const dispute = agingReport.find((r) => r.vendorKey === key && r.note);
    const extra = dispute?.note ? `\n\nContext: ${dispute.note}` : "";
    return {
      steps,
      text: `**${v.name}** at **${money(total)}**. Biggest overdue exposure across the book.${extra}`,
    };
  }

  // Next due
  if (/next.*(pay|due)/.test(l)) {
    const steps = ["scanning upcoming due dates", "filtering to current bucket", "picking the next one"];
    const upcoming = agingReport.filter((r) => r.daysPastDue <= 0).sort((a, b) => a.daysPastDue - b.daysPastDue);
    if (upcoming.length === 0) return { steps, text: "Nothing in the current bucket. Everything open is already past due." };
    const first = upcoming[upcoming.length - 1];
    return {
      steps,
      text: `**${vendors[first.vendorKey].name}** · ${first.invoiceNumber} · **${money(first.amount)}** · due ${first.dueDate}.`,
    };
  }

  // Month-end
  if (/month.?end|close/.test(l)) {
    const steps = ["opening close checklist", "filtering to your items", "checking days left"];
    return {
      steps,
      text: `Three things waiting on you for the April close:\n\n• Review the one flagged discrepancy (Reliable RL-2210).\n• Sign off on AP aging; we have a meeting on 2026-04-27.\n• Final QuickBooks sync. I'll run it the moment your aging sign-off lands.\n\nEverything else is in my queue and won't need you.`,
    };
  }

  // Default
  return {
    steps: ["parsing your question", "checking what I can pull"],
    text: `Let me know what you're after and I'll dig in. I can cover vendor balances, aging, what's on your plate, W-9/1099 status, category spend, missing receipts, or anything I've emailed on your behalf.`,
    suggestions: [...DEFAULT_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
  };
}

// --- Component ---

export function ChatBar() {
  const [open, setOpen] = useState(false);
  const { invoices } = useStore();

  const welcome = useMemo<Message>(
    () => ({
      role: "agent",
      text: welcomeText({ invoices }),
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 4),
      at: nowStamp(),
    }),
    // only compute on mount so the greeting stays stable through the convo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingPrompt>(null);
  const [working, setWorking] = useState<{ steps: string[]; index: number } | null>(null);
  const [streaming, setStreaming] = useState<{ full: string; shown: string; suggestions?: string[]; at: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, working, streaming]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || working || streaming) return;

    setMessages((prev) => [...prev, { role: "user", text, at: nowStamp() }]);
    setInput("");

    const result = answer(text, { invoices, pending });
    setPending(result.pending ?? null);

    // Play checking steps
    for (let i = 0; i < result.steps.length; i++) {
      setWorking({ steps: result.steps, index: i });
      await new Promise((r) => setTimeout(r, 520 + Math.random() * 240));
    }
    setWorking({ steps: result.steps, index: result.steps.length });
    await new Promise((r) => setTimeout(r, 250));
    setWorking(null);

    // Stream the answer word-by-word
    const stamp = nowStamp();
    setStreaming({ full: result.text, shown: "", suggestions: result.suggestions, at: stamp });
    const tokens = result.text.split(/(\s+)/); // keep whitespace as tokens
    let shown = "";
    for (const t of tokens) {
      shown += t;
      setStreaming({ full: result.text, shown, suggestions: result.suggestions, at: stamp });
      const hasPunct = /[.!?]\s*$/.test(shown);
      const delay = hasPunct ? 90 + Math.random() * 60 : 18 + Math.random() * 28;
      await new Promise((r) => setTimeout(r, delay));
    }

    setMessages((prev) => [
      ...prev,
      { role: "agent", text: result.text, suggestions: result.suggestions, at: stamp },
    ]);
    setStreaming(null);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open PayablePilot chat"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-foreground text-background grid place-items-center shadow-[0_12px_40px_rgba(27,42,74,0.22)] hover:shadow-[0_16px_50px_rgba(27,42,74,0.3)] transition-all hover:scale-105"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-brand" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand ring-2 ring-foreground" />
          </div>
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 w-[440px] h-[680px] max-h-[calc(100vh-3rem)]",
            "rounded-[28px] bg-background overflow-hidden flex flex-col",
            "shadow-[0_28px_80px_-24px_rgba(27,42,74,0.35)] border border-border/60"
          )}
        >
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand-soft grid place-items-center">
                <Sparkles className="w-[18px] h-[18px] text-brand" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
              <div className="text-[11.5px] text-muted">Online · knows your books</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-surface grid place-items-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto px-5 pb-2 space-y-5 scrollbar-thin bg-surface">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} onSuggestion={ask} />
            ))}
            {working && <Working steps={working.steps} index={working.index} />}
            {streaming && (
              <Bubble
                streaming
                message={{
                  role: "agent",
                  text: streaming.shown,
                  at: streaming.at,
                }}
              />
            )}
            <div ref={endRef} className="h-1" />
          </div>

          <div className="px-4 pt-3 pb-4 bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 flex items-center gap-2 border border-border rounded-full bg-surface pl-4 pr-1.5 py-1.5 focus-within:border-foreground/30 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  placeholder="Message PayablePilot…"
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted resize-none py-1.5 leading-5"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !!working || !!streaming}
                  className="w-8 h-8 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-30"
                  aria-label="Send"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </form>
            <div className="mt-2 text-center text-[10.5px] text-muted">
              PayablePilot can make mistakes. Verify before acting on payments.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  message,
  onSuggestion,
  streaming,
}: {
  message: Message;
  onSuggestion?: (q: string) => void;
  streaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-[18px] rounded-br-sm bg-foreground text-background px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap">
          {message.text}
        </div>
        <div className="text-[10.5px] text-muted pr-1">{message.at}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2 pl-1">
        <div className="w-6 h-6 rounded-full bg-brand-soft grid place-items-center">
          <Sparkles className="w-3 h-3 text-brand" />
        </div>
        <span className="text-[11.5px] font-medium">PayablePilot</span>
        <span className="text-[10.5px] text-muted">· {message.at}</span>
      </div>
      <div className="max-w-[92%] rounded-[20px] rounded-tl-sm bg-background border border-border/70 px-4 py-3 text-[14px] leading-[1.6] shadow-[0_1px_0_rgba(27,42,74,0.03)]">
        <RichText text={message.text} />
        {streaming && <span className="caret" aria-hidden />}
      </div>
      {!streaming && message.suggestions && message.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1 max-w-[92%]">
          {message.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion?.(s)}
              className="text-[12px] px-3 py-1.5 rounded-full bg-background border border-border hover:border-foreground/30 hover:bg-surface text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichText({ text }: { text: string }) {
  // light markdown: **bold** and *italic*
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const raw = match[0];
    if (raw.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {raw.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <em key={key++} className="italic text-foreground/90">
          {raw.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

function Working({ steps, index }: { steps: string[]; index: number }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2 pl-1">
        <div className="w-6 h-6 rounded-full bg-brand-soft grid place-items-center">
          <Sparkles className="w-3 h-3 text-brand animate-pulse-soft" />
        </div>
        <span className="text-[11.5px] font-medium">PayablePilot</span>
        <span className="text-[10.5px] text-muted">· thinking</span>
      </div>
      <div className="max-w-[92%] rounded-[20px] rounded-tl-sm bg-background border border-border/70 px-4 py-3 shadow-[0_1px_0_rgba(27,42,74,0.03)]">
        <ul className="space-y-2">
          {steps.map((step, i) => {
            const done = i < index;
            const active = i === index;
            return (
              <li key={i} className="flex items-center gap-2.5 text-[13px]">
                {done ? (
                  <span className="w-4 h-4 rounded-full bg-brand text-white grid place-items-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : active ? (
                  <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-border shrink-0" />
                )}
                <span className={cn(done ? "text-muted" : active ? "text-foreground" : "text-muted/60")}>{step}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
