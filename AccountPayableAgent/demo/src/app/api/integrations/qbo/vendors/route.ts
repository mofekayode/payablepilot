import { NextResponse } from "next/server";
import { listVendors } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    const vendors = await listVendors(25);
    return NextResponse.json({ vendors });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
