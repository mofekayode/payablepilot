// Hand-rolled types for the tables this app touches. Once the schema settles,
// regenerate via `supabase gen types typescript` and replace this file.

export type Firm = {
  id: string;
  name: string;
  created_at: string;
};

export type FirmMember = {
  firm_id: string;
  user_id: string;
  role: "owner" | "bookkeeper";
  created_at: string;
};

export type Business = {
  id: string;
  firm_id: string;
  name: string;
  legal_name: string | null;
  dba: string | null;
  ein: string | null;
  inbox_alias: string;
  addresses: Array<{ line1?: string; line2?: string; city?: string; state?: string; zip?: string }>;
  created_at: string;
};

export type BusinessMember = {
  business_id: string;
  user_id: string;
  role: "bookkeeper" | "client_owner" | "client_viewer";
  created_at: string;
};

export type Connection = {
  business_id: string;
  provider: "gmail" | "qbo";
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  extra: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type UserPrefs = {
  user_id: string;
  last_business_id: string | null;
  updated_at: string;
};
