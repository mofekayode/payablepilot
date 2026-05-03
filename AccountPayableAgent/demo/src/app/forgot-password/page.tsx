import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">Reset your password</h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Enter your email and we'll send you a link to set a new password.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-[13px] text-neutral-500">
          Remembered it?{" "}
          <Link href="/sign-in" className="text-neutral-900 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
