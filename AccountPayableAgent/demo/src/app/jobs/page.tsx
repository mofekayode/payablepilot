import { JobsPanel } from "@/components/jobs-panel";
import data from "@/lib/jobs-scored.json";

export const metadata = {
  title: "PayablePilot · Job coverage",
  description: "Which AP clerk roles PayablePilot can replace",
};

export default function JobsPage() {
  return <JobsPanel summary={data.summary} jobs={data.jobs} />;
}
