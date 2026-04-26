import { NextRequest, NextResponse } from "next/server";
import { listBills, createBill, type CreateBillInput } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    const bills = await listBills(25);
    return NextResponse.json({ bills });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBillInput;
    if (!body?.vendorId || !body?.txnDate || !Array.isArray(body?.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "vendorId, txnDate, and at least one line are required" }, { status: 400 });
    }
    const bill = await createBill(body);
    return NextResponse.json({ bill });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
