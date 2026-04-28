import { NextResponse } from "next/server";
import {
  createVendor,
  findVendorByName,
  listProjects,
  listCustomers,
  createProject,
} from "@/lib/integrations/qbo";

// One-click "set up demo data" — primes the connected QBO sandbox so the
// PayablePilot demo flow auto-codes cleanly:
//   1. Creates Cornerstone HVAC Services as a vendor (idempotent).
//   2. Tries to create a sample project for the test invoice's job ref. If
//      QBO's Projects feature is off it reports back so the user knows to
//      flip it on. If on, picks any active customer as parent.

const PROJECT_NAME = "418 Maple HVAC Spring Tune-Up";

export async function POST() {
  try {
    const result: {
      vendor: { id: string; displayName: string; created: boolean } | null;
      project: { id: string; displayName: string; created: boolean } | null;
      projectsFeatureOn: boolean;
      notes: string[];
    } = {
      vendor: null,
      project: null,
      projectsFeatureOn: false,
      notes: [],
    };

    // 1. Vendor.
    const vendorTarget = { displayName: "Cornerstone HVAC Services", email: "billing@cornerstonehvac.com" };
    const existingVendor = await findVendorByName(vendorTarget.displayName);
    if (existingVendor) {
      result.vendor = { id: existingVendor.Id, displayName: existingVendor.DisplayName, created: false };
    } else {
      const made = await createVendor(vendorTarget);
      result.vendor = { id: made.Id, displayName: made.DisplayName, created: true };
    }

    // 2. Project.
    const existingProjects = await listProjects(50);
    const already = existingProjects.find((p) => p.DisplayName === PROJECT_NAME);
    if (already) {
      result.project = { id: already.Id, displayName: already.DisplayName, created: false };
      result.projectsFeatureOn = true;
    } else {
      // Try to create. Failure mode 1: feature off (createProject returns null).
      // Failure mode 2: no customers in sandbox (we'd have nothing to parent under).
      const customers = await listCustomers(10);
      const projectIds = new Set(existingProjects.map((p) => p.Id));
      const parent = customers.find((c) => !projectIds.has(c.Id));
      if (!parent) {
        result.notes.push(
          "No active customers in your QuickBooks company to use as the project's parent. Create one in QBO, then re-run setup."
        );
      } else {
        const made = await createProject(PROJECT_NAME, parent.Id);
        if (made) {
          result.project = { id: made.Id, displayName: made.DisplayName, created: true };
          result.projectsFeatureOn = true;
        } else {
          result.notes.push(
            "QuickBooks Projects feature is not enabled in this company. Turn it on: Settings → Account and Settings → Advanced → Projects → ON, then re-run setup."
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
