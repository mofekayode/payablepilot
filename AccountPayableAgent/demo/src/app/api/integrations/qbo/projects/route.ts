import { NextResponse } from "next/server";
import { listProjects } from "@/lib/integrations/qbo";

export async function GET() {
  try {
    const projects = await listProjects(50);
    return NextResponse.json({ projects, count: projects.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
