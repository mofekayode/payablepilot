// GET /api/bills
//
// Returns invoices from inbox_messages for the active business that
// have been extracted, grouped into "ready to post" (no posted_at)
// and "posted" (has qbo_bill_id). Used by the Bills view.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireActiveBusinessId } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  void req;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let businessId: string;
  try {
    businessId = await requireActiveBusinessId();
  } catch {
    return new NextResponse("no_active_business", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select(
      "id, from_email, from_name, subject, received_at, extracted_fields, extraction_status, extraction_error, posted_at, qbo_bill_id, qbo_vendor_id, qbo_project_id, posting_error"
    )
    .eq("business_id", businessId)
    .in("extraction_status", ["done", "extracting"])
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) return new NextResponse(error.message, { status: 500 });

  const bills = (data ?? []).map((row) => ({
    id: row.id,
    fromEmail: row.from_email,
    fromName: row.from_name,
    subject: row.subject,
    receivedAt: row.received_at,
    extractionStatus: row.extraction_status,
    extractionError: row.extraction_error,
    extractedFields: row.extracted_fields,
    postedAt: row.posted_at,
    qboBillId: row.qbo_bill_id,
    qboVendorId: row.qbo_vendor_id,
    qboProjectId: row.qbo_project_id,
    postingError: row.posting_error,
  }));

  return NextResponse.json({ bills });
}
