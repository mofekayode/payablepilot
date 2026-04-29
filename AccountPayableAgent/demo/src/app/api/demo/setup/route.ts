import { NextResponse } from "next/server";
import {
  createVendor,
  findVendorByName,
  listProjects,
  listCustomers,
  createProject,
} from "@/lib/integrations/qbo";

// One-click "set up demo data" — primes the connected QBO sandbox so the
// PayablePilot demo flow auto-codes cleanly across multiple test scenarios.
//   1. Creates a small set of varied vendors (HVAC, painting, landscaping,
//      rentals).
//   2. Tries to create matching projects (or jobs, on legacy companies) so
//      the project auto-matcher has multiple candidates to pick from.
//   3. Idempotent — re-running just confirms what's already there.

const VENDORS = [
  { displayName: "Cornerstone HVAC Services", email: "billing@cornerstonehvac.com" },
  { displayName: "BrightBuild Painting", email: "ar@brightbuildpaint.com" },
  { displayName: "Reliable Landscaping Co.", email: "accounts@reliablelandscaping.com" },
  { displayName: "Sunbelt Equipment Rentals", email: "billing@sunbeltrentals.com" },
  { displayName: "Staples Business Advantage", email: "ar@staples.com" },
];

const PROJECTS = [
  "418 Maple HVAC Spring Tune-Up",
  "22 Oak Street Renovation",
  "115 Pine Painting Refresh",
  "601 Elm Tower Common Areas",
];

type SeedRow = { displayName: string; created: boolean; id?: string };

export async function POST() {
  try {
    const vendorResults: SeedRow[] = [];
    const projectResults: SeedRow[] = [];
    const notes: string[] = [];

    // ---- Vendors ----
    for (const v of VENDORS) {
      const existing = await findVendorByName(v.displayName);
      if (existing) {
        vendorResults.push({ displayName: existing.DisplayName, created: false, id: existing.Id });
        continue;
      }
      try {
        const made = await createVendor(v);
        vendorResults.push({ displayName: made.DisplayName, created: true, id: made.Id });
      } catch (e) {
        notes.push(`Vendor "${v.displayName}" failed: ${(e as Error).message}`);
      }
    }

    // ---- Projects ----
    let projectsFeatureKnown = false;
    let projectsFeatureOn = false;
    let parentCustomerId: string | null = null;

    const existingProjects = await listProjects(50);
    const existingNames = new Set(existingProjects.map((p) => p.DisplayName));
    if (existingProjects.length > 0) {
      projectsFeatureKnown = true;
      projectsFeatureOn = true;
    }

    for (const name of PROJECTS) {
      if (existingNames.has(name)) {
        const found = existingProjects.find((p) => p.DisplayName === name)!;
        projectResults.push({ displayName: found.DisplayName, created: false, id: found.Id });
        continue;
      }

      // Need a parent customer. Pick one once and reuse — projects that share
      // a parent are still distinct entities in QBO.
      if (parentCustomerId === null) {
        const customers = await listCustomers(20);
        const projectIds = new Set(existingProjects.map((p) => p.Id));
        const parent = customers.find((c) => !projectIds.has(c.Id));
        if (!parent) {
          notes.push(
            "No customers in your QuickBooks company to use as project parent. Create one customer in QBO and re-run setup."
          );
          break;
        }
        parentCustomerId = parent.Id;
      }

      const made = await createProject(name, parentCustomerId);
      if (made) {
        projectResults.push({ displayName: made.DisplayName, created: true, id: made.Id });
        if (!projectsFeatureKnown) {
          projectsFeatureOn = true;
          projectsFeatureKnown = true;
        }
      } else {
        if (!projectsFeatureKnown) {
          projectsFeatureOn = false;
          projectsFeatureKnown = true;
          notes.push(
            "QuickBooks Projects feature is not enabled. Turn it on (Settings → Account and Settings → Advanced → Projects → ON), then re-run setup. Until then, projects we created exist as legacy Jobs (sub-customers) and PayablePilot's matcher still finds them."
          );
        }
        // Fallback already happened inside createProject (Job=true was set
        // alongside IsProject), so the entity DOES exist in QBO — listProjects
        // will surface it via the Job-fallback query.
        projectResults.push({ displayName: name, created: true });
      }
    }

    return NextResponse.json({
      vendors: vendorResults,
      projects: projectResults,
      projectsFeatureOn,
      notes,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
