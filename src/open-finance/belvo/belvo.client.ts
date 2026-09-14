import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { resolveBelvoConfig, type BelvoRuntimeConfig } from './belvo.config';
import {
  BelvoApiError,
  type BelvoAccount,
  type BelvoListResponse,
  type BelvoTransaction,
  type BelvoWidgetTokenRequest,
  type BelvoWidgetTokenResponse,
} from './belvo.types';

const OFDA_SCOPES =
  'read_institutions,write_links,read_consents,write_consents,write_consent_callback,delete_consents';

const CONSENT_PURPOSE =
  'Soluções financeiras personalizadas oferecidas por meio de recomendações sob medida, visando melhores ofertas de produtos financeiros e de crédito.';

@Injectable()
export class BelvoClient {
  private readonly logger = new Logger(BelvoClient.name);
  private readonly cfg: BelvoRuntimeConfig;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.cfg = resolveBelvoConfig(configService);
  }

  get runtime(): BelvoRuntimeConfig {
    return this.cfg;
  }

  assertConfigured(): void {
    if (!this.cfg.secretId || !this.cfg.secretPassword) {
      throw new ServiceUnavailableException(
        'Integração Belvo não configurada. Defina BELVO_SECRET_ID e BELVO_SECRET_PASSWORD.',
      );
    }
  }

  async createWidgetAccessToken(input: {
    cpf: string;
    fullName: string;
  }): Promise<BelvoWidgetTokenResponse> {
    this.assertConfigured();
    const base = this.cfg.widgetCallbackBaseUrl;
    // Payload alinhado ao exemplo oficial OFDA da Belvo (Hosted Widget).
    const body: BelvoWidgetTokenRequest = {
      id: this.cfg.secretId!,
      password: this.cfg.secretPassword!,
      scopes: OFDA_SCOPES,
      stale_in: '300d',
      fetch_resources: ['ACCOUNTS', 'TRANSACTIONS', 'OWNERS'],
      widget: {
        purpose: CONSENT_PURPOSE,
        openfinance_feature: 'consent_link_creation',
        callback_urls: {
          success: `${base}/open-finance/callback/success`,
          exit: `${base}/open-finance/callback/exit`,
          event: `${base}/open-finance/callback/event`,
        },
        // OFDA exige branding; sem isso o Hosted Widget costuma abrir em tela branca.
        branding: {
          company_icon: this.cfg.companyIconUrl,
          company_logo: this.cfg.companyLogoUrl,
          company_name: this.cfg.companyName,
          company_terms_url: this.cfg.termsUrl,
          company_terms_version: '2024-03-15',
          overlay_background_color: '#F0F2F4',
          social_proof: true,
        },
        consent: {
          terms_and_conditions_url: this.cfg.termsUrl,
          permissions: ['REGISTER', 'ACCOUNTS', 'CREDIT_CARDS', 'CREDIT_OPERATIONS'],
          identification_info: [
            {
              type: 'CPF',
              number: input.cpf,
              name: input.fullName,
            },
          ],
        },
      },
    };

    // OpenAPI Belvo: /api/token/ usa basicAuth; id/password também vão no body (OFDA).
    return this.request<BelvoWidgetTokenResponse>('POST', '/api/token/', body, {
      useBasicAuth: true,
    });
  }

  async listAccounts(linkId: string): Promise<BelvoAccount[]> {
    return this.listAll<BelvoAccount>('/api/accounts/', { link: linkId });
  }

  async listTransactions(linkId: string): Promise<BelvoTransaction[]> {
    return this.listAll<BelvoTransaction>('/api/transactions/', { link: linkId });
  }

  async deleteLink(linkId: string): Promise<void> {
    this.assertConfigured();
    await this.request<unknown>('DELETE', `/api/links/${encodeURIComponent(linkId)}/`);
  }

  private async listAll<T>(path: string, query: Record<string, string>): Promise<T[]> {
    this.assertConfigured();
    const items: T[] = [];
    let page = 1;
    const pageSize = 100;

    for (;;) {
      const params = new URLSearchParams({
        ...query,
        page: String(page),
        page_size: String(pageSize),
      });
      const data = await this.request<BelvoListResponse<T> | T[]>(
        'GET',
        `${path}?${params.toString()}`,
      );

      if (Array.isArray(data)) {
        items.push(...data);
        break;
      }

      items.push(...(data.results ?? []));
      if (!data.next) break;
      page += 1;
      if (page > 50) {
        this.logger.warn(`Stopped paginating ${path} after 50 pages`);
        break;
      }
    }

    return items;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { useBasicAuth?: boolean },
  ): Promise<T> {
    const url = `${this.cfg.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const useBasicAuth = options?.useBasicAuth ?? true;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (useBasicAuth) {
      headers.Authorization = `Basic ${Buffer.from(`${this.cfg.secretId}:${this.cfg.secretPassword}`).toString('base64')}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      this.logger.error(`Belvo request failed (${method} ${path}): network/timeout`);
      throw new BelvoApiError(
        'Belvo indisponível no momento. Tente novamente em alguns instantes.',
        undefined,
        'NETWORK',
      );
    }

    if (!response.ok) {
      let code = 'HTTP_ERROR';
      let detail = '';
      try {
        const errBody = (await response.json()) as {
          code?: string;
          detail?: string | Array<{ message?: string }>;
          message?: string;
        };
        code = errBody.code ?? code;
        if (typeof errBody.detail === 'string') {
          detail = errBody.detail;
        } else if (Array.isArray(errBody.detail)) {
          detail = errBody.detail
            .map((d) => d.message)
            .filter(Boolean)
            .join('; ');
        } else if (errBody.message) {
          detail = errBody.message;
        }
      } catch {
        // ignore parse errors
      }
      this.logger.warn(
        `Belvo responded ${response.status} for ${method} ${path} code=${code}${detail ? ` detail=${detail}` : ''}`,
      );
      throw new BelvoApiError(
        'Não foi possível concluir a operação com a Belvo.',
        response.status,
        code,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
