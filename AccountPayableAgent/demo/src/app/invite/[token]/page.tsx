// Invite-acceptance landing page.
// 1) Look up the invite by token (anyone can read it via the API).
// 2) If user is not signed in → push them to /sign-up?next=/invite/<token>
//    (sign-up uses the email pre-filled if we can pass it).
// 3) If signed in but email mismatches → show error.
// 4) If signed in and matches → call /api/invitations/accept and redirect to /app.

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current";
import { AcceptInviteClient } from "./accept-client";
import { PilotMark } from "@/components/pilot-mark";

export const metadata = { title: "PayablePilot · Accept invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createSupabaseAdminClient();
  const { data: invite } = await admin
    .from("business_invitations")
    .select("id, business_id, firm_id, email, role, expires_at, accepted_at, revoked_at, businesses(name), firms(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <Wrapper>
        <ErrorState title="Invitation not found" message="This link may be wrong or the invite has been deleted." />
      </Wrapper>
    );
  }
  if (invite.revoked_at) {
    return (
      <Wrapper>
        <ErrorState title="Invitation revoked" message="This invitation was canceled by the firm. Ask them to send you a new one." />
      </Wrapper>
    );
  }
  if (invite.accepted_at) {
    return (
      <Wrapper>
        <ErrorState title="Already accepted" message="This invitation has already been used." />
      </Wrapper>
    );
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <Wrapper>
        <ErrorState title="Invitation expired" message="Ask the person who invited you to send a fresh link." />
      </Wrapper>
    );
  }

  const user = await getCurrentUser();

  // Not signed in → kick them through sign-up. Pre-fill email server-side
  // by passing it in the URL.
  if (!user) {
    const signUp = `/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`;
    redirect(signUp);
  }

  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Wrapper>
        <ErrorState
          title="Wrong account"
          message={`This invitation was sent to ${invite.email}. You're signed in as ${user.email}. Sign out and sign back in with the correct email.`}
        />
      </Wrapper>
    );
  }

  const businessName = (invite as unknown as { businesses?: { name?: string } | null }).businesses?.name ?? "this business";
  const firmName = (invite as unknown as { firms?: { name?: string } | null }).firms?.name ?? "the firm";
  const roleLabel = invite.role === "admin" ? "admin (full access)" : invite.role === "viewer" ? "viewer (read-only)" : "bookkeeper";

  return (
    <Wrapper>
      <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900">You've been invited</h1>
      <p className="mt-1 text-[14px] text-neutral-600">
        {firmName} is inviting you to <span className="font-medium text-neutral-900">{businessName}</span> as <span className="font-medium text-neutral-900">{roleLabel}</span>.
      </p>
      <div className="mt-6">
        <AcceptInviteClient token={token} />
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">{title}</h1>
      <p className="mt-1 text-[14px] text-neutral-600">{message}</p>
    </>
  );
}
