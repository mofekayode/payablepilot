import { NextRequest, NextResponse } from "next/server";
import { findExistingBill } from "@/lib/integrations/qbo";

// Duplicate-detection probe. Frontend hits this when a captured invoice has both
// vendor + invoice number known, before showing Post. If a bill on the same
// vendor with the same DocNumber already exists in QBO, the row gets flagged
// duplicate and the Post button is disabled.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const vendorId = url.searchParams.get("vendorId");
    const docNumber = url.searchParams.get("docNumber");
    if (!vendorId || !docNumber) {
      return NextResponse.json({ error: "vendorId and docNumber are required" }, { status: 400 });
    }
    const existing = await findExistingBill(vendorId, docNumber);
    return NextResponse.json({ existing });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
