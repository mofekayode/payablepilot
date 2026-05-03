import { redirect } from "next/navigation";
import { AppShellLive } from "@/components/live/app-shell-live";
import { getActiveBusiness, listAccessibleBusinesses, requireUser } from "@/lib/auth/current";

export const metadata = {
  title: "PayablePilot · Workspace",
  description: "Your live AP workspace — connected to Gmail and QuickBooks Online.",
};

export default async function App() {
  await requireUser();
  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) redirect("/onboarding/business");
  const active = await getActiveBusiness();
  return <AppShellLive activeBusiness={active} businesses={businesses} />;
}
