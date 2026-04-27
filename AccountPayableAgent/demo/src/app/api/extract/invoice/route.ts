import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceFromPdf } from "@/lib/integrations/extract";
import { downloadAttachment } from "@/lib/integrations/gmail";

// POST body shape (one of):
//   { source: "gmail", messageId: string, attachmentId: string }
//   { source: "upload", base64: string }   // base64-encoded PDF
//
// Returns the structured ExtractedInvoice JSON from Claude.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let pdfBase64: string;
    if (body.source === "gmail") {
      if (!body.messageId || !body.attachmentId) {
        return NextResponse.json({ error: "messageId and attachmentId required for source=gmail" }, { status: 400 });
      }
      const dl = await downloadAttachment(body.messageId, body.attachmentId);
      pdfBase64 = dl.base64;
    } else if (body.source === "upload") {
      if (typeof body.base64 !== "string" || body.base64.length === 0) {
        return NextResponse.json({ error: "base64 PDF required for source=upload" }, { status: 400 });
      }
      pdfBase64 = body.base64;
    } else {
      return NextResponse.json({ error: "source must be 'gmail' or 'upload'" }, { status: 400 });
    }

    const extracted = await extractInvoiceFromPdf(pdfBase64);
    return NextResponse.json({ extracted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
