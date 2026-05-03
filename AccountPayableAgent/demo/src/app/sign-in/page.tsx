import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { SignInForm } from "./sign-in-form";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(sp.next || "/app");

  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">Sign in</h1>
        <p className="mt-1 text-[14px] text-neutral-500">Welcome back. Pick up where you left off.</p>
        <div className="mt-6">
          <SignInForm next={sp.next ?? "/app"} initialError={sp.error ?? null} />
        </div>
        <p className="mt-6 text-[13px] text-neutral-500">
          New here?{" "}
          <Link href="/sign-up" className="text-neutral-900 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
