// Lands here after a Google sign-up. Bootstraps the firm using the firmName
// passed through OAuth state, then redirects to onboarding.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { bootstrapFirmForUser } from "@/lib/auth/bootstrap";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const firmName = url.searchParams.get("firmName") || "My firm";

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  try {
    await bootstrapFirmForUser({ userId: user.id, firmName });
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent((e as Error).message)}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/onboarding/business", req.url));
}
