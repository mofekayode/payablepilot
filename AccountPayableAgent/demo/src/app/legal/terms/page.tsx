export const metadata = { title: "PayablePilot · Terms" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-[12px] text-neutral-500">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p className="text-[14px] text-neutral-500 mt-2">
        <strong>Draft.</strong> This is a working version. A lawyer-reviewed version will replace it before
        general availability.
      </p>

      <h2>1. The service</h2>
      <p>
        PayablePilot is software that reads invoice emails, extracts the relevant fields, and helps you post
        them as bills in your accounting system. You authorize PayablePilot to act on your behalf by
        connecting accounts (Gmail, QuickBooks Online).
      </p>

      <h2>2. Your account</h2>
      <p>
        You're responsible for keeping your password safe and for actions taken under your account. If you
        invite others to your firm or to a business, you're responsible for those invitations and the access
        they grant.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use PayablePilot to violate any law, including tax or accounting regulations applicable to you.</li>
        <li>Connect mailboxes or accounts you don't have permission to access.</li>
        <li>Attempt to reverse-engineer, scrape, or overload the service.</li>
        <li>Resell or sublicense PayablePilot without our written consent.</li>
      </ul>

      <h2>4. Your data</h2>
      <p>
        You own the data you and your clients put into PayablePilot. We process it only to operate the service
        for you, as described in our <a href="/legal/privacy">Privacy Policy</a>. You can export or delete it
        at any time.
      </p>

      <h2>5. Fees</h2>
      <p>
        During the early-access period, PayablePilot is provided to you at the price quoted in your invitation
        or sign-up flow (which may be free). We'll give you at least 30 days' notice before any pricing change
        takes effect for your account.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        PayablePilot is provided "as is." We work hard to extract invoice fields accurately and post bills
        correctly, but you remain responsible for reviewing what gets posted to your books. We make no
        warranty that the service will be uninterrupted, error-free, or fit any particular purpose.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, PayablePilot's aggregate liability for any claim relating to
        the service is limited to the fees you paid in the 12 months preceding the claim. We are not liable
        for indirect, incidental, or consequential damages, including lost profits or lost data.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can stop using PayablePilot at any time. We can suspend or terminate access if you breach these
        Terms or use the service in a way that puts our infrastructure or other customers at risk. On
        termination we'll delete your data per the retention rules in our Privacy Policy.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated by email or
        in-app notice at least 15 days before they take effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions: <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>.
      </p>
    </>
  );
}
