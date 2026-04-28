import { NextRequest, NextResponse } from "next/server";
import { findVendorByName } from "@/lib/integrations/qbo";

// Debug endpoint: looks up a vendor by exact DisplayName via a direct QBO
// query (different code path from listVendors). Surfaces the raw QBO row
// including Active status so we can tell whether a vendor that's "missing"
// from the list is actually missing or just inactive.
export async function GET(req: NextRequest) {
  try {
    const name = new URL(req.url).searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "?name=... is required" }, { status: 400 });
    }
    const vendor = await findVendorByName(name);
    return NextResponse.json({ name, found: !!vendor, vendor });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
