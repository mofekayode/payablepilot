import { NextResponse } from "next/server";
import { createVendor, findVendorByName } from "@/lib/integrations/qbo";

// One-click "set up demo data" — creates the vendor names PayablePilot's
// auto-coding wants to match the test invoice against, so end-to-end
// auto-fill works inside the connected QBO sandbox.
export async function POST() {
  try {
    const targets = [
      { displayName: "Cornerstone HVAC Services", email: "billing@cornerstonehvac.com" },
    ];

    const created: Array<{ id: string; displayName: string }> = [];
    const existing: Array<{ id: string; displayName: string }> = [];

    for (const t of targets) {
      const found = await findVendorByName(t.displayName);
      if (found) {
        existing.push({ id: found.Id, displayName: found.DisplayName });
        continue;
      }
      const made = await createVendor(t);
      created.push({ id: made.Id, displayName: made.DisplayName });
    }

    return NextResponse.json({ created, existing });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
