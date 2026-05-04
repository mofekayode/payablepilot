export const metadata = { title: "PayablePilot · Terms of Service" };

export default function TermsPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-[12px] text-neutral-500">Last updated: {lastUpdated}</p>

      <p className="text-[14px] mt-4">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of PayablePilot
        (&ldquo;PayablePilot,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), provided through{" "}
        <a href="https://payablepilot.com">payablepilot.com</a> and{" "}
        <a href="https://app.payablepilot.com">app.payablepilot.com</a> (collectively, the &ldquo;Service&rdquo;).
        By creating an account, connecting an integration, or otherwise using the Service, you agree to be
        bound by these Terms.
      </p>

      <h2>1. The service</h2>
      <p>
        PayablePilot is an accounts-payable automation tool for bookkeeping firms and the businesses they
        serve. The Service reads invoice emails from connected mailboxes, extracts structured fields
        (vendor, amount, line items, project references, dates) using third-party AI, matches them against
        your accounting records, and prepares bills for your review and posting to QuickBooks Online or
        another supported accounting system. You remain solely responsible for reviewing each bill before
        posting and for the accuracy of your books.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        You must be at least 18 years old and able to form a legally binding contract to use the Service.
        When you create an account, you agree to provide accurate information and to keep it current. You
        are responsible for safeguarding your password and for any activity under your account. Notify us
        promptly at{" "}
        <a href="mailto:support@payablepilot.com">support@payablepilot.com</a> if you suspect unauthorized
        access.
      </p>
      <p>
        PayablePilot supports a multi-tenant model where a bookkeeping firm (a &ldquo;Firm&rdquo;) manages
        one or more client businesses (each a &ldquo;Business&rdquo;). You may invite teammates to your
        Firm and clients to a Business. You are responsible for the actions of users you invite and for
        ensuring they have the rights to access the data exposed to them.
      </p>

      <h2>3. Authorization to access connected accounts</h2>
      <p>
        To deliver the Service, you may grant PayablePilot access to third-party accounts on your behalf,
        including but not limited to Gmail (read-only) and QuickBooks Online. By connecting an account, you
        represent that you have the authority to do so and you authorize PayablePilot to access, retrieve,
        and store information from that account as necessary to operate the Service. You may revoke access
        at any time from inside PayablePilot or from the third-party provider.
      </p>
      <p>
        We do not modify or send mail on your behalf, and we do not initiate payments. Posting a bill to
        QuickBooks Online prepares the bill inside your accounting system; release of payment remains your
        responsibility and is performed inside QuickBooks (or by your bank).
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to violate any law, including tax, accounting, or privacy regulations applicable to you;</li>
        <li>Connect mailboxes, accounting accounts, or other resources you do not have authority to access;</li>
        <li>Upload, ingest, or process content that is unlawful, infringing, or that you do not have rights to;</li>
        <li>Attempt to reverse-engineer, decompile, scrape, or otherwise interfere with the Service;</li>
        <li>Probe, scan, or test the vulnerability of any system or network without our prior written consent;</li>
        <li>Use the Service to develop a competing product;</li>
        <li>Resell, sublicense, or otherwise commercialize the Service without our prior written consent.</li>
      </ul>
      <p>
        We may suspend access without notice if your use poses a risk to other customers, our
        infrastructure, or violates these Terms.
      </p>

      <h2>5. Your data</h2>
      <p>
        As between you and PayablePilot, you retain all rights, title, and interest in the data you and the
        users you authorize submit to the Service (&ldquo;Customer Data&rdquo;). You grant us a limited,
        non-exclusive, worldwide license to host, process, and transmit Customer Data solely as needed to
        provide the Service to you, to maintain and improve the Service, and to comply with law.
      </p>
      <p>
        We process Customer Data in accordance with our{" "}
        <a href="/legal/privacy">Privacy Policy</a>, which is incorporated by reference into these Terms.
        You may export or request deletion of your data at any time by contacting{" "}
        <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>. Upon termination of your
        account we will delete Customer Data on the schedule described in the Privacy Policy.
      </p>

      <h2>6. Subprocessors and third-party services</h2>
      <p>
        We rely on the following third-party services to operate the Service. Each receives only the data
        strictly necessary to perform its function and is bound by its own terms and security obligations:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> &mdash; database, authentication, and file storage.
        </li>
        <li>
          <strong>Vercel</strong> &mdash; application hosting.
        </li>
        <li>
          <strong>Anthropic</strong> &mdash; AI-driven invoice field extraction. Submitted documents are not
          used by Anthropic to train its models.
        </li>
        <li>
          <strong>Google (Gmail API)</strong> &mdash; read-only access to mailboxes you connect, used solely
          to retrieve invoice emails.
        </li>
        <li>
          <strong>Intuit (QuickBooks Online)</strong> &mdash; OAuth connection used to read accounting
          reference data and create bills you authorize.
        </li>
      </ul>
      <p>
        Use of QuickBooks Online is also subject to Intuit&rsquo;s own terms. Use of Gmail is subject to
        Google&rsquo;s terms. PayablePilot&rsquo;s use of information received from Google APIs adheres to
        the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Service, including its software, design, copy, and trademarks, is owned by PayablePilot and is
        protected by intellectual property laws. We grant you a limited, revocable, non-exclusive,
        non-transferable license to access and use the Service in accordance with these Terms. We retain all
        rights not expressly granted.
      </p>
      <p>
        If you provide feedback, suggestions, or feature requests (&ldquo;Feedback&rdquo;), you grant us a
        perpetual, irrevocable, royalty-free license to use the Feedback for any purpose without obligation
        to you.
      </p>

      <h2>8. Fees, billing, and trials</h2>
      <p>
        During the early-access period, the Service is provided at the price quoted in your sign-up flow,
        invitation, or order form, which may be free. Once paid plans are introduced, applicable fees and
        billing terms will be presented to you for acceptance before any charge is made. We will provide at
        least 30 days&rsquo; notice before any pricing change takes effect for your account, and you may
        cancel before the change takes effect.
      </p>

      <h2>9. Confidentiality</h2>
      <p>
        Each party agrees to use the other party&rsquo;s confidential information solely to perform under
        these Terms and to protect it with the same degree of care it uses to protect its own confidential
        information of similar importance, but in no event with less than reasonable care.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY
        KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF DATA. WE DO NOT
        WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT EXTRACTED INVOICE FIELDS WILL BE
        100% ACCURATE. YOU REMAIN SOLELY RESPONSIBLE FOR REVIEWING EACH BILL BEFORE IT IS POSTED TO YOUR
        ACCOUNTING SYSTEM AND FOR THE ACCURACY OF YOUR FINANCIAL RECORDS.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAYABLEPILOT&rsquo;S AGGREGATE LIABILITY FOR ANY CLAIM
        ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE FEES
        YOU PAID TO US FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE
        CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100). IN NO EVENT WILL EITHER PARTY BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST
        REVENUE, OR LOSS OF DATA, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THESE LIMITATIONS
        APPLY REGARDLESS OF THE LEGAL THEORY OF THE CLAIM.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold PayablePilot, its officers, directors, employees, and agents
        harmless from and against any claims, damages, liabilities, losses, and expenses (including
        reasonable attorneys&rsquo; fees) arising out of or related to (a) your violation of these Terms,
        (b) your violation of any law or third-party right, or (c) your Customer Data or use of the Service
        in a manner not authorized under these Terms.
      </p>

      <h2>13. Termination</h2>
      <p>
        You may stop using and delete your account at any time. We may suspend or terminate your access if
        you breach these Terms, if your use endangers the integrity or security of the Service, or if we
        are required to do so by law. Upon termination, your right to use the Service ceases immediately
        and we will delete or return Customer Data in accordance with our Privacy Policy.
      </p>
      <p>
        Sections 5 (Your data), 7 (Intellectual property), 10 (Disclaimers), 11 (Limitation of liability),
        12 (Indemnification), and any other provision that by its nature should survive will survive
        termination.
      </p>

      <h2>14. Modifications to the service or these terms</h2>
      <p>
        We may modify the Service or these Terms from time to time. For material changes, we will provide
        notice by email to the address associated with your account or by an in-app notice at least 15 days
        before the changes take effect. Your continued use of the Service after the effective date
        constitutes acceptance of the updated Terms. If you do not agree, your sole remedy is to stop using
        the Service before the changes take effect.
      </p>

      <h2>15. Governing law and dispute resolution</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, U.S.A., without regard to its
        conflict-of-laws principles. The state and federal courts located in Delaware will have exclusive
        jurisdiction over any dispute arising out of or relating to these Terms or the Service, and each
        party waives any objection to venue in those courts. The U.N. Convention on Contracts for the
        International Sale of Goods does not apply.
      </p>

      <h2>16. General</h2>
      <p>
        These Terms, together with our <a href="/legal/privacy">Privacy Policy</a>, constitute the entire
        agreement between you and PayablePilot regarding the Service and supersede any prior agreements. If
        any provision is found unenforceable, the remaining provisions will remain in effect. Our failure
        to enforce any provision is not a waiver. You may not assign these Terms without our prior written
        consent; we may assign them in connection with a merger, acquisition, or sale of assets. Notices to
        you may be sent to the email address associated with your account; notices to us must be sent to{" "}
        <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>.
      </p>

      <h2>17. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>.
      </p>
    </>
  );
}
