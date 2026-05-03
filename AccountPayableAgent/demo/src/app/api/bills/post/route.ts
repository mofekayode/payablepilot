// POST /api/bills/post
// Body: { inboxMessageId: string }
//
// Closes the loop: takes a routed + extracted invoice and pushes it to
// QuickBooks as a Bill. Auto-resolves vendor (creates if missing),
// project (creates under the first available customer if missing), and
// the GL account (uses the first active expense account as default).
// Runs the duplicate check before creating to avoid double-posting.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireActiveBusinessId } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  findVendorByName,
  createVendor,
  findProjectByName,
  createProject,
  findExistingBill,
  listCustomers,
  listAccounts,
  createBill,
} from "@/lib/integrations/qbo";
import { logAudit } from "@/lib/audit/log";

type ExtractedFields = {
  vendor_name?: string | null;
  vendor_email?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  project_ref?: string | null;
  total?: number | null;
  line_items?: Array<{ description: string; amount: number | null; project_ref: string | null }>;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  const businessId = await requireActiveBusinessId().catch(() => null);
  if (!businessId) return new NextResponse("no_active_business", { status: 400 });

  let body: { inboxMessageId?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }
  const inboxMessageId = body.inboxMessageId;
  if (!inboxMessageId) return new NextResponse("inboxMessageId_required", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: msg, error: fetchErr } = await supabase
    .from("inbox_messages")
    .select("id, business_id, extracted_fields, posted_at, from_email")
    .eq("id", inboxMessageId)
    .maybeSingle();
  if (fetchErr) return new NextResponse(fetchErr.message, { status: 500 });
  if (!msg) return new NextResponse("not_found", { status: 404 });
  if (msg.business_id !== businessId) return new NextResponse("forbidden", { status: 403 });
  if (msg.posted_at) return NextResponse.json({ ok: true, alreadyPosted: true });

  const fields = (msg.extracted_fields ?? {}) as ExtractedFields;
  if (!fields.vendor_name) {
    return NextResponse.json({ ok: false, error: "Vendor name not extracted." }, { status: 400 });
  }
  if (!fields.total || fields.total <= 0) {
    return NextResponse.json({ ok: false, error: "Invoice total not extracted." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    // 1. Resolve vendor (find, else create).
    let vendor = await findVendorByName(fields.vendor_name);
    if (!vendor) {
      vendor = await createVendor({
        displayName: fields.vendor_name,
        email: fields.vendor_email ?? undefined,
      });
    }

    // 2. Duplicate check: same vendor + same invoice number = held.
    if (fields.invoice_number) {
      const existing = await findExistingBill(vendor.Id, fields.invoice_number);
      if (existing) {
        await admin
          .from("inbox_messages")
          .update({
            posting_error: `Duplicate of QBO Bill ${existing.Id} (DocNumber ${fields.invoice_number}).`,
          })
          .eq("id", msg.id);
        return NextResponse.json(
          {
            ok: false,
            duplicate: true,
            existingBillId: existing.Id,
            error: `This invoice number is already in QuickBooks (Bill ${existing.Id}).`,
          },
          { status: 409 }
        );
      }
    }

    // 3. Resolve project (find, else create under the first available customer).
    let projectId: string | undefined;
    if (fields.project_ref) {
      const existing = await findProjectByName(fields.project_ref);
      if (existing) {
        projectId = existing.Id;
      } else {
        const customers = await listCustomers(50);
        const parent = customers.find((c) => c.Active !== false);
        if (parent) {
          const created = await createProject(fields.project_ref, parent.Id);
          if (created) projectId = created.Id;
        }
      }
    }

    // 4. Pick a default expense account.
    const accounts = await listAccounts(50);
    const defaultAccount = accounts[0];
    if (!defaultAccount) {
      return NextResponse.json({ ok: false, error: "No expense account in QuickBooks." }, { status: 400 });
    }

    // 5. Build the bill. Prefer line items if extraction got them; else
    //    fall back to a single line for the total.
    const txnDate = fields.issue_date || new Date().toISOString().slice(0, 10);
    const lines = (fields.line_items ?? [])
      .filter((l) => l.amount && l.amount > 0)
      .map((l) => ({
        description: l.description,
        amount: l.amount as number,
        accountId: defaultAccount.Id,
      }));
    if (lines.length === 0) {
      lines.push({
        description: fields.invoice_number
          ? `Invoice ${fields.invoice_number}`
          : `${fields.vendor_name} invoice`,
        amount: fields.total,
        accountId: defaultAccount.Id,
      });
    }

    const bill = await createBill({
      vendorId: vendor.Id,
      txnDate,
      docNumber: fields.invoice_number ?? undefined,
      projectId,
      lines,
    });

    // 6. Mark the message posted.
    await admin
      .from("inbox_messages")
      .update({
        posted_at: new Date().toISOString(),
        qbo_bill_id: bill.Id,
        qbo_vendor_id: vendor.Id,
        qbo_project_id: projectId ?? null,
        posting_error: null,
      })
      .eq("id", msg.id);

    await logAudit({
      action: "bill.posted",
      businessId,
      actorUserId: user.id,
      details: {
        inboxMessageId: msg.id,
        qboBillId: bill.Id,
        qboVendorId: vendor.Id,
        qboProjectId: projectId ?? null,
        amount: fields.total,
        invoiceNumber: fields.invoice_number ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      qboBillId: bill.Id,
      qboVendorId: vendor.Id,
      qboProjectId: projectId ?? null,
    });
  } catch (e) {
    const errMsg = (e as Error).message;
    await admin
      .from("inbox_messages")
      .update({ posting_error: errMsg })
      .eq("id", msg.id);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
