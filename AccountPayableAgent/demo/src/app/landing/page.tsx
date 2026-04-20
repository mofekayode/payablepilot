import { LandingPage } from "@/components/landing-page";

export const metadata = {
  title: "PayablePilot · AP under control, without adding headcount",
  description:
    "PayablePilot reads every invoice, matches your POs, codes the GL, and prepares your payment batch inside your existing books.",
};

export default function Landing() {
  return <LandingPage />;
}
