import { LandingPage } from "@/components/landing-page";

export const metadata = {
  title: "PayablePilot · AP under control, without adding headcount",
  description:
    "PayablePilot reads every invoice, matches your POs, codes the GL, and posts bills directly to QuickBooks or Xero.",
};

export default function Home() {
  return <LandingPage />;
}
