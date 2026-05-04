// QuickBooks Online integration: OAuth2 + helpers for vendors and bills.
// Uses Intuit's REST API directly (no SDK) — simpler and easier to upgrade.
// Env: QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI, QBO_ENV ("sandbox" | "production").

import { getTokens, setTokens, type StoredTokens } from "./tokens";

const SCOPES = ["com.intuit.quickbooks.accounting"];

// Intuit's OAuth 2.0 / OpenID Connect discovery document. Best practice
// (and explicitly requested in Intuit's production-app review) is to
// resolve the OAuth endpoints from this document rather than hardcoding
// them — that way Intuit can rotate URLs without breaking integrations.
//
// We cache the resolved endpoints in-process for 24 hours and fall back
// to the well-known hardcoded values if the discovery fetch fails (so a
// transient network issue can't take token exchange offline).
const DISCOVERY_URL =
  "https://developer.api.intuit.com/.well-known/openid_configuration";
const FALLBACK_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const FALLBACK_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let discoveryCache: { authUrl: string; tokenUrl: string; fetchedAt: number } | null = null;

async function resolveOAuthEndpoints(): Promise<{ authUrl: string; tokenUrl: string }> {
  const now = Date.now();
  if (discoveryCache && now - discoveryCache.fetchedAt < DISCOVERY_TTL_MS) {
    return { authUrl: discoveryCache.authUrl, tokenUrl: discoveryCache.tokenUrl };
  }
  try {
    const res = await fetch(DISCOVERY_URL, {
      headers: { Accept: "application/json" },
      // Don't let a hung discovery call block OAuth indefinitely.
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        authorization_endpoint?: string;
        token_endpoint?: string;
      };
      if (data.authorization_endpoint && data.token_endpoint) {
        discoveryCache = {
          authUrl: data.authorization_endpoint,
          tokenUrl: data.token_endpoint,
          fetchedAt: now,
        };
        return { authUrl: discoveryCache.authUrl, tokenUrl: discoveryCache.tokenUrl };
      }
    }
    console.warn(
      `[qbo] discovery document missing endpoints (${res.status}); using fallback URLs`
    );
  } catch (e) {
    console.warn(
      "[qbo] discovery document fetch failed, using fallback URLs:",
      (e as Error).message
    );
  }
  return { authUrl: FALLBACK_AUTH_URL, tokenUrl: FALLBACK_TOKEN_URL };
}

function requireEnv(): { clientId: string; clientSecret: string; redirectUri: string; apiBase: string } {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  const env = process.env.QBO_ENV ?? "sandbox";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "QuickBooks integration not configured. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI, and (optionally) QBO_ENV."
    );
  }
  const apiBase =
    env === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";
  return { clientId, clientSecret, redirectUri, apiBase };
}

export async function authUrl(state: string): Promise<string> {
  const { clientId, redirectUri } = requireEnv();
  const { authUrl: oauthBase } = await resolveOAuthEndpoints();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: SCOPES.join(" "),
    redirect_uri: redirectUri,
    state,
  });
  return `${oauthBase}?${params.toString()}`;
}

export async function exchangeCode(code: string, realmId: string): Promise<StoredTokens> {
  const { clientId, clientSecret, redirectUri } = requireEnv();
  const { tokenUrl } = await resolveOAuthEndpoints();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) throw new Error(`QBO token exchange failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    extra: { realmId },
  };
}

async function refreshIfNeeded(stored: StoredTokens): Promise<StoredTokens> {
  if (!stored.expiresAt || stored.expiresAt - 60_000 > Date.now()) return stored;
  if (!stored.refreshToken) return stored;
  const { clientId, clientSecret } = requireEnv();
  const { tokenUrl } = await resolveOAuthEndpoints();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refreshToken,
    }).toString(),
  });
  if (!res.ok) throw new Error(`QBO refresh failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const refreshed: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? stored.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    extra: stored.extra,
  };
  await setTokens("qbo", refreshed);
  return refreshed;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = await getTokens("qbo");
  if (!stored?.extra?.realmId) throw new Error("QuickBooks is not connected.");
  const tokens = await refreshIfNeeded(stored);
  const { apiBase } = requireEnv();
  const url = `${apiBase}/v3/company/${tokens.extra!.realmId}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export type QboVendor = { Id: string; DisplayName: string; PrimaryEmailAddr?: { Address?: string } };
export type QboBill = { Id: string; DocNumber?: string; TxnDate?: string; TotalAmt?: number; VendorRef?: { value: string; name?: string } };
// QBO models "Projects" as Customers with IsProject=true. They share the Customer endpoint.
export type QboProject = { Id: string; DisplayName: string; ParentRef?: { value: string; name?: string }; Active?: boolean };
export type QboAccount = { Id: string; Name: string; AccountType?: string; AccountSubType?: string };

export async function listVendors(limit = 1000): Promise<QboVendor[]> {
  // No filter, no orderby — maximum compatibility with QBO sandbox quirks.
  // Returns inactive vendors too; auto-matcher just compares names so a stray
  // inactive entry doesn't hurt anything.
  const res = await authedFetch(
    `/query?query=${encodeURIComponent(`select * from Vendor maxresults ${limit}`)}`
  );
  if (!res.ok) throw new Error(`QBO listVendors failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { QueryResponse?: { Vendor?: QboVendor[] } };
  return data.QueryResponse?.Vendor ?? [];
}

export async function listBills(limit = 25): Promise<QboBill[]> {
  const res = await authedFetch(`/query?query=${encodeURIComponent(`select * from Bill orderby TxnDate desc maxresults ${limit}`)}`);
  if (!res.ok) throw new Error(`QBO listBills failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { QueryResponse?: { Bill?: QboBill[] } };
  return data.QueryResponse?.Bill ?? [];
}

export async function listProjects(limit = 500): Promise<QboProject[]> {
  // Modern path: companies with the Projects feature on store projects as
  // Customer rows with IsProject=true.
  const modernRes = await authedFetch(
    `/query?query=${encodeURIComponent(`select Id, DisplayName, ParentRef, Active from Customer where IsProject = true and Active = true maxresults ${limit}`)}`
  );
  if (modernRes.ok) {
    const data = (await modernRes.json()) as { QueryResponse?: { Customer?: QboProject[] } };
    return data.QueryResponse?.Customer ?? [];
  }

  const text = await modernRes.text();
  if (modernRes.status === 400 && /IsProject not found/i.test(text)) {
    // Feature off. Fall back to legacy Jobs (Customer rows with Job=true) — same
    // underlying entity, used the same way for cost-tracking on bills.
    const legacyRes = await authedFetch(
      `/query?query=${encodeURIComponent(`select Id, DisplayName, ParentRef, Active from Customer where Job = true and Active = true maxresults ${limit}`)}`
    );
    if (!legacyRes.ok) return [];
    const data = (await legacyRes.json()) as { QueryResponse?: { Customer?: QboProject[] } };
    return data.QueryResponse?.Customer ?? [];
  }

  throw new Error(`QBO listProjects failed: ${modernRes.status} ${text}`);
}

export async function listAccounts(limit = 500): Promise<QboAccount[]> {
  // Useful for picking a default expense account when posting bills.
  const res = await authedFetch(
    `/query?query=${encodeURIComponent(`select Id, Name, AccountType, AccountSubType from Account where Active = true and AccountType = 'Expense' maxresults ${limit}`)}`
  );
  if (!res.ok) throw new Error(`QBO listAccounts failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { QueryResponse?: { Account?: QboAccount[] } };
  return data.QueryResponse?.Account ?? [];
}

export type CreateBillInput = {
  vendorId: string;
  txnDate: string; // YYYY-MM-DD
  docNumber?: string;
  // Optional: tag every line item to a QBO Project (Customer with IsProject=true).
  projectId?: string;
  lines: Array<{ description: string; amount: number; accountId: string }>;
};

export type CreateVendorInput = {
  displayName: string;
  email?: string;
  webAddr?: string;
};

export async function createVendor(input: CreateVendorInput): Promise<QboVendor> {
  const body: Record<string, unknown> = { DisplayName: input.displayName };
  if (input.email) body.PrimaryEmailAddr = { Address: input.email };
  if (input.webAddr) body.WebAddr = { URI: input.webAddr };
  const res = await authedFetch(`/vendor?minorversion=70`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`QBO createVendor failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { Vendor: QboVendor };
  return data.Vendor;
}

// Find a vendor by exact (case-insensitive) DisplayName. Used by the demo-setup
// helper to avoid creating duplicates on repeat clicks.
export async function findVendorByName(displayName: string): Promise<QboVendor | null> {
  const res = await authedFetch(
    `/query?query=${encodeURIComponent(`select * from Vendor where DisplayName = '${displayName.replace(/'/g, "\\'")}'`)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { QueryResponse?: { Vendor?: QboVendor[] } };
  return data.QueryResponse?.Vendor?.[0] ?? null;
}

// Find a project by exact (case-insensitive) DisplayName. Used by the
// auto-create flow so we don't make duplicates when the same project name
// shows up on multiple invoices.
export async function findProjectByName(displayName: string): Promise<QboProject | null> {
  const safe = displayName.replace(/'/g, "\\'");
  // Modern path first.
  const modernRes = await authedFetch(
    `/query?query=${encodeURIComponent(`select Id, DisplayName, ParentRef, Active from Customer where IsProject = true and DisplayName = '${safe}'`)}`
  );
  if (modernRes.ok) {
    const data = (await modernRes.json()) as { QueryResponse?: { Customer?: QboProject[] } };
    const hit = data.QueryResponse?.Customer?.[0];
    if (hit) return hit;
  } else {
    const text = await modernRes.text();
    if (modernRes.status === 400 && /IsProject not found/i.test(text)) {
      const legacyRes = await authedFetch(
        `/query?query=${encodeURIComponent(`select Id, DisplayName, ParentRef, Active from Customer where Job = true and DisplayName = '${safe}'`)}`
      );
      if (legacyRes.ok) {
        const data = (await legacyRes.json()) as { QueryResponse?: { Customer?: QboProject[] } };
        return data.QueryResponse?.Customer?.[0] ?? null;
      }
    }
  }
  return null;
}

// Pulls a few active customers (NOT projects). Used by the demo-setup helper
// because creating a project requires a parent Customer in QBO.
export async function listCustomers(limit = 100): Promise<QboProject[]> {
  const res = await authedFetch(
    `/query?query=${encodeURIComponent(`select Id, DisplayName, Active from Customer where Active = true maxresults ${limit}`)}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { QueryResponse?: { Customer?: QboProject[] } };
  return data.QueryResponse?.Customer ?? [];
}

// Creates a project (a sub-Customer attached to a parent). QBO's underlying
// schema has two flags here: the legacy `Job` (universal) and the newer
// `IsProject` (only present when the Projects feature is on). We set both —
// Job + BillWithParent satisfy QBO's Customer-with-parent validator on every
// company; IsProject upgrades it to a Projects-feature project where supported.
//
// Returns null if QBO's Projects feature isn't enabled AND the legacy Job
// path also rejects — caller surfaces the right setup instruction.
export async function createProject(displayName: string, parentCustomerId: string): Promise<QboProject | null> {
  const body = {
    DisplayName: displayName,
    Job: true,
    IsProject: true,
    BillWithParent: true,
    ParentRef: { value: parentCustomerId },
  };
  const res = await authedFetch(`/customer?minorversion=70`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (/IsProject not found|Projects.*not enabled/i.test(text)) return null;
    throw new Error(`QBO createProject failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { Customer: QboProject };
  return data.Customer;
}

// Soft-delete (void) a Bill in QBO. The API requires the current SyncToken so
// we fetch the bill first, then post the delete with the right token.
// Idempotent enough for cleanup — if the bill is already gone, returns false.
export async function deleteBill(billId: string): Promise<boolean> {
  type BillWithSync = QboBill & { SyncToken?: string };
  const fetchRes = await authedFetch(`/bill/${encodeURIComponent(billId)}`);
  if (fetchRes.status === 404) return false;
  if (!fetchRes.ok) throw new Error(`QBO fetch bill failed: ${fetchRes.status} ${await fetchRes.text()}`);
  const fetchData = (await fetchRes.json()) as { Bill?: BillWithSync };
  const bill = fetchData.Bill;
  if (!bill?.Id || !bill.SyncToken) return false;

  const delRes = await authedFetch(`/bill?operation=delete&minorversion=70`, {
    method: "POST",
    body: JSON.stringify({ Id: bill.Id, SyncToken: bill.SyncToken }),
  });
  if (!delRes.ok) throw new Error(`QBO deleteBill failed: ${delRes.status} ${await delRes.text()}`);
  return true;
}

// Look for an existing Bill on the same vendor with the same DocNumber. Used for
// duplicate detection — we don't want to post the same invoice twice. Returns
// the first match (Intuit returns the most recent first by default) or null.
export async function findExistingBill(vendorId: string, docNumber: string): Promise<QboBill | null> {
  const safe = docNumber.replace(/'/g, "\\'");
  const res = await authedFetch(
    `/query?query=${encodeURIComponent(`select * from Bill where VendorRef = '${vendorId}' and DocNumber = '${safe}'`)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { QueryResponse?: { Bill?: QboBill[] } };
  return data.QueryResponse?.Bill?.[0] ?? null;
}

export async function createBill(input: CreateBillInput): Promise<QboBill> {
  const body = {
    VendorRef: { value: input.vendorId },
    TxnDate: input.txnDate,
    DocNumber: input.docNumber,
    Line: input.lines.map((l) => ({
      DetailType: "AccountBasedExpenseLineDetail",
      Amount: l.amount,
      Description: l.description,
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: l.accountId },
        // QBO ties project costing to the CustomerRef on each line; the Project Id is the Customer Id.
        ...(input.projectId ? { CustomerRef: { value: input.projectId } } : {}),
      },
    })),
  };
  const res = await authedFetch(`/bill?minorversion=70`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`QBO createBill failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { Bill: QboBill };
  return data.Bill;
}
