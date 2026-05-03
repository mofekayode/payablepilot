import { NextRequest, NextResponse } from "next/server";
import { listBills, createBill, type CreateBillInput } from "@/lib/integrations/qbo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current";
import { logAudit } from "@/lib/audit/log";

export async function GET() {
  try {
    const bills = await listBills(25);
    return NextResponse.json({ bills });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST body extends CreateBillInput with an optional inboxMessageId.
// When present, after the bill is created in QBO we write back
// posted_at + qbo_bill_id + qbo_vendor_id + qbo_project_id to the
// inbox_messages row so the UI flips that row to "Posted" without
// manual bookkeeping. Audit log entry recorded too.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBillInput & { inboxMessageId?: string };
    if (!body?.vendorId || !body?.txnDate || !Array.isArray(body?.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "vendorId, txnDate, and at least one line are required" }, { status: 400 });
    }
    const bill = await createBill(body);

    if (body.inboxMessageId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin
          .from("inbox_messages")
          .update({
            posted_at: new Date().toISOString(),
            qbo_bill_id: bill.Id,
            qbo_vendor_id: body.vendorId,
            qbo_project_id: body.projectId ?? null,
            posting_error: null,
          })
          .eq("id", body.inboxMessageId);

        const user = await getCurrentUser();
        const { data: msgRow } = await admin
          .from("inbox_messages")
          .select("business_id")
          .eq("id", body.inboxMessageId)
          .maybeSingle();
        if (msgRow?.business_id) {
          await logAudit({
            action: "bill.posted",
            businessId: msgRow.business_id,
            actorUserId: user?.id ?? null,
            details: {
              inboxMessageId: body.inboxMessageId,
              qboBillId: bill.Id,
              qboVendorId: body.vendorId,
              qboProjectId: body.projectId ?? null,
            },
          });
        }
      } catch (writeBackError) {
        // The bill IS in QBO at this point. Don't fail the response on a
        // write-back issue; just log so we can fix manually if it ever
        // happens.
        console.error("[qbo/bills] write-back to inbox_messages failed:", writeBackError);
      }
    }

    return NextResponse.json({ bill });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
