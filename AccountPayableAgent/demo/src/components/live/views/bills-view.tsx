"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Sparkles,
  Trash2,
  ChevronDown,
  Briefcase,
  Tag,
  User,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  Upload,
} from "lucide-react";
import type { LiveView } from "../sidebar-live";
import { cn } from "@/lib/utils";
import {
  CapturedInvoice,
  loadCaptured,
  removeCaptured,
  updateCaptured,
} from "@/lib/captured-store";
import { UploadInvoiceModalLive } from "../upload-invoice-modal-live";

type Vendor = { Id: string; DisplayName: string };
type Project = { Id: string; DisplayName: string };
type Account = { Id: string; Name: string; AccountType?: string };

export function BillsView({ onNavigate }: { onNavigate: (v: LiveView) => void }) {
  const [items, setItems] = useState<CapturedInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [posting, setPosting] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Load captured + listen for changes elsewhere in the app.
  useEffect(() => {
    function refresh() {
      setItems(loadCaptured());
    }
    refresh();
    window.addEventListener("pp:captured:changed", refresh);
    return () => window.removeEventListener("pp:captured:changed", refresh);
  }, [refreshKey]);

  // Pull QBO reference data once. cache: 'no-store' so a stale 25-vendor
  // response from before we bumped the listVendors limit doesn't keep coming
  // back from the browser cache and starve the auto-matcher.
  useEffect(() => {
    Promise.all([
      fetch("/api/integrations/qbo/vendors", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { vendors: [] })),
      fetch("/api/integrations/qbo/projects", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { projects: [] })),
      fetch("/api/integrations/qbo/accounts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { accounts: [] })),
    ]).then(([v, p, a]) => {
      setVendors(v.vendors ?? []);
      setProjects(p.projects ?? []);
      setAccounts(a.accounts ?? []);
    });
  }, []);

  // Auto-coding pass: when reference data lands, fill vendor / project / account
  // for every untouched captured invoice. The user's manual overrides
  // (qbo*Source === "manual") are never re-touched.
  useEffect(() => {
    if (items.length === 0) return;
    items.forEach(async (it) => {
      const patch: Partial<CapturedInvoice> = {};

      // Vendor — fuzzy name match against the loaded list. If the loaded list
      // doesn't include the vendor (QBO sandbox sometimes silently truncates
      // the listVendors response), fall back to a direct exact-name lookup.
      if (vendors.length > 0 && !it.qboVendorId && it.vendorName) {
        let match: Vendor | null = fuzzyVendorMatch(it.vendorName, vendors);
        if (!match) {
          // Direct query — different code path from listVendors, hits the
          // single-vendor lookup we know works reliably.
          try {
            const url = new URL("/api/integrations/qbo/vendors/find", window.location.origin);
            url.searchParams.set("name", it.vendorName);
            const res = await fetch(url.toString(), { cache: "no-store" });
            if (res.ok) {
              const data = (await res.json()) as { vendor?: Vendor | null };
              if (data.vendor?.Id) match = data.vendor;
            }
          } catch {
            /* swallow — auto-coding is best-effort */
          }
        }
        if (match) {
          patch.qboVendorId = match.Id;
          patch.qboVendorName = match.DisplayName;
          patch.qboVendorSource = "auto";
        }
      }

      // Project — fuzzy match against everything we know about the invoice
      // that could mention a job/property. We feed the matcher the explicit
      // project_ref, every line item's per-line project_ref, the line-item
      // descriptions (often carry the property/unit), and the vendor name.
      // Catches cases where Claude returned just the bare job number for
      // project_ref but the full project name appears in line items.
      if (!it.qboProjectId) {
        const haystack = [
          it.projectRefRaw ?? "",
          ...it.lines.map((l) => l.projectRef ?? ""),
          ...it.lines.map((l) => l.description),
          it.vendorName ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        let projMatch: Project | null = null;
        if (projects.length > 0 && haystack) {
          projMatch = fuzzyProjectMatch(haystack, projects);
        }
        if (projMatch) {
          patch.qboProjectId = projMatch.Id;
          patch.qboProjectName = projMatch.DisplayName;
          patch.qboProjectSource = "auto";
        } else if (it.projectRefRaw && it.projectRefRaw.trim().length > 0) {
          // No fuzzy match but the invoice clearly mentions a project. Create
          // it in QBO so the bookkeeper doesn't have to switch tabs.
          try {
            const res = await fetch("/api/integrations/qbo/projects/find-or-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: it.projectRefRaw }),
              cache: "no-store",
            });
            if (res.ok) {
              const data = (await res.json()) as {
                project?: { Id: string; DisplayName: string };
                created?: boolean;
              };
              if (data.project?.Id) {
                patch.qboProjectId = data.project.Id;
                patch.qboProjectName = data.project.DisplayName;
                patch.qboProjectSource = data.created ? "created" : "auto";
                // Refresh the local projects list so other rows can fuzzy-match
                // against the newly created project on the next render.
                setProjects((prev) =>
                  prev.some((p) => p.Id === data.project!.Id)
                    ? prev
                    : [...prev, { Id: data.project!.Id, DisplayName: data.project!.DisplayName }]
                );
              }
            }
          } catch {
            /* swallow — auto-coding is best-effort */
          }
        }
      }

      // Expense account — keyword-based suggestion against line-item descriptions.
      if (accounts.length > 0 && !it.qboAccountId) {
        const match = suggestAccount(it, accounts);
        if (match) {
          patch.qboAccountId = match.Id;
          patch.qboAccountName = match.Name;
          patch.qboAccountSource = "auto";
        }
      }

      if (Object.keys(patch).length > 0) {
        updateCaptured(it.id, patch);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors.length, projects.length, accounts.length, items.length]);

  // Duplicate detection runs in two layers:
  //   (a) local — within the bills queue itself. If two captured invoices share
  //       (vendorName-or-vendorId, invoiceNumber), the more recently created
  //       one is flagged as a dup of the earlier one. Catches the case where
  //       the same invoice arrives via email AND was uploaded manually before
  //       either has been posted.
  //   (b) remote — query QBO for an existing Bill on the same (vendorId,
  //       docNumber). Catches the case where the user already posted a bill
  //       and is now seeing the same invoice come in again.
  useEffect(() => {
    // ---------- (a) local duplicate detection ----------
    // Build an index of (vendor, invoiceNumber) → earliest captured invoice.
    // Posted rows DO go into the index — they're valid anchors for flagging
    // any subsequent extracted/ready row that's about to post the same bill.
    // Only the flagging step skips already-posted rows (no need to block).
    const seen = new Map<string, CapturedInvoice>();
    const pending: Array<{ id: string; dupId: string }> = [];
    const cleared: string[] = [];
    [...items]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((it) => {
        if (!it.invoiceNumber) return;
        const key = `${(it.qboVendorId ?? it.vendorName ?? "?").toLowerCase()}::${it.invoiceNumber.toLowerCase()}`;
        const earlier = seen.get(key);
        if (earlier && it.id !== earlier.id) {
          if (it.status === "posted") return; // already in QBO — nothing to block
          // Prefer the earlier row's QBO bill ID if it's been posted; that
          // gives the user a real reference. Otherwise fall back to a local:
          // tag so the banner can switch its copy.
          const tag = earlier.qboBillId
            ? earlier.qboBillId
            : `local:${earlier.id}`;
          if (it.duplicateOfBillId !== tag) pending.push({ id: it.id, dupId: tag });
        } else {
          seen.set(key, it);
          // Clear a stale local-dup flag if there's no longer a conflict.
          if (typeof it.duplicateOfBillId === "string" && it.duplicateOfBillId.startsWith("local:")) {
            cleared.push(it.id);
          }
        }
      });
    pending.forEach(({ id, dupId }) => updateCaptured(id, { duplicateOfBillId: dupId }));
    cleared.forEach((id) => updateCaptured(id, { duplicateOfBillId: null }));

    // ---------- (b) remote duplicate detection ----------
    items.forEach(async (it) => {
      if (it.status === "posted") return;
      if (!it.qboVendorId || !it.invoiceNumber) return;
      // Skip if already flagged (local or remote). Re-running for already-
      // classified rows would also be ok, but we'd hammer the API.
      if (it.duplicateOfBillId !== null && it.duplicateOfBillId !== undefined) return;
      try {
        const url = new URL("/api/integrations/qbo/bills/check", window.location.origin);
        url.searchParams.set("vendorId", it.qboVendorId);
        url.searchParams.set("docNumber", it.invoiceNumber);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { existing?: { Id?: string } | null };
        const dupId = data.existing?.Id ?? null;
        if (dupId) updateCaptured(it.id, { duplicateOfBillId: dupId });
      } catch {
        /* swallow — duplicate check is best-effort */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.id}:${i.qboVendorId ?? ""}:${i.vendorName ?? ""}:${i.invoiceNumber ?? ""}:${i.status}`).join("|")]);

  const reviewable = items.filter((i) => i.status === "extracted" || i.status === "ready" || i.status === "error");
  const posted = items.filter((i) => i.status === "posted");

  const post = async (it: CapturedInvoice) => {
    if (!it.qboVendorId) return;
    if (it.lines.length === 0 && it.total == null) return;
    if (!it.qboAccountId) return;
    if (it.duplicateOfBillId) return;
    setPosting(it.id);
    try {
      const lines =
        it.lines.length > 0
          ? it.lines.map((li) => ({
              description: li.description || it.invoiceNumber || "Invoice",
              amount: li.amount ?? li.unitPrice ?? 0,
              accountId: it.qboAccountId!,
            }))
          : [
              {
                description: it.invoiceNumber ?? "Invoice",
                amount: it.total ?? 0,
                accountId: it.qboAccountId!,
              },
            ];
      const res = await fetch("/api/integrations/qbo/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: it.qboVendorId,
          txnDate: it.issueDate ?? new Date().toISOString().slice(0, 10),
          docNumber: it.invoiceNumber ?? undefined,
          projectId: it.qboProjectId ?? undefined,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      updateCaptured(it.id, {
        status: "posted",
        qboBillId: data.bill?.Id ?? null,
        postedAt: new Date().toISOString(),
        errorMessage: null,
      });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      updateCaptured(it.id, { status: "error", errorMessage: (e as Error).message });
      setRefreshKey((k) => k + 1);
    } finally {
      setPosting(null);
    }
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Bills to post</div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Review and post to QuickBooks</h1>
            <p className="mt-1 text-sm text-muted max-w-prose">
              Each row is an invoice from your inbox or a manual upload. PayablePilot has already coded the vendor,
              project, and expense account where it could — confirm and post. PayablePilot doesn&apos;t pay anything;
              you release payment from inside QuickBooks.
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 shrink-0"
          >
            <Upload className="w-4 h-4" /> Upload invoice
          </button>
        </div>
        <UploadInvoiceModalLive open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => onNavigate("bills")} />

        {reviewable.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
            <div className="text-[15px] font-medium mb-1">Nothing in the queue.</div>
            <div className="text-[13px] text-muted max-w-md mx-auto">
              Open the inbox and click Extract on a PDF, or upload one manually. Once extracted, the bill lands here for
              your review.
            </div>
            <button
              onClick={() => onNavigate("inbox")}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90"
            >
              Open inbox <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {reviewable.length > 0 && (
          <div className="space-y-3">
            {reviewable.map((it) => (
              <BillRow
                key={it.id}
                item={it}
                vendors={vendors}
                projects={projects}
                accounts={accounts}
                posting={posting === it.id}
                onPost={() => post(it)}
                onChangeVendor={(id, name) =>
                  updateCaptured(it.id, { qboVendorId: id, qboVendorName: name, qboVendorSource: "manual" })
                }
                onChangeProject={(id, name) =>
                  updateCaptured(it.id, { qboProjectId: id, qboProjectName: name, qboProjectSource: "manual" })
                }
                onChangeAccount={(id, name) =>
                  updateCaptured(it.id, { qboAccountId: id, qboAccountName: name, qboAccountSource: "manual" })
                }
                onMarkReady={() => updateCaptured(it.id, { status: "ready" })}
                onRemove={() => removeCaptured(it.id)}
              />
            ))}
          </div>
        )}

        {posted.length > 0 && (
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Posted to QuickBooks ({posted.length})
              </span>
              <a
                href={qboBillsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground"
              >
                Open in QuickBooks <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <ul>
              {posted.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-700 grid place-items-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium truncate">
                      {it.qboVendorName ?? it.vendorName ?? "Unknown vendor"} · {it.invoiceNumber ?? "—"}
                    </div>
                    <div className="text-[11.5px] text-muted truncate">
                      {it.qboBillId ? (
                        <a
                          href={qboBillUrl(it.qboBillId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          Bill #{it.qboBillId}
                        </a>
                      ) : (
                        "Bill #—"
                      )}
                      {" · "}
                      {it.qboAccountName ?? "GL"}
                      {it.qboProjectName ? ` · ${it.qboProjectName}` : ""} · posted{" "}
                      {it.postedAt ? new Date(it.postedAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums">
                    {it.total != null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: it.currency || "USD" }).format(it.total)
                      : "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function BillRow({
  item,
  vendors,
  projects,
  accounts,
  posting,
  onPost,
  onChangeVendor,
  onChangeProject,
  onChangeAccount,
  onMarkReady,
  onRemove,
}: {
  item: CapturedInvoice;
  vendors: Vendor[];
  projects: Project[];
  accounts: Account[];
  posting: boolean;
  onPost: () => void;
  onChangeVendor: (id: string, name: string) => void;
  onChangeProject: (id: string | null, name: string | null) => void;
  onChangeAccount: (id: string, name: string) => void;
  onMarkReady: () => void;
  onRemove: () => void;
}) {
  // Bills queue rows ship collapsed so the user sees a clean list at a glance.
  // Click the chevron / row to drill in.
  const [expanded, setExpanded] = useState(false);
  const isPostable =
    !!item.qboVendorId &&
    !!item.qboAccountId &&
    (item.total != null || item.lines.length > 0) &&
    !item.duplicateOfBillId;
  const fmt = (n: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency || "USD" }).format(n);

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3">
        <StatusBadge status={item.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold truncate">
              {item.qboVendorName ?? item.vendorName ?? "Vendor unknown"}
            </span>
            <span className="text-muted text-[13px]">·</span>
            <span className="text-[13px] text-muted">{item.invoiceNumber ?? "no #"}</span>
            {item.duplicateOfBillId ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10.5px] font-semibold">
                <AlertCircle className="w-2.5 h-2.5" /> Duplicate
              </span>
            ) : (
              item.qboVendorSource === "auto" &&
              item.qboAccountSource === "auto" &&
              item.status !== "posted" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-soft text-brand text-[10.5px] font-semibold">
                  <Sparkles className="w-2.5 h-2.5" /> Auto-coded
                </span>
              )
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-muted truncate">
            {item.source.kind === "gmail"
              ? `From ${item.source.fromName || item.source.fromEmail}`
              : `Uploaded ${item.source.fileName}`}
            {item.issueDate ? ` · issued ${item.issueDate}` : ""}
            {item.dueDate ? ` · due ${item.dueDate}` : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-semibold tabular-nums">{fmt(item.total)}</div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-2 text-muted hover:text-foreground p-1.5 rounded"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-5 space-y-4 bg-surface/40">
          {item.duplicateOfBillId && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                {item.duplicateOfBillId.startsWith("local:") ? (
                  <>
                    <div className="font-semibold">Duplicate of another row in this queue.</div>
                    <div className="mt-0.5 text-rose-700/90">
                      Another captured invoice with the same vendor and invoice number is already waiting to post.
                      Posting blocked. Remove this row, or change the invoice number if these are different bills.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">Duplicate of bill #{item.duplicateOfBillId} in QuickBooks.</div>
                    <div className="mt-0.5 text-rose-700/90">
                      This vendor + invoice number combination is already on file. Posting blocked. Remove this row, or
                      change the invoice number if this is genuinely a different bill.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {item.errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {item.errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RefPicker
              icon={<User className="w-3.5 h-3.5" />}
              label="Vendor"
              required
              value={item.qboVendorId}
              valueLabel={item.qboVendorName}
              extractedHint={item.vendorName}
              autoPicked={item.qboVendorSource === "auto"}
              options={vendors.map((v) => ({ id: v.Id, label: v.DisplayName }))}
              onChange={(id, name) => onChangeVendor(id!, name!)}
              emptyMessage="No QuickBooks vendors yet. Connect QBO from settings."
            />
            <RefPicker
              icon={<Briefcase className="w-3.5 h-3.5" />}
              label="Project / Job"
              value={item.qboProjectId}
              valueLabel={item.qboProjectName}
              extractedHint={item.projectRefRaw}
              autoPicked={item.qboProjectSource === "auto" || item.qboProjectSource === "created"}
              autoPickedLabel={item.qboProjectSource === "created" ? "Created in QBO" : "Auto"}
              clearable
              options={projects.map((p) => ({ id: p.Id, label: p.DisplayName }))}
              onChange={(id, name) => onChangeProject(id, name)}
              emptyMessage="No projects in QuickBooks. Enable Projects (Settings → Account → Advanced) and refresh."
            />
            <RefPicker
              icon={<Tag className="w-3.5 h-3.5" />}
              label="Expense account"
              required
              value={item.qboAccountId}
              valueLabel={item.qboAccountName}
              autoPicked={item.qboAccountSource === "auto"}
              options={accounts.map((a) => ({ id: a.Id, label: a.Name }))}
              onChange={(id, name) => onChangeAccount(id!, name!)}
              emptyMessage="No expense accounts. Check QuickBooks chart of accounts."
            />
          </div>

          {item.lines.length > 0 && (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand" /> Extracted line items ({item.lines.length})
              </div>
              <ul>
                {item.lines.slice(0, 6).map((li, i) => (
                  <li key={i} className="flex items-start gap-3 px-3 py-2 border-b border-border last:border-0 text-[12.5px]">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{li.description}</div>
                      {li.projectRef && (
                        <div className="text-[11px] text-brand font-medium">Job ref: {li.projectRef}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0 tabular-nums w-24 text-muted">
                      {li.quantity != null && `${li.quantity} ×`} {li.unitPrice != null && fmt(li.unitPrice)}
                    </div>
                    <div className="text-right shrink-0 tabular-nums w-24">{fmt(li.amount)}</div>
                  </li>
                ))}
                {item.lines.length > 6 && (
                  <li className="px-3 py-2 text-[11.5px] text-muted">+{item.lines.length - 6} more</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] text-muted hover:text-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
            <div className="flex items-center gap-2">
              {item.status === "extracted" && (
                <button
                  onClick={onMarkReady}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12.5px] hover:bg-surface"
                >
                  Mark ready
                </button>
              )}
              <button
                onClick={onPost}
                disabled={!isPostable || posting}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12.5px] font-medium",
                  !isPostable || posting
                    ? "bg-surface text-muted border border-border cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
                title={
                  item.duplicateOfBillId
                    ? "Already in QuickBooks — posting blocked"
                    : !isPostable
                      ? "Pick a vendor and an expense account first"
                      : "Post this bill to QuickBooks"
                }
              >
                {posting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    Post bill to QuickBooks <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CapturedInvoice["status"] }) {
  const map: Record<CapturedInvoice["status"], { tone: string; label: string }> = {
    extracted: { tone: "bg-brand-soft text-brand", label: "Extracted" },
    ready: { tone: "bg-amber-100 text-amber-900", label: "Ready" },
    posted: { tone: "bg-emerald-100 text-emerald-800", label: "Posted" },
    error: { tone: "bg-rose-100 text-rose-800", label: "Error" },
  };
  const v = map[status];
  return (
    <span className={cn("inline-flex items-center text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded", v.tone)}>
      {v.label}
    </span>
  );
}

function RefPicker({
  icon,
  label,
  value,
  valueLabel,
  extractedHint,
  autoPicked,
  autoPickedLabel,
  options,
  onChange,
  required,
  clearable,
  emptyMessage,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  valueLabel: string | null | undefined;
  extractedHint?: string | null;
  autoPicked?: boolean;
  autoPickedLabel?: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string | null, name: string | null) => void;
  required?: boolean;
  clearable?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
  }, [options, filter]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full text-left rounded-md border bg-background hover:bg-surface px-3 py-2 transition-colors",
          autoPicked
            ? "border-brand/40"
            : required && !value
              ? "border-amber-300"
              : "border-border"
        )}
      >
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted font-medium">
          {icon} {label}
          {autoPicked && (
            <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-brand-soft text-brand normal-case tracking-normal text-[10px]">
              <Sparkles className="w-2.5 h-2.5" /> {autoPickedLabel ?? "Auto"}
            </span>
          )}
          {!autoPicked && required && !value && <span className="text-amber-700 ml-auto">required</span>}
        </div>
        <div className="mt-0.5 text-[13px] truncate">
          {valueLabel ? (
            <span className="font-medium">{valueLabel}</span>
          ) : (
            <span className="text-muted">— pick {label.toLowerCase()}</span>
          )}
        </div>
        {extractedHint && !valueLabel && (
          <div className="text-[11px] text-muted mt-0.5">
            <Sparkles className="w-2.5 h-2.5 inline-block mr-1 text-brand" />
            From invoice: <span className="text-foreground">{extractedHint}</span>
          </div>
        )}
        {valueLabel && extractedHint && extractedHint.toLowerCase() !== valueLabel.toLowerCase() && !autoPicked && (
          <div className="text-[11px] text-muted mt-0.5">Invoice said: {extractedHint}</div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-40 rounded-md border border-border bg-background shadow-[0_12px_32px_rgba(15,23,42,0.18)] overflow-hidden">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full px-3 py-2 text-[13px] outline-none border-b border-border bg-background"
            />
            {clearable && value && (
              <button
                onClick={() => {
                  onChange(null, null);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-[12.5px] text-rose-700 hover:bg-rose-50 border-b border-border"
              >
                Clear assignment
              </button>
            )}
            {options.length === 0 && (
              <div className="px-3 py-3 text-[12.5px] text-muted">{emptyMessage ?? "No options"}</div>
            )}
            <ul className="max-h-[280px] overflow-auto">
              {filtered.map((o) => {
                const selected = o.id === value;
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => {
                        onChange(o.id, o.label);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] hover:bg-surface",
                        selected && "bg-brand-soft text-foreground font-medium"
                      )}
                    >
                      {o.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// Sandbox QBO URLs. When we move to production, swap to https://qbo.intuit.com.
function qboBillsUrl(): string {
  return "https://sandbox.qbo.intuit.com/app/bills";
}
function qboBillUrl(id: string): string {
  return `https://sandbox.qbo.intuit.com/app/bill?txnId=${encodeURIComponent(id)}`;
}

function fuzzyVendorMatch(extracted: string, vendors: Vendor[]): Vendor | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(extracted);
  if (!target) return null;
  // Exact normalized match wins.
  for (const v of vendors) if (norm(v.DisplayName) === target) return v;
  // Otherwise prefer the candidate whose normalized form contains the target.
  for (const v of vendors) {
    const n = norm(v.DisplayName);
    if (n.includes(target) || target.includes(n)) return v;
  }
  return null;
}

// Project fuzzy match. Real-world inputs are messy: Claude sometimes returns
// the full descriptive job line, sometimes just the bare job number ("JOB-2026-0418"),
// sometimes neither and only the property address shows up in line items. So
// the matcher tries three passes, in order:
//   1. Substring   — project name appears verbatim in the extracted haystack
//   2. Numeric     — the project name's number tokens (with leading zeros
//                    stripped) appear in the haystack ("0418" matches "418")
//   3. Token overlap — non-numeric word overlap with a soft threshold
function fuzzyProjectMatch(extracted: string, projects: Project[]): Project | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const haystack = normalize(extracted);
  if (!haystack) return null;

  // Pass 1: project name fully contained in the extracted text.
  for (const p of projects) {
    const cand = normalize(p.DisplayName);
    if (cand && haystack.includes(cand)) return p;
  }

  // Tokens that pass our minimum length, plus leading-zero-stripped numeric variants.
  const tokens = (s: string) => {
    const out: string[] = [];
    for (const t of normalize(s).split(" ")) {
      if (t.length < 3) continue;
      out.push(t);
      if (/^\d+$/.test(t)) {
        const stripped = t.replace(/^0+/, "");
        if (stripped && stripped !== t && stripped.length >= 1) out.push(stripped);
      }
    }
    return out;
  };
  const haystackTokens = new Set(tokens(extracted));

  // Pass 2: numeric-token match. If the project's distinctive numbers
  // (job/unit/property #) appear in the haystack, that's usually enough on its
  // own — addresses are unique signals.
  for (const p of projects) {
    const candTokens = tokens(p.DisplayName);
    const numericCand = candTokens.filter((t) => /\d/.test(t));
    if (numericCand.length === 0) continue;
    const numericHits = numericCand.filter((t) => haystackTokens.has(t)).length;
    if (numericHits >= 1) return p;
  }

  // Pass 3: word-overlap fallback with a soft threshold (was 0.4, lowered to
  // 0.25 so a short project name with a couple of matching tokens wins).
  let best: { p: Project; score: number } | null = null;
  for (const p of projects) {
    const candTokens = tokens(p.DisplayName);
    if (candTokens.length === 0) continue;
    const overlap = candTokens.filter((t) => haystackTokens.has(t)).length;
    if (overlap === 0) continue;
    const score = overlap / Math.min(candTokens.length, haystackTokens.size);
    if (!best || score > best.score) best = { p, score };
  }
  return best && best.score >= 0.25 ? best.p : null;
}

// Pick an expense account based on what the invoice looks like. Heuristic
// pass first (HVAC repair → Repairs & Maintenance, etc.), then a sensible
// fallback so the row is always postable in one click.
function suggestAccount(invoice: CapturedInvoice, accounts: Account[]): Account | null {
  if (accounts.length === 0) return null;
  const text = [
    invoice.vendorName ?? "",
    invoice.projectRefRaw ?? "",
    ...invoice.lines.map((l) => l.description),
  ]
    .join(" ")
    .toLowerCase();

  // Ordered list of (description-keyword regex, account-name preference). First
  // hit wins; within a hit we pick the best-named account that matches.
  const rules: Array<{ test: RegExp; preferred: RegExp }> = [
    { test: /\b(hvac|tune.?up|filter|refrigerant|condenser|coil|heating|cooling|repair|service|maintenance|labor)\b/i, preferred: /repair|maintenance/i },
    { test: /\b(supplies|parts|materials|equipment|hardware)\b/i, preferred: /supplies|materials|parts/i },
    { test: /\b(office|paper|toner|stationery)\b/i, preferred: /office/i },
    { test: /\b(software|saas|subscription|license|api)\b/i, preferred: /software|subscription|computer/i },
    { test: /\b(travel|uber|lyft|airfare|hotel|lodging|mileage)\b/i, preferred: /travel|auto|vehicle/i },
    { test: /\b(advertising|marketing|ads)\b/i, preferred: /advertis|marketing/i },
    { test: /\b(rent|lease|sublet)\b/i, preferred: /rent|lease/i },
    { test: /\b(utility|electric|water|gas|internet|phone|telecom)\b/i, preferred: /utilit|telephone|internet/i },
    { test: /\b(insurance|premium|coverage)\b/i, preferred: /insurance/i },
    { test: /\b(legal|attorney|professional|consult|accounting|audit)\b/i, preferred: /professional|legal|consult/i },
  ];

  for (const r of rules) {
    if (r.test.test(text)) {
      const hit = accounts.find((a) => r.preferred.test(a.Name));
      if (hit) return hit;
    }
  }

  // Fallbacks: prefer Repairs & Maintenance, then any account with "expense"
  // or "supplies" in the name, then the first available expense account.
  return (
    accounts.find((a) => /repair|maintenance/i.test(a.Name)) ??
    accounts.find((a) => /office.?(expense|supplies)/i.test(a.Name)) ??
    accounts.find((a) => /supplies/i.test(a.Name)) ??
    accounts[0]
  );
}
