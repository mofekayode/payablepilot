import { NextRequest, NextResponse } from "next/server";
import { deleteBill } from "@/lib/integrations/qbo";

// Test/cleanup endpoint. Accepts { ids: string[] } and deletes each bill from
// the connected QBO sandbox. Returns per-id success/failure so the UI can
// surface what actually got cleaned up.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids[] required" }, { status: 400 });
    }
    const results: Array<{ id: string; deleted: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        const ok = await deleteBill(id);
        results.push({ id, deleted: ok });
      } catch (e) {
        results.push({ id, deleted: false, error: (e as Error).message });
      }
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
