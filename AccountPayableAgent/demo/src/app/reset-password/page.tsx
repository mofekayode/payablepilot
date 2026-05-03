import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current";
import { ResetPasswordForm } from "./reset-password-form";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Set new password" };

export default async function ResetPasswordPage() {
  // The reset link delivers the user to /auth/callback which exchanges the
  // code, then redirects here with a live session.
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password");

  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">Set a new password</h1>
        <p className="mt-1 text-[14px] text-neutral-500">Pick something you'll remember.</p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
