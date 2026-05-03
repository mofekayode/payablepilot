export const metadata = { title: "PayablePilot · Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-[12px] text-neutral-500">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p className="text-[14px] text-neutral-500 mt-2">
        <strong>Draft.</strong> This is a working version. A lawyer-reviewed version will replace it before
        general availability.
      </p>

      <h2>What we collect</h2>
      <p>
        We collect (a) account information you give us — your name, email, and the businesses you manage; (b)
        OAuth tokens you authorize for Gmail and QuickBooks Online so we can read invoices and post bills on
        your behalf; (c) the contents of invoice emails and attachments forwarded into PayablePilot, and the
        structured fields we extract from them; and (d) standard server logs and usage analytics.
      </p>

      <h2>How we use it</h2>
      <p>
        We use the data above only to operate PayablePilot for you: extracting invoice fields, matching them to
        vendors and bills, posting to your accounting system, and sending you reminders or summaries. We do not
        sell your data and we do not use the contents of your invoices to train any third-party AI model
        except as needed to answer your own queries through PayablePilot.
      </p>

      <h2>Who can see it</h2>
      <p>
        Inside PayablePilot, business data is partitioned by client and access is enforced at the database
        level (Postgres row-level security). Only members of a business — or members of the bookkeeping firm
        managing that business — can read its invoices, bills, and connections.
      </p>

      <h2>Subprocessors</h2>
      <p>
        We rely on the following service providers to operate PayablePilot. Each receives only the data
        strictly necessary to perform its function:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database hosting, authentication, and file storage.
        </li>
        <li>
          <strong>Anthropic</strong> — invoice field extraction (Claude API). Only the document being processed is
          sent; we do not include other client data in the prompt.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting.
        </li>
        <li>
          <strong>Google</strong> — Gmail OAuth (read-only access to mailboxes you connect).
        </li>
        <li>
          <strong>Intuit</strong> — QuickBooks Online OAuth and API.
        </li>
      </ul>

      <h2>Retention &amp; deletion</h2>
      <p>
        You can disconnect Gmail or QuickBooks at any time from Settings; we delete the associated OAuth
        tokens immediately. To delete your account or any individual business and its data, email{" "}
        <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>. Deletion is final and we will
        confirm completion within 7 days.
      </p>

      <h2>Security</h2>
      <p>
        Tokens and credentials are stored encrypted at rest in our database. All traffic to and from
        PayablePilot is encrypted in transit (TLS). Access to production systems is limited to the founder
        and is logged.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@payablepilot.com">support@payablepilot.com</a>.
      </p>
    </>
  );
}
