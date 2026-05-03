import { redirect } from "next/navigation";
import { listAccessibleBusinesses, requireUser } from "@/lib/auth/current";

export default async function OnboardingIndex() {
  await requireUser();
  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) redirect("/onboarding/business");
  redirect("/onboarding/connect");
}
