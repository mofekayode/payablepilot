import { NextRequest, NextResponse } from "next/server";
import {
  findProjectByName,
  createProject,
  listCustomers,
  listProjects,
} from "@/lib/integrations/qbo";

// Auto-create a QBO project when an invoice mentions one PayablePilot has
// never seen. Idempotent: if a project with this exact DisplayName already
// exists, returns it untouched (created: false). Otherwise picks the first
// active non-project customer as the parent and creates a sub-customer that
// QBO treats as a project (or a legacy Job on companies without the Projects
// feature). All the matching logic happens client-side; this route just does
// "given this name, ensure a project exists in QBO".
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string };
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await findProjectByName(name);
    if (existing) {
      return NextResponse.json({
        project: { Id: existing.Id, DisplayName: existing.DisplayName },
        created: false,
      });
    }

    // Need a parent Customer. Skip rows that are themselves projects so we
    // don't accidentally chain projects under projects.
    const [customers, existingProjects] = await Promise.all([
      listCustomers(50),
      listProjects(200),
    ]);
    const projectIds = new Set(existingProjects.map((p) => p.Id));
    const parent = customers.find((c) => !projectIds.has(c.Id));
    if (!parent) {
      return NextResponse.json(
        {
          error:
            "No customer in QuickBooks to attach this project to. Create one customer in QBO and try again.",
        },
        { status: 400 }
      );
    }

    const made = await createProject(name, parent.Id);
    if (!made) {
      return NextResponse.json(
        {
          error:
            "QuickBooks Projects feature is off and the legacy Jobs path also rejected. Enable Projects in Settings → Account → Advanced.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      project: { Id: made.Id, DisplayName: made.DisplayName },
      created: true,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
