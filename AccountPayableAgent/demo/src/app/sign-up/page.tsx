import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { SignUpForm } from "./sign-up-form";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(sp.invite ? `/invite/${sp.invite}` : "/app");
  }

  const inviteMode = !!sp.invite;

  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">
          {inviteMode ? "Accept your invitation" : "Create your firm"}
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          {inviteMode
            ? "Set up a password — then we'll add you to the business that invited you."
            : "Set up your bookkeeping firm. You'll add client businesses next."}
        </p>
        <div className="mt-6">
          <SignUpForm
            inviteToken={sp.invite ?? null}
            prefilledEmail={sp.email ?? null}
          />
        </div>
        <p className="mt-6 text-[13px] text-neutral-500">
          Already have an account?{" "}
          <Link
            href={inviteMode ? `/sign-in?next=${encodeURIComponent(`/invite/${sp.invite}`)}` : "/sign-in"}
            className="text-neutral-900 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
