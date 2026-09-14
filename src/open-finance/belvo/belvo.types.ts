/** Types aligned with Belvo Aggregation / OFDA Brazil API responses used by Valora. */

export type BelvoWidgetTokenRequest = {
  id: string;
  password: string;
  scopes: string;
  stale_in: string;
  fetch_resources: Array<'ACCOUNTS' | 'TRANSACTIONS' | 'OWNERS' | 'BILLS'>;
  widget: {
    purpose?: string;
    openfinance_feature: 'consent_link_creation';
    callback_urls: {
      success: string;
      exit: string;
      event: string;
    };
    branding: {
      company_icon: string;
      company_logo: string;
      company_name: string;
      company_terms_url: string;
      company_terms_version?: string;
      overlay_background_color?: string;
      social_proof?: boolean;
    };
    consent: {
      purpose?: string;
      terms_and_conditions_url: string;
      permissions: Array<'REGISTER' | 'ACCOUNTS' | 'CREDIT_CARDS' | 'CREDIT_OPERATIONS'>;
      identification_info: Array<{
        type: 'CPF' | 'CNPJ';
        number: string;
        name: string;
      }>;
    };
  };
};

export type BelvoWidgetTokenResponse = {
  access: string;
  refresh: string;
};

export type BelvoAccount = {
  id: string;
  link: string;
  institution?: { name?: string } | string | null;
  name?: string | null;
  type?: string | null;
  category?: string | null;
  currency?: string | null;
  balance?: {
    current?: number | null;
    available?: number | null;
  } | null;
  collected_at?: string | null;
};

export type BelvoTransaction = {
  id: string;
  account: string | { id?: string };
  link?: string;
  description?: string | null;
  amount: number;
  value_date?: string | null;
  accounting_date?: string | null;
  currency?: string | null;
  type?: string | null;
  status?: string | null;
  category?: string | null;
  merchant?: { merchant_name?: string | null } | null;
};

export type BelvoListResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export type BelvoWebhookPayload = {
  webhook_id?: string;
  webhook_type?: string;
  webhook_code?: string;
  process_type?: string;
  link_id?: string;
  external_id?: string;
  data?: Record<string, unknown>;
};

export class BelvoApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'BelvoApiError';
  }
}
