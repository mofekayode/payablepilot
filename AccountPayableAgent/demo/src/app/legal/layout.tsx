import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PilotMark } from "@/components/pilot-mark";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-[760px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-neutral-500 hover:text-neutral-900 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
              <PilotMark className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">PayablePilot</span>
          </div>
        </div>
      </header>
      <main className="max-w-[760px] mx-auto px-6 py-12">
        <article className="prose prose-neutral max-w-none">{children}</article>
        <footer className="mt-16 pt-8 border-t border-neutral-200 text-[12px] text-neutral-500 flex gap-4">
          <Link href="/legal/privacy" className="hover:text-neutral-900">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-neutral-900">
            Terms
          </Link>
          <span className="ml-auto">&copy; {new Date().getFullYear()} PayablePilot</span>
        </footer>
      </main>
    </div>
  );
}
