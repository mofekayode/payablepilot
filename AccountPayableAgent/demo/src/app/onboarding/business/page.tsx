import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser, listAccessibleBusinesses } from "@/lib/auth/current";
import { CreateBusinessForm } from "./create-business-form";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Add a client business" };

export default async function OnboardingBusinessPage() {
  await requireUser();
  const existing = await listAccessibleBusinesses();
  const isFirst = existing.length === 0;

  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[460px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
              <PilotMark className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
          </div>
          {!isFirst && (
            <Link
              href="/app"
              className="text-neutral-500 hover:text-neutral-900 text-sm flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          )}
        </div>
        {isFirst ? (
          <>
            <div className="text-[12px] uppercase tracking-wider text-neutral-500 font-medium">Step 1 of 2</div>
            <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-neutral-900">
              Add your first client business
            </h1>
            <p className="mt-1 text-[14px] text-neutral-500">
              Each client gets their own connected mailbox, QuickBooks, and inbox. You can add more later.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">Add a client business</h1>
            <p className="mt-1 text-[14px] text-neutral-500">
              You currently manage {existing.length} {existing.length === 1 ? "business" : "businesses"}. Adding
              another sets it as your active workspace, then walks you through connecting Gmail and QuickBooks.
            </p>
          </>
        )}
        <div className="mt-6">
          <CreateBusinessForm />
        </div>
      </div>
    </div>
  );
}
