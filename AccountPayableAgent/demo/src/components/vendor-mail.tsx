"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  Search,
  HelpCircle,
  Settings,
  Grid3x3,
  Pencil,
  Inbox as InboxIcon,
  Star,
  Clock,
  SendIcon,
  FileText,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Link as LinkIcon,
  MoreVertical,
  Trash2,
  Minus,
  Maximize2,
  X,
  Check,
  ArrowLeft,
  Archive,
  AlertOctagon,
  MailOpen,
  FolderInput,
  Reply,
  Forward,
  Printer,
  CornerUpRight,
  Sparkles,
  Plus,
  BadgeCheck,
} from "lucide-react";
import { publishDemo, subscribeDemo } from "@/lib/demo-channel";
import { cn, money } from "@/lib/utils";
import { invoices as seedInvoices, vendors } from "@/lib/app-data";

type AccountKey = "summit" | "reliable" | "erin" | "ap";
type VendorKey = Extract<AccountKey, "summit" | "reliable">;
type InboxAccountKey = Extract<AccountKey, "erin" | "ap">;

type VendorDraft = {
  key: VendorKey;
  senderName: string;
  senderEmail: string;
  senderInitials: string;
  senderColor: string;
  to: string;
  subject: string;
  body: string;
  attachment: { name: string; size: string };
  invoiceId: string;
  emailId: string;
  snippet: string;
  lastSavedAt: string;
};

type InboxEmail = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  receivedAgo: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaHint?: string;
  unread?: boolean;
  starred?: boolean;
  pinned?: boolean;
  isFiller?: boolean;
  avatar?: { initials: string; color: string };
};

const ACCOUNTS: Record<AccountKey, { name: string; email: string; initials: string; color: string }> = {
  summit: { name: "Summit Plumbing", email: "billing@summitplumbing.com", initials: "SP", color: "#1a73e8" },
  reliable: { name: "Reliable Landscaping", email: "accounts@reliablelandscaping.com", initials: "RL", color: "#188038" },
  erin: { name: "Erin Boyd · Greenfield PM", email: "erin@greenfieldpm.com", initials: "EB", color: "#d93025" },
  ap: { name: "AP Inbox · Greenfield PM", email: "ap@greenfieldpm.com", initials: "AP", color: "#5f6368" },
};

const DRAFTS_SEED: Record<VendorKey, VendorDraft> = {
  summit: {
    key: "summit",
    senderName: "Summit Plumbing Billing",
    senderEmail: "billing@summitplumbing.com",
    senderInitials: "SP",
    senderColor: "#1a73e8",
    to: "ap@greenfieldpm.com",
    subject: "Invoice SP-4821 · Unit 12B faucet + service",
    body: `Hi Greenfield team,

Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement, two shut-off valves, and 1.5 hours of service time.

Let me know if you need a W-9 refresh for the year. Payment terms are Net 30 as always.

Thanks,
Summit Plumbing · Billing`,
    snippet: "Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement…",
    attachment: { name: "SP-4821.pdf", size: "142 KB" },
    invoiceId: "inv-summit-4821",
    emailId: "em-summit",
    lastSavedAt: "8:02 AM",
  },
  reliable: {
    key: "reliable",
    senderName: "Reliable Landscaping",
    senderEmail: "accounts@reliablelandscaping.com",
    senderInitials: "RL",
    senderColor: "#188038",
    to: "ap@greenfieldpm.com",
    subject: "April invoice · portfolio grounds service",
    body: `Hi,

Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on for the Maple and Oak properties.

Our updated rate is reflected in this invoice.

Reliable Landscaping`,
    snippet: "Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on…",
    attachment: { name: "RL-2210.pdf", size: "218 KB" },
    invoiceId: "inv-reliable-2210",
    emailId: "em-reliable",
    lastSavedAt: "7:48 AM",
  },
};

const ERIN_INBOX: InboxEmail[] = [
  {
    id: "erin-1",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Morning digest · 11 invoices processed overnight",
    snippet: "Matched 10, flagged 1 pricing mismatch, blocked 1 duplicate. Bills ready to post to QuickBooks…",
    body: `Good morning, Erin.

I worked through the overnight queue between 2:14 AM and 5:30 AM. Here's the state of play:

• 11 invoices captured from ap@greenfieldpm.com
• 10 three-way matched and queued for payment (total $34,512.45)
• 1 pricing discrepancy flagged for your review (Reliable Landscaping RL-2210)
• 1 duplicate blocked (Metro Electric ME-0912 resend)
• 3 vendor emails drafted on your behalf

Today's bills are ready to post whenever you are. One click pushes the full $34K into QuickBooks for you to release.`,
    receivedAt: "6:15 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "Review bills to post",
    ctaHref: "/app?view=batch",
    ctaHint: "10 invoices · $34,512.45 · ready to release",
    unread: true,
    pinned: true,
  },
  {
    id: "erin-2",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Discrepancy alert · Reliable Landscaping RL-2210",
    snippet: "Invoice billed at $85/unit but approved PO PO-1055 shows $75/unit. Vendor reply drafted…",
    body: `Hi Erin,

Reliable Landscaping sent invoice RL-2210 this morning and the first line doesn't match our approved PO.

• Invoice: 16 lawn-service visits at $85.00 per visit
• PO-1055: 16 lawn-service visits at $75.00 per visit
• Over-billed by $160

I've put the invoice on hold and drafted a reply asking them to confirm the rate or send a revised invoice. The draft auto-sends in 10 minutes unless you intervene.`,
    receivedAt: "6:18 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "Review discrepancy",
    ctaHref: "/app?view=discrepancies",
    ctaHint: "Draft reply to vendor ready to send",
    unread: true,
  },
  {
    id: "erin-3",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Duplicate blocked · Metro Electric ME-0912",
    snippet: "Caught a re-sent invoice that was already paid on 2026-04-12. Polite reply drafted…",
    body: `Quick note:

Metro Electric re-sent invoice ME-0912 at 6:54 AM asking us to "confirm receipt." That invoice was already paid on 2026-04-12 (check CHK-20418).

I've blocked it from the payment run and drafted a polite reply. No action needed unless you want to review the draft.`,
    receivedAt: "6:22 AM",
    receivedAgo: "2 hours ago",
    ctaLabel: "View audit trail",
    ctaHref: "/app?view=outbox",
    unread: true,
  },
  {
    id: "erin-4",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Statement reconciled · Summit Plumbing April",
    snippet: "Summit's April statement lines up with our books. No variance…",
    body: `Hi Erin,

Summit Plumbing's April statement (STMT-SP-2026-04) came in overnight. I reconciled it line-by-line against our posted invoices:

• Their total: $8,492.40
• Our total:   $8,492.40
• Variance:    $0.00

Fully balanced. I've already replied to Summit confirming the reconciliation.`,
    receivedAt: "4:08 AM",
    receivedAgo: "4 hours ago",
    ctaLabel: "Open reconciliation",
    ctaHref: "/app?view=statements",
  },
  {
    id: "erin-5",
    fromName: "PayablePilot",
    fromEmail: "pilot@greenfieldpm.com",
    subject: "Receipt needed: Staples $67.90 on 2026-04-16",
    snippet: "Your Chase Ink charge at Staples has no matching receipt on file yet…",
    body: `Hi Erin,

A Chase Ink charge (ending 4411) posted at Staples on 2026-04-16 for $67.90 with no receipt on file.

Forward the receipt to ap@greenfieldpm.com and I'll auto-match and code it. Otherwise I'll ping again tomorrow morning.`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    ctaLabel: "Upload receipt",
    ctaHref: "/app?view=cards",
  },
  {
    id: "fill-docusign",
    fromName: "DocuSign",
    fromEmail: "dse@docusign.net",
    subject: "Completed: Oak St Unit 3B · 12-month lease renewal",
    snippet: "All parties have signed. The executed document is attached to this notification…",
    body: `Hello Erin,

All parties have completed "Oak St Unit 3B — Lease Renewal 2026."

Participants:
• Jamie Ortega (Tenant) — signed 2026-04-20 7:38 AM
• Erin Boyd (Property Manager) — signed 2026-04-20 7:41 AM
• Greenfield PM (Counter-signer) — signed 2026-04-20 7:42 AM

You can view or download the signed document from the link above.

Thanks for using DocuSign.`,
    receivedAt: "7:42 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "DS", color: "#fcba03" },
  },
  {
    id: "fill-slack",
    fromName: "Slack",
    fromEmail: "notifications@slack.com",
    subject: "3 new messages in #ap-team · Greenfield PM",
    snippet: "Marcus: 'Just uploaded April vendor certs to Drive'. Priya: 'Heads up on the Reliable hold…'",
    body: `You have 3 unread messages in #ap-team.

Marcus Hill · 7:24 AM
Just uploaded April vendor certs to Drive — Summit's new COI is in there.

Priya Patel · 7:27 AM
Heads up on the Reliable hold — I want to be looped in before we release anything over $2K to them this month.

Marcus Hill · 7:29 AM
Copy. I'll flag it on the batch.`,
    receivedAt: "7:30 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "SL", color: "#611f69" },
  },
  {
    id: "fill-zillow",
    fromName: "Zillow Rentals",
    fromEmail: "noreply@zillow.com",
    subject: "4 new leads for Maple St Unit 12A",
    snippet: "Applicants are asking about availability dates and pet policy. Respond within 24h for best results…",
    body: `You have 4 new leads for 418 Maple St, Unit 12A.

Applicants are asking about:
• Availability dates (3 leads)
• Pet policy (2 leads)
• Parking (1 lead)

Respond within 24 hours for best placement in Zillow search results.`,
    receivedAt: "7:05 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "Z", color: "#006aff" },
  },
  {
    id: "fill-chase-alert",
    fromName: "Chase Alerts",
    fromEmail: "alerts@chase.com",
    subject: "Balance alert · Operating ****4411 below $250,000",
    snippet: "Your balance at 6:45 AM is $243,180.14, which is below your alert threshold of $250,000…",
    body: `Balance alert for Greenfield Property Management LLC.

Account: Operating Checking ****4411
Balance at 6:45 AM: $243,180.14
Alert threshold: $250,000.00

Pending incoming transfers totaling $62,400.00 are expected to clear by end of day.`,
    receivedAt: "6:50 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "JP", color: "#117aca" },
  },
  {
    id: "fill-chase-daily",
    fromName: "Chase Business",
    fromEmail: "statements@chase.com",
    subject: "Daily activity summary · 2026-04-19",
    snippet: "12 transactions posted yesterday totaling $41,290.55 in debits and $18,422.00 in credits…",
    body: `Daily activity summary for 2026-04-19.

Operating ****4411
• 12 transactions posted
• Debits: $41,290.55
• Credits: $18,422.00
• Ending balance: $284,912.06

No unusual activity detected.`,
    receivedAt: "5:00 AM",
    receivedAgo: "3 hours ago",
    isFiller: true,
    avatar: { initials: "JP", color: "#117aca" },
  },
  {
    id: "fill-gcal",
    fromName: "Google Calendar",
    fromEmail: "calendar-notification@google.com",
    subject: "Your schedule today · 3 events",
    snippet: "9:00 AM Vendor review w/ Marcus · 11:30 AM Board walkthrough 418 Maple · 2:00 PM CFO 1:1…",
    body: `Good morning. Here's your schedule for Monday, April 20, 2026.

• 9:00 AM — Vendor review with Marcus Hill (30 min)
• 11:30 AM — Board walkthrough at 418 Maple St (1 hr)
• 2:00 PM — 1:1 with Priya Patel, CFO (45 min)

You have 4 hours of focus time blocked between events.`,
    receivedAt: "4:30 AM",
    receivedAgo: "3 hours ago",
    isFiller: true,
    avatar: { initials: "G", color: "#4285f4" },
  },
  {
    id: "fill-coned",
    fromName: "Con Edison",
    fromEmail: "no-reply@coned.com",
    subject: "Your April bill is ready · 418 Maple St",
    snippet: "April bill amount: $412.86. Due May 12, 2026. Enrolled in auto-pay on account ****4411…",
    body: `Your April electric bill for 418 Maple St is ready.

Amount due: $412.86
Due date: May 12, 2026
Auto-pay: Enrolled (Chase ****4411)

Usage is up 4% vs March, in line with seasonal averages.`,
    receivedAt: "3:15 AM",
    receivedAgo: "5 hours ago",
    isFiller: true,
    avatar: { initials: "CE", color: "#0a4b78" },
  },
  {
    id: "fill-linkedin",
    fromName: "LinkedIn",
    fromEmail: "messages-noreply@linkedin.com",
    subject: "You appeared in 17 searches this week",
    snippet: "Your profile showed up in searches from recruiters at Greystar, AvalonBay, and 3 other companies…",
    body: `Your profile was found in 17 searches last week, up from 11 the week before.

Top searchers' companies:
• Greystar
• AvalonBay Communities
• Related Companies
• 3 others

See who's searching for people like you.`,
    receivedAt: "12:02 AM",
    receivedAgo: "8 hours ago",
    isFiller: true,
    avatar: { initials: "in", color: "#0a66c2" },
  },
  {
    id: "fill-marcus-vendors",
    fromName: "Marcus Hill",
    fromEmail: "marcus@greenfieldpm.com",
    subject: "Updated vendor certification list for April",
    snippet: "Added Summit Plumbing's new COI and pulled Metro Electric since their GL lapses May 1…",
    body: `Hi Erin,

Updated the vendor cert sheet this afternoon:

• Added Summit Plumbing's new COI (good through Apr 2027)
• Pulled Metro Electric from the approved list — their GL coverage lapses May 1 and they haven't sent renewal yet
• Reliable Landscaping's W-9 is still outstanding, I'll chase them again Monday

Let me know if you want me to hold payments to anyone until certs are current.

Marcus`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "MH", color: "#1a73e8" },
  },
  {
    id: "fill-nydos",
    fromName: "NY Dept of State",
    fromEmail: "do-not-reply@dos.ny.gov",
    subject: "Biennial statement accepted · Greenfield Property Management LLC",
    snippet: "Your biennial filing has been processed. Next filing due April 2028…",
    body: `Your biennial statement for Greenfield Property Management LLC (DOS ID 4402918) has been processed and accepted.

Filing confirmation: BS-2026-0418-NY
Next filing due: April 2028

This email is automated. Please do not reply.`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "NY", color: "#002060" },
  },
  {
    id: "fill-tenant-jaime",
    fromName: "Jaime Ortega",
    fromEmail: "jaime.ortega@gmail.com",
    subject: "Work order · Unit 4B · Leaky kitchen faucet",
    snippet: "Hi Erin, the kitchen faucet in my unit has been dripping pretty steadily since Saturday. Anytime this week…",
    body: `Hi Erin,

The kitchen faucet in my unit (4B) has been dripping pretty steadily since Saturday morning. Not urgent but I'd love to get it handled before it gets worse.

I'm working from home all week so anytime is fine for the plumber to come by. My number is on file.

Thanks,
Jaime`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "JO", color: "#9334e8" },
  },
  {
    id: "fill-cfo-priya",
    fromName: "Priya Patel",
    fromEmail: "priya@greenfieldpm.com",
    subject: "Quick Q on March AP aging",
    snippet: "Can you walk me through the jump in 30-60 bucket? Board meeting Monday and I want to understand it…",
    body: `Hey Erin,

Can you walk me through the jump in the 30-60 day bucket in March? It looks like ~$18K more than February and I want to understand it before the board meeting Monday.

Happy to grab 15 minutes tomorrow if easier than email.

Priya`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "PP", color: "#e67c73" },
  },
  {
    id: "fill-qbo",
    fromName: "QuickBooks Online",
    fromEmail: "quickbooks@notification.intuit.com",
    subject: "Your monthly bookkeeping summary · March 2026",
    snippet: "Net income: $27,418. Largest expense category: Repairs & Maintenance ($14,290). 0 uncategorized transactions…",
    body: `Your March 2026 bookkeeping summary is ready.

• Total income: $148,920
• Total expenses: $121,502
• Net income: $27,418

Top expense categories:
1. Repairs & Maintenance: $14,290
2. Utilities: $8,120
3. Insurance: $6,800

0 uncategorized transactions. Your books are clean for the month.`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "QB", color: "#2ca01c" },
  },
  {
    id: "fill-yardi",
    fromName: "Yardi Systems",
    fromEmail: "updates@yardi.com",
    subject: "New in Voyager · Payables automation module available",
    snippet: "Your workspace admin can enable the new AP automation module from Settings > Modules…",
    body: `We've released the new Payables Automation module for Yardi Voyager.

Key features:
• Automated invoice capture from email
• Three-way matching
• Post bills directly to QuickBooks Online

Your workspace admin can enable it from Settings > Modules. A 60-day trial is included.`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "Y", color: "#e87722" },
  },
  {
    id: "fill-hoa",
    fromName: "Maple Street Condo Board",
    fromEmail: "board@maplestreetcondo.org",
    subject: "Reminder: Board meeting Thursday 7:00 PM",
    snippet: "Agenda: Q1 financials, pool deck bids, short-term rental policy vote. Remote dial-in available…",
    body: `Reminder that the April board meeting is Thursday, April 23 at 7:00 PM in the community room.

Agenda:
1. Q1 financial review
2. Pool deck resurfacing bids (3 vendors)
3. Short-term rental policy vote
4. Elevator modernization scope

Remote dial-in available. Dial-in info is in the shared calendar invite.`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "MS", color: "#15803d" },
  },
  {
    id: "fill-liberty",
    fromName: "Liberty Mutual Commercial",
    fromEmail: "quotes@libertymutual.com",
    subject: "Your commercial property quote is ready",
    snippet: "4-property portfolio · $4.2M coverage · annual premium $18,420 (saves $2,180 vs current carrier)…",
    body: `Your commercial property insurance quote is ready.

Portfolio: 4 properties
Total coverage: $4,200,000
Annual premium: $18,420
Estimated savings: $2,180/yr vs current carrier

Quote is valid for 30 days. Let us know if you'd like to schedule a call to review.`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "LM", color: "#ffb200" },
  },
  {
    id: "fill-gworkspace",
    fromName: "Google Workspace",
    fromEmail: "workspace-noreply@google.com",
    subject: "Security checkup for greenfieldpm.com",
    snippet: "2 sign-ins from new devices this week. All verified. No suspicious activity…",
    body: `Your weekly security summary for greenfieldpm.com.

• 2 sign-ins from new devices (both verified via 2FA)
• 0 suspicious activity events
• 7 of 7 users have 2FA enabled
• 0 external sharing violations

No action required.`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "GW", color: "#4285f4" },
  },
  {
    id: "fill-pmdigest",
    fromName: "PropertyManager Weekly",
    fromEmail: "newsletter@pm-weekly.com",
    subject: "April rental trends · vacancy down 0.8pp YoY",
    snippet: "Regional roundup: mid-Atlantic markets seeing fastest rent growth since 2022. Tips for turn season…",
    body: `This week's digest.

Market pulse:
• National vacancy down 0.8pp year-over-year
• Mid-Atlantic markets leading rent growth (strongest since 2022)
• Turn season tips from operators managing 500+ units

Read the full issue online.`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    isFiller: true,
    avatar: { initials: "PW", color: "#6b7280" },
  },
  {
    id: "fill-gusto",
    fromName: "Gusto",
    fromEmail: "noreply@gusto.com",
    subject: "Payroll processed · April 1-15 period",
    snippet: "7 employees paid. Total $38,294.55. Next run April 30. All tax filings submitted automatically…",
    body: `Your April 1-15 payroll has been processed.

• 7 employees paid
• Gross payroll: $38,294.55
• Employer taxes: $2,926.50
• Next run: April 30

All federal and state tax filings were submitted automatically.`,
    receivedAt: "Apr 14",
    receivedAgo: "6 days ago",
    isFiller: true,
    avatar: { initials: "G", color: "#ff6b35" },
  },
  {
    id: "fill-amazon",
    fromName: "Amazon Business",
    fromEmail: "auto-confirm@amazon.com",
    subject: "Delivered: 2 orders to 418 Maple St",
    snippet: "Lot of 12 air filters (20x25x1) and commercial-grade mop heads delivered at 2:14 PM…",
    body: `Your orders were delivered to 418 Maple St, NY on April 13, 2026 at 2:14 PM.

Order 112-8234918-4402918
• Lot of 12 air filters (20x25x1) — $89.88

Order 112-8240122-9928314
• Commercial-grade mop heads (pack of 6) — $42.50

Thanks for shopping with Amazon Business.`,
    receivedAt: "Apr 13",
    receivedAgo: "7 days ago",
    isFiller: true,
    avatar: { initials: "A", color: "#ff9900" },
  },
];

const AGENT_EMAIL_SUMMIT: InboxEmail = {
  id: "erin-summit-matched",
  fromName: "PayablePilot",
  fromEmail: "pilot@greenfieldpm.com",
  subject: "Invoice matched · Summit Plumbing SP-4821",
  snippet:
    "Three-way matched against PO-1042. Coded to 6120 Repairs & Maintenance. Posted to QuickBooks, ready for your release.",
  body: `Hi Erin,

Summit Plumbing's SP-4821 landed in the inbox and I worked it while you read this.

• Matched against PO-1042 (approved on 2026-04-10)
• Receiving signed by Marcus Hill on 2026-04-15
• Coded to 6120 · Repairs & Maintenance
• Posted to QuickBooks for your release

No action required unless you want to review before approving the batch.`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  ctaLabel: "Review in QuickBooks queue",
  ctaHref: "/app?view=batch",
  ctaHint: "Matched invoice · $399.00 · ready to release",
  unread: true,
  pinned: true,
};

const AGENT_EMAIL_RELIABLE: InboxEmail = {
  id: "erin-reliable-flagged",
  fromName: "PayablePilot",
  fromEmail: "pilot@greenfieldpm.com",
  subject: "Pricing discrepancy detected · Reliable Landscaping RL-2210",
  snippet:
    "Invoice billed at $85/unit but approved PO shows $75/unit. Over-billed by $160. Vendor reply drafted and on hold.",
  body: `Hi Erin,

Reliable Landscaping just sent invoice RL-2210 and line 1 doesn't match our approved PO.

• Invoice: 16 lawn-service visits at $85.00 per visit
• PO-1055: 16 lawn-service visits at $75.00 per visit
• Over-billed by $160

I've placed a payment hold and drafted a reply to accounts@reliablelandscaping.com asking them to confirm the correct rate or send a revised invoice. The draft auto-sends in 10 minutes unless you jump in.`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  ctaLabel: "Review discrepancy",
  ctaHref: "/app?view=discrepancies",
  ctaHint: "Draft reply to vendor ready to send",
  unread: true,
  pinned: true,
};

// Emails that land in ap@greenfieldpm.com when the vendor hits "Send" during the demo.
const AP_EMAIL_FROM_SUMMIT: InboxEmail = {
  id: "ap-summit-4821",
  fromName: "Summit Plumbing Billing",
  fromEmail: "billing@summitplumbing.com",
  subject: "Invoice SP-4821 · Unit 12B faucet + service",
  snippet: "Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B…",
  body: `Hi Greenfield team,

Attached is invoice SP-4821 for the recent work completed at 418 Maple St, Unit 12B. Scope covered the Moen 87039 kitchen faucet replacement, two shut-off valves, and 1.5 hours of service time.

Let me know if you need a W-9 refresh for the year. Payment terms are Net 30 as always.

Thanks,
Summit Plumbing · Billing`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  unread: true,
  isFiller: true,
  avatar: { initials: "SP", color: "#1a73e8" },
};

const AP_EMAIL_FROM_RELIABLE: InboxEmail = {
  id: "ap-reliable-2210",
  fromName: "Reliable Landscaping",
  fromEmail: "accounts@reliablelandscaping.com",
  subject: "April invoice · portfolio grounds service",
  snippet: "Invoice RL-2210 attached for April grounds service across the portfolio…",
  body: `Hi,

Invoice RL-2210 attached for April grounds service across the portfolio. Four properties, weekly visits, plus the mulch we agreed on for the Maple and Oak properties.

Our updated rate is reflected in this invoice.

Reliable Landscaping`,
  receivedAt: "just now",
  receivedAgo: "seconds ago",
  unread: true,
  isFiller: true,
  avatar: { initials: "RL", color: "#188038" },
};

// AP inbox — the flood. This is why we need the agent. Heavy mix of invoices, statements,
// past-due pings, duplicates, vendor pitches. Mostly unread.
const AP_INBOX: InboxEmail[] = [
  {
    id: "ap-metro-resend",
    fromName: "Metro Electric",
    fromEmail: "billing@metroelectric.com",
    subject: "RE: Invoice ME-0912 · please confirm receipt",
    snippet: "Hi — just following up to confirm you received invoice ME-0912. Payment is showing as outstanding on our side…",
    body: `Hi,

Just following up to confirm you received invoice ME-0912 ($1,240.00, issued 2026-04-02). Our system shows it as outstanding. If it's already been paid please send the check number so we can reconcile on our end.

Thanks,
Metro Electric Billing`,
    receivedAt: "7:54 AM",
    receivedAgo: "minutes ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "ME", color: "#ef4444" },
  },
  {
    id: "ap-cornerstone",
    fromName: "Cornerstone HVAC",
    fromEmail: "billing@cornerstonehvac.com",
    subject: "Invoice CH-3091 · spring tune-ups (4 units)",
    snippet: "Invoice CH-3091 attached for the April tune-up visits. All four units passed. Net 15 terms…",
    body: `Hi team,

Attached is CH-3091 for the four spring tune-ups completed April 16-18. All systems passed.

• 418 Maple St — 2 units — PASS
• 22 Oak St — 1 unit — PASS
• 601 Elm Ave — 1 unit — PASS

Terms Net 15. Let me know if you need the filter sizes resent.

Cornerstone HVAC`,
    receivedAt: "7:15 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "CH", color: "#0891b2" },
  },
  {
    id: "ap-brightbuild",
    fromName: "BrightBuild Painting",
    fromEmail: "invoices@brightbuildpaint.com",
    subject: "Invoice BB-220 · hallway touch-up Unit 8",
    snippet: "Invoice BB-220 attached, $485.00, for hallway touch-up work completed 2026-04-15…",
    body: `Invoice BB-220 attached for hallway touch-up work at 418 Maple St, completed 2026-04-15. $485.00.

BrightBuild Painting`,
    receivedAt: "6:42 AM",
    receivedAgo: "1 hour ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "BB", color: "#a855f7" },
  },
  {
    id: "ap-safeguard",
    fromName: "SafeGuard Pest Control",
    fromEmail: "billing@safeguardpest.com",
    subject: "April monthly invoice · PC-5521",
    snippet: "April service completed across all four properties. Invoice PC-5521 attached. Auto-pay on file…",
    body: `Invoice PC-5521 attached for April monthly service.

• 418 Maple St
• 22 Oak St
• 601 Elm Ave
• 115 Pine St

Total: $640.00. Auto-pay on file — will draft on 2026-04-28.

SafeGuard`,
    receivedAt: "6:38 AM",
    receivedAgo: "2 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "SG", color: "#16a34a" },
  },
  {
    id: "ap-springfield-pastdue",
    fromName: "Springfield Roofing",
    fromEmail: "ar@springfieldroofing.com",
    subject: "⚠ PAST DUE · Invoice SR-1048 · 32 days outstanding",
    snippet: "This is our second notice. Invoice SR-1048 for $4,280.00 has been outstanding since 2026-03-19…",
    body: `This is our second notice.

Invoice SR-1048 for $4,280.00 has been outstanding since 2026-03-19 (32 days). Please remit payment within 5 business days to avoid a 1.5% late fee and potential service hold on future work orders.

If payment has been issued, please forward the check number.

Springfield Roofing — Accounts Receivable`,
    receivedAt: "6:14 AM",
    receivedAgo: "2 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "SR", color: "#dc2626" },
  },
  {
    id: "ap-docupro",
    fromName: "DocuPro Copiers",
    fromEmail: "statements@docupro.com",
    subject: "Statement of account · April 2026",
    snippet: "Your April statement is attached. Three open invoices totaling $1,824.55…",
    body: `Your April statement of account is attached.

Open invoices:
• DP-1180 — $620.00 — 2026-04-02
• DP-1198 — $620.00 — 2026-04-09
• DP-1214 — $584.55 — 2026-04-16

Total outstanding: $1,824.55

Please remit or contact us with any questions.

DocuPro Billing`,
    receivedAt: "5:58 AM",
    receivedAgo: "2 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "DP", color: "#1e40af" },
  },
  {
    id: "ap-cleanco",
    fromName: "CleanCo Janitorial",
    fromEmail: "billing@cleanco.co",
    subject: "Invoices CC-0444 and CC-0445 (batched)",
    snippet: "Two invoices batched together — biweekly janitorial for 418 Maple and 22 Oak…",
    body: `Two invoices batched for April biweekly janitorial:

• CC-0444 — 418 Maple St — $820.00
• CC-0445 — 22 Oak St — $640.00

Total: $1,460.00. Net 30.

CleanCo`,
    receivedAt: "5:34 AM",
    receivedAgo: "3 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "CC", color: "#14b8a6" },
  },
  {
    id: "ap-waste",
    fromName: "Waste Management",
    fromEmail: "billing@wm.com",
    subject: "Invoice WM-88120 · April refuse + recycling",
    snippet: "Your April refuse and recycling service invoice is ready. Amount: $1,120.00…",
    body: `Invoice WM-88120 for April refuse and recycling service.

Total: $1,120.00
Due: 2026-05-10

Waste Management`,
    receivedAt: "5:12 AM",
    receivedAgo: "3 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "WM", color: "#15803d" },
  },
  {
    id: "ap-verizon",
    fromName: "Verizon Business",
    fromEmail: "ebill@verizon.com",
    subject: "Your bill is ready · April · $428.14",
    snippet: "Your Verizon Business bill is ready. Total due $428.14. Auto-pay scheduled for 2026-04-27…",
    body: `Your April Verizon Business bill is ready.

Total: $428.14
Auto-pay: Chase ****4411 on 2026-04-27

Verizon`,
    receivedAt: "4:48 AM",
    receivedAgo: "3 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "V", color: "#dc2626" },
  },
  {
    id: "ap-officemax",
    fromName: "OfficeMax Business",
    fromEmail: "orders@officemax.com",
    subject: "Invoice attached · supplies reorder",
    snippet: "Thanks for your order. Invoice OM-9928 attached, $312.48…",
    body: `Thanks for your order. Invoice OM-9928 attached for $312.48.

Items:
• Copy paper (10 reams) — $64.90
• Toner HP 58X (2) — $189.00
• Misc. office supplies — $58.58

OfficeMax Business`,
    receivedAt: "4:32 AM",
    receivedAgo: "3 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "OM", color: "#b91c1c" },
  },
  {
    id: "ap-kone",
    fromName: "Kone Elevator",
    fromEmail: "ar@kone.com",
    subject: "Invoice KE-7712 · Q2 scheduled maintenance",
    snippet: "Q2 scheduled maintenance for 418 Maple elevator. $1,840.00. Invoice attached…",
    body: `Invoice KE-7712 attached for Q2 scheduled elevator maintenance at 418 Maple St.

Total: $1,840.00
Terms: Net 30

Kone Elevator`,
    receivedAt: "3:18 AM",
    receivedAgo: "5 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "K", color: "#0f766e" },
  },
  {
    id: "ap-aqua-pastdue",
    fromName: "AquaSource Water",
    fromEmail: "collections@aquasource.com",
    subject: "⚠ PAST DUE · 45 days · Invoice AQ-3320",
    snippet: "Invoice AQ-3320 is 45 days past due. Please contact us immediately to avoid service interruption…",
    body: `Invoice AQ-3320 ($284.90) is 45 days past due. Please contact us within 3 business days to resolve or we'll be forced to suspend service.

AquaSource Collections`,
    receivedAt: "2:46 AM",
    receivedAgo: "5 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "AQ", color: "#b91c1c" },
  },
  {
    id: "ap-handypro",
    fromName: "HandyPro",
    fromEmail: "billing@handypro.com",
    subject: "Invoice HP-1188 · Unit 6A drywall repair",
    snippet: "Invoice HP-1188 for drywall repair at 418 Maple Unit 6A, $340.00…",
    body: `Invoice HP-1188 for drywall repair at 418 Maple Unit 6A (2026-04-17). $340.00.

HandyPro`,
    receivedAt: "2:05 AM",
    receivedAgo: "6 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "HP", color: "#f59e0b" },
  },
  {
    id: "ap-couriers",
    fromName: "Urgent Couriers",
    fromEmail: "invoices@urgentcouriers.com",
    subject: "Invoice UC-0419 · delivery charges 2026-04-19",
    snippet: "3 same-day deliveries on 2026-04-19. Total $128.00…",
    body: `Invoice UC-0419 for 3 same-day deliveries on 2026-04-19. Total $128.00.

Urgent Couriers`,
    receivedAt: "12:58 AM",
    receivedAgo: "7 hours ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "UC", color: "#7c3aed" },
  },
  {
    id: "ap-homeshield",
    fromName: "HomeShield Security",
    fromEmail: "billing@homeshield.com",
    subject: "Camera system quarterly bill",
    snippet: "Q2 monitoring for all four properties. Invoice HS-4421, $960.00…",
    body: `Invoice HS-4421 for Q2 camera system monitoring across all four properties. $960.00. Auto-pay on file.

HomeShield`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "HS", color: "#0369a1" },
  },
  {
    id: "ap-priya-audit",
    fromName: "Priya Patel",
    fromEmail: "priya@greenfieldpm.com",
    subject: "Following up on Q1 vendor audit",
    snippet: "Hey — did we finish cross-checking the Q1 vendor list against the 1099 report yet? Want to close it out this week…",
    body: `Hey,

Did we finish cross-checking the Q1 vendor list against the 1099 report yet? Want to close it out this week before month-end closes.

Priya`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "PP", color: "#e67c73" },
  },
  {
    id: "ap-metro-old",
    fromName: "Metro Electric",
    fromEmail: "billing@metroelectric.com",
    subject: "Invoice ME-0912 (resend) · payment status?",
    snippet: "Re-sending invoice ME-0912 in case it got lost. Please confirm payment status when you can…",
    body: `Re-sending invoice ME-0912 in case it got lost. Please confirm payment status when you can.

Metro Electric`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "ME", color: "#ef4444" },
  },
  {
    id: "ap-allegro-w9",
    fromName: "Allegro HVAC",
    fromEmail: "ap@allegrohvac.com",
    subject: "W-9 update request for 2026",
    snippet: "Can you send us an updated W-9 for the year? Our records on file expired Dec 2025…",
    body: `Hi,

Can you send us an updated W-9 for the 2026 tax year? The one we have on file expired December 2025.

Thanks,
Allegro HVAC Accounting`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "AH", color: "#0891b2" },
  },
  {
    id: "ap-sunbelt",
    fromName: "Sunbelt Rentals",
    fromEmail: "billing@sunbeltrentals.com",
    subject: "Equipment rental invoice · scissor lift (3 days)",
    snippet: "Invoice SB-7780 for scissor lift rental 2026-04-15 through 2026-04-17. $612.00…",
    body: `Invoice SB-7780 for scissor lift rental (3 days, 2026-04-15 — 2026-04-17). $612.00.

Sunbelt Rentals`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "SB", color: "#ea580c" },
  },
  {
    id: "ap-fastfloors",
    fromName: "FastFloors Inc.",
    fromEmail: "billing@fastfloors.com",
    subject: "Invoice FF-5503 · Unit 2C carpet replacement",
    snippet: "Carpet replacement completed at Unit 2C. Invoice FF-5503 attached, $2,140.00…",
    body: `Invoice FF-5503 attached for carpet replacement at 418 Maple Unit 2C. $2,140.00.

FastFloors Inc.`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "FF", color: "#7c3aed" },
  },
  {
    id: "ap-greenthumb",
    fromName: "Green Thumb Nursery",
    fromEmail: "ar@greenthumbnursery.com",
    subject: "Invoice GTN-0912 · spring planting",
    snippet: "Spring planting completed at 22 Oak and 418 Maple. Invoice GTN-0912 for $892.50…",
    body: `Spring planting completed at 22 Oak and 418 Maple. Invoice GTN-0912 attached for $892.50.

Green Thumb Nursery`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "GT", color: "#15803d" },
  },
  {
    id: "ap-locksmith",
    fromName: "Priority 1 Locksmith",
    fromEmail: "billing@priority1lock.com",
    subject: "Rekey service invoice · 2026-04-18",
    snippet: "Rekey of Unit 5B after tenant turnover. Invoice P1-8820 for $185.00…",
    body: `Invoice P1-8820 for rekey service at Unit 5B after tenant turnover. $185.00.

Priority 1 Locksmith`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "P1", color: "#f59e0b" },
  },
  {
    id: "ap-junk",
    fromName: "1-800-GOT-JUNK",
    fromEmail: "receipts@1800gotjunk.com",
    subject: "Invoice for 4/17 removal",
    snippet: "Invoice GJ-44128 for bulk debris removal at 601 Elm Ave on 2026-04-17. $485.00…",
    body: `Invoice GJ-44128 for bulk debris removal at 601 Elm Ave on 2026-04-17. $485.00.

1-800-GOT-JUNK`,
    receivedAt: "Yesterday",
    receivedAgo: "1 day ago",
    isFiller: true,
    avatar: { initials: "GJ", color: "#1e40af" },
  },
  {
    id: "ap-reliable-march-reminder",
    fromName: "Reliable Landscaping",
    fromEmail: "accounts@reliablelandscaping.com",
    subject: "Reminder: Invoice RL-2209 (March) still unpaid",
    snippet: "Just a friendly ping that RL-2209 from March is still showing unpaid on our side. Total $1,200…",
    body: `Hi,

Just a friendly ping that RL-2209 from March is still showing unpaid on our side. Total $1,200. Let us know if there's an issue we can help resolve.

Reliable Landscaping`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "RL", color: "#188038" },
  },
  {
    id: "ap-statewide",
    fromName: "Statewide Insurance",
    fromEmail: "billing@statewideins.com",
    subject: "Premium due notice · commercial property bundle",
    snippet: "Your quarterly premium of $6,482.00 is due by 2026-05-01. Auto-pay not enabled…",
    body: `Your quarterly premium of $6,482.00 is due by 2026-05-01. Auto-pay is not enabled on this policy.

Please remit by the due date to maintain coverage without interruption.

Statewide Insurance`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "SI", color: "#1e3a8a" },
  },
  {
    id: "ap-metrowater-pastdue",
    fromName: "Metropolitan Water Supply",
    fromEmail: "billing@metrowater.gov",
    subject: "⚠ PAST DUE · April water bill",
    snippet: "April water bill of $612.40 is past due. 10% surcharge applied if not paid by 2026-04-30…",
    body: `Your April water bill of $612.40 is past due. A 10% surcharge will be applied if not paid by 2026-04-30.

Metropolitan Water Supply`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "MW", color: "#b91c1c" },
  },
  {
    id: "ap-nextgen-pitch",
    fromName: "NextGen Pest Solutions",
    fromEmail: "sales@nextgenpest.com",
    subject: "Ready to switch from SafeGuard? Free quote inside",
    snippet: "We noticed you're using SafeGuard. NextGen offers 20% less with better service guarantees…",
    body: `Hi,

We noticed you're using SafeGuard for pest control. NextGen offers 20% less with better service guarantees and a 30-day free trial.

Book a call: nextgenpest.com/quote

NextGen Pest Sales`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "NG", color: "#94a3b8" },
  },
  {
    id: "ap-abc",
    fromName: "ABC Supply Co.",
    fromEmail: "billing@abcsupply.com",
    subject: "Invoice ABC-6612 · roofing materials",
    snippet: "Invoice ABC-6612 for roofing materials delivered to 115 Pine St. $1,402.88…",
    body: `Invoice ABC-6612 attached for roofing materials delivered to 115 Pine St. Total $1,402.88.

ABC Supply Co.`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "A", color: "#dc2626" },
  },
  {
    id: "ap-invoice2go-spam",
    fromName: "Invoice2Go",
    fromEmail: "marketing@invoice2go.com",
    subject: "Stop chasing invoices · try our app free",
    snippet: "Tired of hunting down payments? Our app automates invoice chase-ups so you can focus on growth…",
    body: `Tired of hunting down payments? Invoice2Go automates invoice chase-ups so you can focus on growth. First 60 days free.

Start trial: invoice2go.com`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "I2", color: "#ec4899" },
  },
  {
    id: "ap-summit-statement",
    fromName: "Summit Plumbing Billing",
    fromEmail: "billing@summitplumbing.com",
    subject: "Statement of account · March 2026",
    snippet: "Summit Plumbing statement for March 2026. Five invoices totaling $3,218.40, all paid in full…",
    body: `Statement of account for March 2026.

Five invoices totaling $3,218.40, all paid in full.

No action needed — just for your records.

Summit Plumbing`,
    receivedAt: "Apr 18",
    receivedAgo: "2 days ago",
    isFiller: true,
    avatar: { initials: "SP", color: "#1a73e8" },
  },
  {
    id: "ap-prioritysewer",
    fromName: "Priority Sewer",
    fromEmail: "billing@prioritysewer.com",
    subject: "Invoice PS-440 · line cleaning 418 Maple",
    snippet: "Main line cleaning completed 2026-04-15. Invoice PS-440 for $740.00…",
    body: `Invoice PS-440 for main line cleaning at 418 Maple St on 2026-04-15. $740.00.

Priority Sewer`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "PS", color: "#0f766e" },
  },
  {
    id: "ap-powerfit",
    fromName: "PowerFit Gym Equipment",
    fromEmail: "service@powerfit.com",
    subject: "Quarterly service invoice · fitness center",
    snippet: "Q2 service visit completed at the 418 Maple fitness center. Invoice PF-3322 for $420.00…",
    body: `Q2 service visit completed at the 418 Maple fitness center. Invoice PF-3322 for $420.00.

PowerFit`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "PF", color: "#7c3aed" },
  },
  {
    id: "ap-uber",
    fromName: "Uber for Business",
    fromEmail: "business-receipts@uber.com",
    subject: "Monthly charges summary · March",
    snippet: "March Uber for Business charges: 14 trips, $482.14 total across 3 riders…",
    body: `March Uber for Business charges:

• 14 trips
• $482.14 total
• 3 active riders

Uber for Business`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "U", color: "#111827" },
  },
  {
    id: "ap-amazon-receipt",
    fromName: "Amazon Business",
    fromEmail: "auto-confirm@amazon.com",
    subject: "Your order receipt · office supplies",
    snippet: "Order 112-8240122-9928314. Total $142.38 charged to Chase Ink ending 4411…",
    body: `Your Amazon Business order receipt.

Order 112-8240122-9928314
Total: $142.38
Paid: Chase Ink ****4411

Amazon Business`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "A", color: "#ff9900" },
  },
  {
    id: "ap-grainger",
    fromName: "Grainger",
    fromEmail: "billing@grainger.com",
    subject: "Invoice GR-889421 · filter stock reorder",
    snippet: "Filter stock reorder completed. Invoice GR-889421 for $348.90 attached…",
    body: `Invoice GR-889421 for filter stock reorder. $348.90.

Grainger`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "GR", color: "#dc2626" },
  },
  {
    id: "ap-staples",
    fromName: "Staples Business",
    fromEmail: "receipts@staples.com",
    subject: "Your recent purchase receipt",
    snippet: "Receipt for in-store purchase 2026-04-16. Total $67.90 on Chase Ink ending 4411…",
    body: `Receipt for in-store purchase 2026-04-16. Total $67.90 on Chase Ink ending 4411.

Staples`,
    receivedAt: "Apr 17",
    receivedAgo: "3 days ago",
    isFiller: true,
    avatar: { initials: "S", color: "#b91c1c" },
  },
  {
    id: "ap-reliable-resend",
    fromName: "Reliable Landscaping",
    fromEmail: "accounts@reliablelandscaping.com",
    subject: "Invoice RL-2210 resend · please confirm received",
    snippet: "Hi, just resending RL-2210 in case it didn't come through. Please confirm receipt…",
    body: `Hi,

Just resending RL-2210 in case it didn't come through cleanly the first time. Please confirm receipt when you get a chance.

Reliable Landscaping`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "RL", color: "#188038" },
  },
  {
    id: "ap-adt",
    fromName: "ADT Commercial",
    fromEmail: "billing@adt.com",
    subject: "Monthly monitoring invoice",
    snippet: "Monthly monitoring invoice for all four properties. $412.00…",
    body: `Monthly monitoring invoice for all four properties. $412.00. Auto-pay enabled.

ADT Commercial`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "AD", color: "#1e40af" },
  },
  {
    id: "ap-onepass",
    fromName: "OnePass Tolls",
    fromEmail: "statements@onepass.com",
    subject: "Toll invoice · fleet vehicles · April",
    snippet: "April toll charges across 3 fleet vehicles. Total $184.50…",
    body: `April toll charges across 3 fleet vehicles. Total $184.50.

OnePass`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "OP", color: "#0891b2" },
  },
  {
    id: "ap-bestbuy",
    fromName: "Best Buy Commercial",
    fromEmail: "warranty@bestbuy.com",
    subject: "Warranty renewal notice · laundry machines",
    snippet: "Extended warranty on your commercial laundry machines expires 2026-05-15. Renewal $440…",
    body: `Extended warranty on your commercial laundry machines (serial ending 4412, 4418) expires 2026-05-15. Renewal is $440 for 2 more years.

Best Buy Commercial`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "BB", color: "#1e3a8a" },
  },
  {
    id: "ap-servicechannel",
    fromName: "ServiceChannel",
    fromEmail: "noreply@servicechannel.com",
    subject: "April work orders summary",
    snippet: "28 work orders dispatched in April. 24 closed, 4 still open. See the breakdown inside…",
    body: `April work orders summary.

• 28 dispatched
• 24 closed
• 4 still open (see dashboard)

ServiceChannel`,
    receivedAt: "Apr 16",
    receivedAgo: "4 days ago",
    isFiller: true,
    avatar: { initials: "SC", color: "#16a34a" },
  },
  {
    id: "ap-fedex",
    fromName: "FedEx",
    fromEmail: "billonline@fedex.com",
    subject: "Invoice · shipping charges week of Apr 8",
    snippet: "Weekly FedEx shipping invoice. 12 shipments, $284.14…",
    body: `Weekly FedEx shipping invoice. 12 shipments, $284.14 total.

FedEx`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    isFiller: true,
    avatar: { initials: "FX", color: "#7c3aed" },
  },
  {
    id: "ap-ups",
    fromName: "UPS Store #2418",
    fromEmail: "billing@theupsstore.com",
    subject: "Mailbox annual renewal",
    snippet: "Your PO box rental renews 2026-05-01. Annual fee $240…",
    body: `Your PO box rental renews 2026-05-01. Annual fee is $240.

UPS Store #2418`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    isFiller: true,
    avatar: { initials: "U", color: "#92400e" },
  },
  {
    id: "ap-brightspeed",
    fromName: "Brightspeed Internet",
    fromEmail: "ebill@brightspeed.com",
    subject: "Business internet bill · April",
    snippet: "Your April Brightspeed business internet bill. Amount due $218.00…",
    body: `Your April Brightspeed business internet bill. Amount due $218.00. Auto-pay on file.

Brightspeed`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    isFiller: true,
    avatar: { initials: "BS", color: "#f59e0b" },
  },
  {
    id: "ap-castiron-pastdue",
    fromName: "CastIron HVAC",
    fromEmail: "ar@castironhvac.com",
    subject: "⚠ PAST DUE · Warranty coverage renewal",
    snippet: "Your warranty renewal payment is 18 days past due. Coverage gap begins 2026-04-30 if unpaid…",
    body: `Your warranty renewal payment is 18 days past due. Coverage gap begins 2026-04-30 if unpaid.

Amount: $892.00

CastIron HVAC`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    unread: true,
    isFiller: true,
    avatar: { initials: "CI", color: "#b91c1c" },
  },
  {
    id: "ap-quincy",
    fromName: "Quincy Lumber",
    fromEmail: "ar@quincylumber.com",
    subject: "Receipt for PO-1061",
    snippet: "Delivery receipt for PO-1061 — dimensional lumber. Signed by Marcus Hill at 10:14 AM…",
    body: `Delivery receipt for PO-1061 — dimensional lumber. Signed by Marcus Hill at 10:14 AM.

Total: $1,842.14

Quincy Lumber`,
    receivedAt: "Apr 15",
    receivedAgo: "5 days ago",
    isFiller: true,
    avatar: { initials: "QL", color: "#92400e" },
  },
  {
    id: "ap-signwave",
    fromName: "SignWave Printing",
    fromEmail: "invoices@signwave.com",
    subject: "Invoice · courtesy signage for common areas",
    snippet: "Invoice SW-220 for courtesy signage (pool, laundry, pet waste). $318.40…",
    body: `Invoice SW-220 for courtesy signage (pool, laundry, pet waste). $318.40.

SignWave Printing`,
    receivedAt: "Apr 14",
    receivedAgo: "6 days ago",
    isFiller: true,
    avatar: { initials: "SW", color: "#0891b2" },
  },
  {
    id: "ap-reliable-pricememo",
    fromName: "Reliable Landscaping",
    fromEmail: "accounts@reliablelandscaping.com",
    subject: "NEW pricing memo effective May 1",
    snippet: "Please note new per-visit rates effective 2026-05-01. Memo attached for your records…",
    body: `Please note new per-visit rates effective 2026-05-01. Memo attached for your records.

Previous: $75/visit
New: $85/visit

Reliable Landscaping`,
    receivedAt: "Apr 14",
    receivedAgo: "6 days ago",
    isFiller: true,
    avatar: { initials: "RL", color: "#188038" },
  },
  {
    id: "ap-culligan",
    fromName: "Culligan Water",
    fromEmail: "billing@culligan.com",
    subject: "April delivery invoice · water service",
    snippet: "Invoice CW-4401 for April water service delivery. $84.50…",
    body: `Invoice CW-4401 for April water service delivery. $84.50.

Culligan Water`,
    receivedAt: "Apr 14",
    receivedAgo: "6 days ago",
    isFiller: true,
    avatar: { initials: "CW", color: "#0369a1" },
  },
  {
    id: "ap-rotolos-spam",
    fromName: "Rotolo's Pizza Catering",
    fromEmail: "orders@rotolos.com",
    subject: "Team lunch offers for property managers",
    snippet: "Feed your team for less — bulk lunch packages starting at $9/person. Repeat-customer discount…",
    body: `Feed your team for less — bulk lunch packages starting at $9/person. Repeat-customer discount applies.

Rotolo's Catering`,
    receivedAt: "Apr 14",
    receivedAgo: "6 days ago",
    isFiller: true,
    avatar: { initials: "R", color: "#94a3b8" },
  },
];

export function VendorMail() {
  const [active, setActive] = useState<AccountKey>("summit");
  const [drafts, setDrafts] = useState<Record<VendorKey, VendorDraft>>(() => ({ ...DRAFTS_SEED }));
  const [sent, setSent] = useState<Record<VendorKey, boolean>>({ summit: false, reliable: false });
  const [sending, setSending] = useState<VendorKey | null>(null);
  const [composing, setComposing] = useState<VendorKey | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [erinInbox, setErinInbox] = useState<InboxEmail[]>(ERIN_INBOX);
  const [apInbox, setApInbox] = useState<InboxEmail[]>(AP_INBOX);

  useEffect(() => {
    return subscribeDemo((msg) => {
      if (msg.type === "reset") {
        setErinInbox(ERIN_INBOX);
        setApInbox(AP_INBOX);
        return;
      }
      if (msg.type === "invoice_sent") {
        const agentEmail =
          msg.invoiceId === "inv-summit-4821" ? AGENT_EMAIL_SUMMIT : AGENT_EMAIL_RELIABLE;
        const apEmail =
          msg.invoiceId === "inv-summit-4821" ? AP_EMAIL_FROM_SUMMIT : AP_EMAIL_FROM_RELIABLE;
        // Vendor's invoice lands in ap@ immediately; the agent's summary to Erin follows a moment later.
        setApInbox((prev) => {
          if (prev.some((e) => e.id === apEmail.id)) return prev;
          return [apEmail, ...prev];
        });
        const delay = msg.invoiceId === "inv-summit-4821" ? 4500 : 5500;
        setTimeout(() => {
          setErinInbox((prev) => {
            if (prev.some((e) => e.id === agentEmail.id)) return prev;
            return [agentEmail, ...prev];
          });
        }, delay);
      }
    });
  }, []);

  const handleSwitchAccount = (key: AccountKey) => {
    setActive(key);
    setOpenEmail(null);
    setComposing(null);
  };

  const updateDraft = (key: VendorKey, patch: Partial<VendorDraft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const openCompose = (key: VendorKey) => setComposing(key);
  const closeCompose = () => setComposing(null);

  const sendDraft = async (key: VendorKey) => {
    if (sending) return;
    setSending(key);
    await new Promise((r) => setTimeout(r, 700));
    const d = drafts[key];
    publishDemo({ type: "invoice_sent", invoiceId: d.invoiceId, emailId: d.emailId, at: Date.now() });
    setSent((prev) => ({ ...prev, [key]: true }));
    setSending(null);
    setComposing(null);
  };

  const onReset = () => {
    setDrafts({ ...DRAFTS_SEED });
    setSent({ summit: false, reliable: false });
    setComposing(null);
    setActive("summit");
    setOpenEmail(null);
    setErinInbox(ERIN_INBOX);
    setApInbox(AP_INBOX);
    publishDemo({ type: "reset", at: Date.now() });
  };

  const isInboxView = active === "erin" || active === "ap";
  const inboxEmails = active === "ap" ? apInbox : erinInbox;

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-[#202124] relative overflow-hidden">
      <TopBar account={ACCOUNTS[active]} activeKey={active} onSwitch={handleSwitchAccount} onReset={onReset} />
      <div className="flex-1 min-h-0 flex">
        <SideRail
          active={active}
          onCompose={() => {
            if (isInboxView) return;
            openCompose(active as VendorKey);
          }}
          onReset={onReset}
          sent={sent}
          inboxEmails={inboxEmails}
        />
        <Main
          active={active}
          drafts={drafts}
          sent={sent}
          onOpenDraft={(k) => openCompose(k)}
          openEmail={openEmail}
          onOpenEmail={setOpenEmail}
          inboxEmails={inboxEmails}
        />
      </div>
      {composing && (
        <ComposeWindow
          draft={drafts[composing]}
          sending={sending === composing}
          onChange={(patch) => updateDraft(composing, patch)}
          onSend={() => sendDraft(composing)}
          onClose={closeCompose}
        />
      )}
    </div>
  );
}

// -------- Top bar --------

function GmailLogo() {
  return (
    <svg width="36" height="28" viewBox="0 0 48 36" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 36 H14 V19 L2 10 V32 A4 4 0 0 0 6 36 H14" fill="#4285F4" />
      <path d="M44 36 H34 V19 L46 10 V32 A4 4 0 0 1 42 36 H34" fill="#FBBC04" />
      <path d="M14 36 H34 V19 L24 26 L14 19 Z" fill="#34A853" />
      <path d="M0 10 L24 26 L48 10 V6 A4 4 0 0 0 44 2 H4 A4 4 0 0 0 0 6 Z" fill="#EA4335" />
      <path d="M0 6 V10 L4 13 V9.5 Z" fill="#C5221F" opacity="0.4" />
      <path d="M48 6 V10 L44 13 V9.5 Z" fill="#C5221F" opacity="0.4" />
    </svg>
  );
}

function GeminiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 2 C12.6 7.2 16.8 11.4 22 12 C16.8 12.6 12.6 16.8 12 22 C11.4 16.8 7.2 12.6 2 12 C7.2 11.4 11.4 7.2 12 2 Z"
        fill="#4285F4"
      />
      <path
        d="M12 5.2 C12.4 8.6 15.4 11.6 18.8 12 C15.4 12.4 12.4 15.4 12 18.8 C11.6 15.4 8.6 12.4 5.2 12 C8.6 11.6 11.6 8.6 12 5.2 Z"
        fill="#8AB4F8"
      />
    </svg>
  );
}

function TopBar({
  account,
  activeKey,
  onSwitch,
  onReset,
}: {
  account: (typeof ACCOUNTS)[AccountKey];
  activeKey: AccountKey;
  onSwitch: (k: AccountKey) => void;
  onReset: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="h-16 flex items-center gap-4 px-4 border-b border-[#e8eaed] shrink-0 bg-white">
      <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
        <Menu className="w-5 h-5 text-[#5f6368]" />
      </button>
      <div className="flex items-center pr-4 pl-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_lockup_default_1x_r5.png"
          alt="Gmail"
          className="h-10 w-auto"
        />
      </div>

      <div className="flex-1 mx-2">
        <div className="flex items-center gap-3 h-12 rounded-lg bg-[#f1f3f4] px-4 focus-within:bg-white focus-within:shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
          <Search className="w-5 h-5 text-[#5f6368]" />
          <span className="text-[15px] text-[#5f6368]">Search mail</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <HelpCircle className="w-5 h-5 text-[#5f6368]" />
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <Settings className="w-5 h-5 text-[#5f6368]" />
        </button>
        <button className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-[#c2e7ff] hover:bg-[#a8d1ff] text-[#001d35] text-[14px] font-medium mx-1">
          Upgrade
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <GeminiIcon />
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
          <Grid3x3 className="w-5 h-5 text-[#5f6368]" />
        </button>
        <div className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full text-white grid place-items-center font-medium text-[13px]"
            style={{ background: account.color }}
          >
            {account.initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 flex flex-col bg-white border border-[#e8eaed] rounded-lg shadow-[0_6px_20px_rgba(60,64,67,0.2)] py-1 min-w-[280px] z-50">
                <div className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wider text-[#5f6368] font-medium">
                  Switch account
                </div>
                <AccountRow
                  name="Summit Plumbing"
                  email="billing@summitplumbing.com"
                  initials="SP"
                  color="#1a73e8"
                  active={activeKey === "summit"}
                  onClick={() => {
                    onSwitch("summit");
                    setMenuOpen(false);
                  }}
                />
                <AccountRow
                  name="Reliable Landscaping"
                  email="accounts@reliablelandscaping.com"
                  initials="RL"
                  color="#188038"
                  active={activeKey === "reliable"}
                  onClick={() => {
                    onSwitch("reliable");
                    setMenuOpen(false);
                  }}
                />
                <div className="border-t border-[#e8eaed] my-1" />
                <AccountRow
                  name="Erin Boyd · Greenfield PM"
                  email="erin@greenfieldpm.com"
                  initials="EB"
                  color="#d93025"
                  active={activeKey === "erin"}
                  onClick={() => {
                    onSwitch("erin");
                    setMenuOpen(false);
                  }}
                />
                <AccountRow
                  name="AP Inbox · Greenfield PM"
                  email="ap@greenfieldpm.com"
                  initials="AP"
                  color="#5f6368"
                  active={activeKey === "ap"}
                  onClick={() => {
                    onSwitch("ap");
                    setMenuOpen(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AccountRow({
  name,
  email,
  initials,
  color,
  active,
  onClick,
}: {
  name: string;
  email: string;
  initials: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-3 px-4 py-2.5 hover:bg-[#f1f3f4] text-left", active && "bg-[#e8f0fe]")}
    >
      <div
        className="w-9 h-9 rounded-full text-white grid place-items-center font-medium text-[12px]"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium truncate">{name}</div>
        <div className="text-[11.5px] text-[#5f6368] truncate">{email}</div>
      </div>
      {active && <Check className="w-4 h-4 text-[#1a73e8] shrink-0" />}
    </button>
  );
}

// -------- Side rail --------

function SideRail({
  active,
  onCompose,
  onReset,
  sent,
  inboxEmails,
}: {
  active: AccountKey;
  onCompose: () => void;
  onReset: () => void;
  sent: Record<VendorKey, boolean>;
  inboxEmails: InboxEmail[];
}) {
  const isInboxView = active === "erin" || active === "ap";
  const isErin = active === "erin";
  const isAp = active === "ap";
  const draftsOpen = isInboxView ? 0 : (sent.summit ? 0 : 1) + (sent.reliable ? 0 : 1);
  const inboxUnread = isInboxView ? inboxEmails.filter((e) => e.unread).length : 12;
  const sentCount = !isInboxView ? Number(sent.summit) + Number(sent.reliable) : 0;

  return (
    <aside className="w-[256px] shrink-0 py-2 px-3 bg-white overflow-auto">
      <button
        onClick={onCompose}
        disabled={isInboxView}
        className={cn(
          "flex items-center gap-4 pl-3 pr-6 h-14 rounded-2xl shadow-[0_1px_3px_rgba(60,64,67,0.15)] hover:shadow-[0_2px_6px_rgba(60,64,67,0.2)] transition-shadow",
          isInboxView ? "bg-[#f1f3f4] opacity-60 cursor-not-allowed" : "bg-[#c2e7ff]"
        )}
      >
        <Pencil className="w-5 h-5 text-[#001d35]" />
        <span className="text-[14px] font-medium text-[#001d35]">Compose</span>
      </button>

      <nav className="mt-4 text-[14px]">
        <RailItem icon={<InboxIcon className="w-5 h-5" />} label="Inbox" count={inboxUnread} active={isInboxView} />
        <RailItem icon={<Star className="w-5 h-5" />} label="Starred" />
        <RailItem icon={<Clock className="w-5 h-5" />} label="Snoozed" />
        <RailItem icon={<SendIcon className="w-5 h-5" />} label="Sent" count={sentCount || undefined} />
        <RailItem icon={<FileText className="w-5 h-5" />} label="Drafts" count={draftsOpen || undefined} active={!isInboxView} />
        <RailItem icon={<Tag className="w-5 h-5" />} label="Categories" />
        <div className="pl-6 pr-4 h-8 flex items-center text-[13px] text-[#5f6368]">More</div>

        <div className="mt-3 border-t border-[#e8eaed] pt-3">
          <div className="flex items-center justify-between pl-6 pr-4 h-8 text-[13px] text-[#5f6368]">
            <span>Labels</span>
            <Plus className="w-4 h-4" />
          </div>
          <LabelChip
            color="#d93025"
            label="PayablePilot"
            count={isErin ? inboxEmails.filter((e) => !e.isFiller).length : undefined}
          />
          <LabelChip
            color="#188038"
            label="Invoices"
            count={isAp ? inboxEmails.filter((e) => /invoice/i.test(e.subject)).length : undefined}
          />
          <LabelChip
            color="#f9ab00"
            label="Past due"
            count={isAp ? inboxEmails.filter((e) => /past due/i.test(e.subject)).length : undefined}
          />
        </div>

        <div className="mt-6 pl-6 pr-4">
          <button
            onClick={onReset}
            className="text-[11.5px] text-[#5f6368] hover:text-[#202124] hover:underline"
          >
            Reset demo drafts
          </button>
        </div>
      </nav>
    </aside>
  );
}

function RailItem({
  icon,
  label,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 pl-6 pr-4 h-8 rounded-full cursor-default",
        active ? "bg-[#d3e3fd] text-[#001d35] font-medium" : "text-[#202124] hover:bg-[#f1f3f4]"
      )}
    >
      <span className="flex items-center gap-4">
        <span className={cn(active ? "text-[#001d35]" : "text-[#5f6368]")}>{icon}</span>
        <span className="text-[14px]">{label}</span>
      </span>
      {count !== undefined && <span className="text-[12px]">{count}</span>}
    </div>
  );
}

function LabelChip({ color, label, count }: { color: string; label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 pl-6 pr-4 h-8 rounded-full text-[#202124] hover:bg-[#f1f3f4]">
      <span className="flex items-center gap-4">
        <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
        <span className="text-[13.5px]">{label}</span>
      </span>
      {count !== undefined && <span className="text-[12px]">{count}</span>}
    </div>
  );
}

// -------- Main pane --------

function Main({
  active,
  drafts,
  sent,
  onOpenDraft,
  openEmail,
  onOpenEmail,
  inboxEmails,
}: {
  active: AccountKey;
  drafts: Record<VendorKey, VendorDraft>;
  sent: Record<VendorKey, boolean>;
  onOpenDraft: (k: VendorKey) => void;
  openEmail: string | null;
  onOpenEmail: (id: string | null) => void;
  inboxEmails: InboxEmail[];
}) {
  const isInboxView = active === "erin" || active === "ap";
  const current = useMemo(
    () => (isInboxView ? inboxEmails.find((e) => e.id === openEmail) ?? null : null),
    [isInboxView, openEmail, inboxEmails]
  );
  if (isInboxView) {
    return (
      <div className="flex-1 min-h-0 bg-white overflow-auto rounded-tl-2xl border-t border-l border-[#e8eaed] mt-1">
        {current ? (
          <EmailReader email={current} onBack={() => onOpenEmail(null)} />
        ) : (
          <ErinInbox emails={inboxEmails} onOpen={onOpenEmail} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-white overflow-auto rounded-tl-2xl border-t border-l border-[#e8eaed] mt-1">
      <DraftsList drafts={drafts} sent={sent} onOpen={onOpenDraft} />
    </div>
  );
}

// -------- Drafts list --------

function DraftsList({
  drafts,
  sent,
  onOpen,
}: {
  drafts: Record<VendorKey, VendorDraft>;
  sent: Record<VendorKey, boolean>;
  onOpen: (k: VendorKey) => void;
}) {
  const order: VendorKey[] = ["summit", "reliable"];
  const openDrafts = order.filter((k) => !sent[k]);
  const sentDrafts = order.filter((k) => sent[k]);

  return (
    <div>
      <div className="flex items-center gap-4 px-4 h-11 border-b border-[#e8eaed] text-[#5f6368] text-[13px]">
        <div className="w-5 h-5 rounded-sm border border-[#dadce0]" />
        <span>Refresh</span>
        <span className="ml-auto text-[11.5px]">1-{openDrafts.length + sentDrafts.length} of {openDrafts.length + sentDrafts.length}</span>
      </div>

      {openDrafts.length === 0 ? (
        <div className="p-16 text-center text-[#5f6368] text-[14px]">
          All drafts sent. Hit <span className="text-[#0b57d0] font-medium">Reset demo</span> to restore them.
        </div>
      ) : (
        <ul>
          {openDrafts.map((k, i) => (
            <DraftRow key={k} draft={drafts[k]} onClick={() => onOpen(k)} fresh={i === 0} />
          ))}
        </ul>
      )}

      {sentDrafts.length > 0 && (
        <>
          <div className="px-4 pt-6 pb-2 text-[11px] uppercase tracking-wider text-[#5f6368] font-medium">Already sent</div>
          <ul>
            {sentDrafts.map((k) => (
              <SentRow key={k} draft={drafts[k]} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DraftRow({ draft, onClick, fresh }: { draft: VendorDraft; onClick: () => void; fresh?: boolean }) {
  return (
    <li
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] bg-white hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,0.15)] cursor-pointer",
        fresh && "animate-fade-in-up"
      )}
    >
      <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
      <Star className="w-[18px] h-[18px] text-[#5f6368]/40 shrink-0" />
      <div className="w-[180px] shrink-0 truncate flex items-center gap-3">
        <div className="w-6 h-6 rounded-full text-white grid place-items-center text-[10px] font-medium shrink-0" style={{ background: draft.senderColor }}>
          {draft.senderInitials}
        </div>
        <span className="text-[#d93025] font-medium text-[13.5px]">Draft</span>
      </div>
      <div className="flex-1 min-w-0 truncate text-[13.5px]">
        <span className="text-[#202124] font-medium">{draft.subject}</span>
        <span className="text-[#5f6368]"> · {draft.snippet}</span>
      </div>
      <Paperclip className="w-[15px] h-[15px] text-[#5f6368]/70 shrink-0" />
      <div className="shrink-0 text-[12px] text-[#5f6368] w-[76px] text-right">{draft.lastSavedAt}</div>
    </li>
  );
}

function SentRow({ draft }: { draft: VendorDraft }) {
  return (
    <li className="flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] text-[#5f6368] bg-[#fafbfc]">
      <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
      <Star className="w-[18px] h-[18px] text-[#5f6368]/30 shrink-0" />
      <div className="w-[180px] shrink-0 truncate flex items-center gap-3">
        <div className="w-6 h-6 rounded-full text-white grid place-items-center text-[10px] font-medium shrink-0" style={{ background: draft.senderColor }}>
          {draft.senderInitials}
        </div>
        <span className="text-[#137333] font-medium text-[13px]">Sent</span>
      </div>
      <div className="flex-1 min-w-0 truncate text-[13.5px]">
        <span>{draft.subject}</span>
        <span> · {draft.snippet}</span>
      </div>
      <Paperclip className="w-[15px] h-[15px] text-[#5f6368]/50 shrink-0" />
      <div className="shrink-0 text-[12px] w-[76px] text-right">now</div>
    </li>
  );
}

// -------- Compose floating window --------

function ComposeWindow({
  draft,
  sending,
  onChange,
  onSend,
  onClose,
}: {
  draft: VendorDraft;
  sending: boolean;
  onChange: (patch: Partial<VendorDraft>) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] grid place-items-center p-8 animate-fade-in-up">
      <div className="w-full max-w-[1080px] h-[calc(100vh-4rem)] bg-white rounded-lg border border-[#e8eaed] shadow-[0_20px_60px_rgba(60,64,67,0.35)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#f2f6fc] border-b border-[#e8eaed] text-[#202124]">
          <span className="text-[14px] font-medium truncate pr-4">
            {draft.subject || "New message"}
          </span>
          <div className="flex items-center gap-1 text-[#5f6368] shrink-0">
            <button className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#e8eaed] grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 border-b border-[#f1f3f4]">
          <span className="text-[12px] text-[#5f6368] w-12">From</span>
          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="font-medium">{draft.senderName}</span>
            <span className="text-[#5f6368]">&lt;{draft.senderEmail}&gt;</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 border-b border-[#f1f3f4]">
          <span className="text-[12px] text-[#5f6368] w-12">To</span>
          <input
            value={draft.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="flex-1 bg-transparent text-[14px] outline-none"
          />
          <div className="flex gap-3 text-[12.5px] text-[#5f6368]">
            <button className="hover:underline">Cc</button>
            <button className="hover:underline">Bcc</button>
          </div>
        </div>

        <div className="px-6 py-2 border-b border-[#f1f3f4]">
          <input
            value={draft.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Subject"
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-[#5f6368] placeholder:font-normal"
          />
        </div>

        <textarea
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
          className="flex-1 px-6 py-5 bg-transparent text-[15px] leading-[1.65] outline-none resize-none font-['DM_Sans',_system-ui,_sans-serif]"
        />

        <div className="px-6 pb-4">
          <AttachmentPreview draft={draft} />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-[#e8eaed]">
          <div className="flex items-center gap-1">
            <button
              disabled={sending}
              onClick={onSend}
              className={cn(
                "inline-flex items-center gap-2 pl-6 pr-4 h-10 rounded-full text-[14px] font-medium text-white",
                sending ? "bg-[#5f6368] cursor-wait" : "bg-[#0b57d0] hover:bg-[#0a4fc0]"
              )}
            >
              {sending ? "Sending…" : "Send"}
              {!sending && <ChevronDown className="w-4 h-4" />}
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <LinkIcon className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <Smile className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <ImageIcon className="w-[18px] h-[18px]" />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>
          </div>
          <button className="w-10 h-10 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Attachment preview --------

function AttachmentPreview({ draft }: { draft: VendorDraft }) {
  const invoice = seedInvoices.find((i) => i.id === draft.invoiceId);
  const vendor = invoice ? vendors[invoice.vendorKey] : null;
  if (!invoice || !vendor) return null;

  const total = invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const trimmedName =
    draft.attachment.name.length > 22 ? draft.attachment.name.slice(0, 20) + "…" : draft.attachment.name;

  return (
    <div>
      <div className="flex items-center gap-3 text-[13px] pb-3 border-t border-[#e8eaed] pt-5">
        <span className="font-medium text-[#202124]">One attachment</span>
        <span className="text-[#5f6368]">·</span>
        <span className="text-[#5f6368]">Scanned by Gmail</span>
        <HelpCircle className="w-4 h-4 text-[#5f6368]" />
        <button className="ml-4 inline-flex items-center gap-2 text-[#5f6368] hover:text-[#202124]">
          <DriveIcon />
          <span>Add to Drive</span>
        </button>
      </div>

      <div className="group w-[244px] bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(60,64,67,0.15)] hover:shadow-[0_2px_6px_rgba(60,64,67,0.25)] transition-shadow cursor-pointer">
        <div className="relative h-[200px] overflow-hidden bg-white border-b border-[#e8eaed]">
          <MiniInvoice invoice={invoice} vendor={vendor} total={total} />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-solid" style={{
            borderTopColor: "transparent",
            borderLeftColor: "transparent",
            borderRightColor: "#ea4335",
            borderBottomColor: "#ea4335",
            borderWidth: "0 0 28px 28px",
          }} />
          <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white tracking-wider">
            PDF
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <PdfIcon />
          <span className="text-[13px] font-medium truncate flex-1">{trimmedName}</span>
        </div>
      </div>
    </div>
  );
}

function MiniInvoice({
  invoice,
  vendor,
  total,
}: {
  invoice: (typeof seedInvoices)[number];
  vendor: { name: string; email: string };
  total: number;
}) {
  return (
    <div className="w-full h-full p-3 text-[6px] leading-[1.3] text-[#202124] font-sans overflow-hidden pointer-events-none">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[5px] tracking-[0.15em] font-semibold text-[#5f6368]">INVOICE</div>
          <div className="text-[9px] font-semibold mt-0.5 leading-tight">{vendor.name}</div>
          <div className="text-[5px] text-[#5f6368]">{vendor.email}</div>
        </div>
        <div className="text-right text-[5px] text-[#5f6368]">
          <div>Invoice #: {invoice.invoiceNumber}</div>
          <div>Issued: {invoice.issueDate}</div>
          <div>Due: {invoice.dueDate}</div>
        </div>
      </div>

      <div className="h-[2px] bg-[#ea4335] my-2 w-10" />

      <div className="text-[5px] text-[#5f6368]">Bill to</div>
      <div className="text-[6px] font-medium leading-tight">Greenfield Property Management</div>
      <div className="text-[5px] text-[#5f6368]">{invoice.propertyRef}</div>
      <div className="text-[5px] text-[#5f6368]">Ref PO: {invoice.poNumber}</div>

      <div className="mt-2 pb-0.5 border-b border-[#e8eaed] flex text-[4.5px] uppercase tracking-wider text-[#5f6368]">
        <span className="flex-1">Description</span>
        <span className="w-5 text-right">Qty</span>
        <span className="w-7 text-right">Unit</span>
        <span className="w-8 text-right">Total</span>
      </div>
      {invoice.lines.slice(0, 4).map((l, i) => (
        <div key={i} className="flex text-[5px] py-0.5 border-b border-[#f1f3f4]">
          <span className="flex-1 truncate pr-1">{l.description}</span>
          <span className="w-5 text-right">{l.qty}</span>
          <span className="w-7 text-right">${l.unitPrice.toFixed(2)}</span>
          <span className="w-8 text-right">${(l.qty * l.unitPrice).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-end pt-1 text-[6px]">
        <span className="text-[#5f6368] pr-2">Total due</span>
        <span className="font-semibold">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PdfIcon() {
  return (
    <div className="w-6 h-6 rounded-sm bg-[#ea4335] text-white grid place-items-center text-[8px] font-bold tracking-wider shrink-0">
      PDF
    </div>
  );
}

function DriveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7.5 3 L16.5 3 L21 11 L16.5 19 L7.5 19 L3 11 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8 L12 14 M9 11 L15 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// -------- Erin inbox --------

function ErinInbox({ emails, onOpen }: { emails: InboxEmail[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-4 px-4 h-11 border-b border-[#e8eaed] text-[#5f6368] text-[13px]">
        <div className="w-5 h-5 rounded-sm border border-[#dadce0]" />
        <span>Refresh</span>
        <span className="ml-auto text-[11.5px]">1-{emails.length} of {emails.length}</span>
      </div>
      <ul>
        {emails.map((e, i) => (
          <li
            key={e.id}
            onClick={() => onOpen(e.id)}
            className={cn(
              "flex items-center gap-3 pl-4 pr-6 py-2 border-b border-[#f1f3f4] cursor-pointer hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,0.15)]",
              e.unread ? "bg-white" : "bg-[#fafbfc]",
              i === 0 && "animate-fade-in-up"
            )}
          >
            <div className="w-5 h-5 rounded-sm border border-[#dadce0] shrink-0" />
            <Star className={cn("w-[18px] h-[18px] shrink-0", e.pinned ? "text-[#f9ab00]" : "text-[#5f6368]/40")} />
            <div className={cn("w-[180px] shrink-0 truncate flex items-center gap-3", e.unread && "font-semibold text-[#202124]")}>
              {e.avatar ? (
                <div
                  className="w-6 h-6 rounded-full text-white grid place-items-center shrink-0 text-[10px] font-semibold"
                  style={{ background: e.avatar.color }}
                >
                  {e.avatar.initials}
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#d93025] text-white grid place-items-center shrink-0">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <span className="truncate text-[13.5px]">{e.fromName}</span>
            </div>
            <div className="flex-1 min-w-0 truncate text-[13.5px]">
              <span className={cn(e.unread && "font-semibold text-[#202124]")}>{e.subject}</span>
              <span className="text-[#5f6368]"> · {e.snippet}</span>
            </div>
            <div className={cn("shrink-0 text-[12px] w-[76px] text-right", e.unread ? "text-[#202124] font-semibold" : "text-[#5f6368]")}>
              {e.receivedAt}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailReader({ email, onBack }: { email: InboxEmail; onBack: () => void }) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 h-11 border-b border-[#e8eaed] text-[#5f6368] shrink-0">
        <ToolbarBtn icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={onBack} tooltip="Back" />
        <span className="mx-1 w-px h-5 bg-[#e8eaed]" />
        <ToolbarBtn icon={<Archive className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<AlertOctagon className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Trash2 className="w-4.5 h-4.5" />} />
        <span className="mx-1 w-px h-5 bg-[#e8eaed]" />
        <ToolbarBtn icon={<MailOpen className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Clock className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<FolderInput className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<Tag className="w-4.5 h-4.5" />} />
        <ToolbarBtn icon={<MoreVertical className="w-4.5 h-4.5" />} />
        <div className="ml-auto flex items-center gap-1 text-[12px] text-[#5f6368]">
          <ToolbarBtn icon={<ChevronLeft className="w-4.5 h-4.5" />} />
          <ToolbarBtn icon={<ChevronRight className="w-4.5 h-4.5" />} />
        </div>
      </div>

      <div className="max-w-[980px] mx-auto w-full px-8 pt-5 pb-10">
        {/* Subject */}
        <div className="flex items-start gap-3 pl-[52px]">
          <h1 className="text-[22px] font-normal flex-1 text-[#202124]">{email.subject}</h1>
          <span className="inline-flex items-center gap-1 bg-[#f1f3f4] text-[#5f6368] text-[11px] rounded px-2 py-0.5 whitespace-nowrap mt-1">
            Inbox <X className="w-3 h-3" />
          </span>
          <button className="text-[#5f6368] hover:bg-[#f1f3f4] rounded-full w-9 h-9 grid place-items-center ml-1">
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Sender */}
        <div className="flex items-start gap-3 mt-5">
          <div className="relative shrink-0">
            {email.avatar ? (
              <div
                className="w-10 h-10 rounded-full text-white grid place-items-center text-[14px] font-semibold"
                style={{ background: email.avatar.color }}
              >
                {email.avatar.initials}
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-[#d93025] text-white grid place-items-center">
                  <Sparkles className="w-[17px] h-[17px]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white grid place-items-center">
                  <BadgeCheck className="w-4 h-4 text-[#1a73e8] fill-[#1a73e8] stroke-white" />
                </span>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[14px] font-semibold text-[#202124]">{email.fromName}</span>
              <span className="text-[13px] text-[#5f6368]">&lt;{email.fromEmail}&gt;</span>
            </div>
            <div className="flex items-center gap-1 text-[12.5px] text-[#5f6368] mt-0.5">
              <span>to me</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-[#5f6368]">
            <span className="text-[12.5px] mr-1">
              {email.receivedAt} <span>({email.receivedAgo})</span>
            </span>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <Star className="w-4.5 h-4.5" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <Reply className="w-4.5 h-4.5" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center">
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Branded email body */}
        <div className="mt-4 pl-[52px]">
          <BrandedEmailBody email={email} />
        </div>

        {/* Reply / Forward pill buttons */}
        <div className="mt-6 pl-[52px] flex items-center gap-2">
          <ActionButton icon={<Reply className="w-4 h-4" />} label="Reply" />
          <ActionButton icon={<Forward className="w-4 h-4" />} label="Forward" />
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, onClick, tooltip }: { icon: React.ReactNode; onClick?: () => void; tooltip?: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="w-9 h-9 rounded-full hover:bg-[#f1f3f4] grid place-items-center text-[#5f6368]"
    >
      {icon}
    </button>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] text-[13.5px] text-[#202124]">
      {icon}
      {label}
    </button>
  );
}

function BrandedEmailBody({ email }: { email: InboxEmail }) {
  if (email.isFiller) {
    return (
      <div className="max-w-[620px] text-[14px] leading-[1.65] text-[#202124] whitespace-pre-wrap">
        {email.body}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[#e8eaed] bg-white overflow-hidden max-w-[620px]">
      {/* Branded header */}
      <div className="px-6 py-5 bg-[#1b2a4a] text-white flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/15 grid place-items-center">
          <Sparkles className="w-4 h-4 text-[#ccfbf1]" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
          <div className="text-[11.5px] text-white/65">Your AP assistant · Greenfield PM</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-7 py-6 text-[14px] leading-[1.65] text-[#202124] whitespace-pre-wrap">
        {email.body}
      </div>

      {/* CTA */}
      {email.ctaLabel && email.ctaHref && (
        <div className="px-7 pb-6">
          <a
            href={email.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-[#0d9488] text-white text-[13.5px] font-medium hover:bg-[#0b807a] no-underline"
          >
            {email.ctaLabel}
            <ChevronRight className="w-4 h-4" />
          </a>
          {email.ctaHint && <div className="mt-2 text-[12px] text-[#5f6368]">{email.ctaHint}</div>}
        </div>
      )}

      {/* Footer */}
      <div className="px-7 py-4 bg-[#f6f8fc] border-t border-[#e8eaed] text-[11px] text-[#5f6368] flex items-center justify-between flex-wrap gap-2">
        <span>Sent by PayablePilot on behalf of Greenfield Property Management.</span>
        <span className="flex items-center gap-3">
          <a className="hover:underline cursor-pointer">Preferences</a>
          <span>·</span>
          <a className="hover:underline cursor-pointer">Audit trail</a>
        </span>
      </div>
    </div>
  );
}
