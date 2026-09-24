import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

export type BelvoEnvironment = 'sandbox' | 'production';

export type BelvoRuntimeConfig = {
  env: BelvoEnvironment;
  baseUrl: string;
  secretId: string | undefined;
  secretPassword: string | undefined;
  webhookSecret: string | undefined;
  widgetCallbackBaseUrl: string;
  termsUrl: string;
  companyIconUrl: string;
  companyLogoUrl: string;
  companyName: string;
  sandboxInstitution: string;
};

export function resolveBelvoConfig(config: ConfigService<Env, true>): BelvoRuntimeConfig {
  const env = config.get('BELVO_ENV', { infer: true }) ?? 'sandbox';
  const frontendUrl = config.get('FRONTEND_URL', { infer: true }) ?? 'http://localhost:5173';
  const baseUrl =
    config.get('BELVO_BASE_URL', { infer: true }) ??
    (env === 'production' ? 'https://api.belvo.com' : 'https://sandbox.belvo.com');

  return {
    env,
    baseUrl: baseUrl.replace(/\/$/, ''),
    secretId: config.get('BELVO_SECRET_ID', { infer: true }),
    secretPassword: config.get('BELVO_SECRET_PASSWORD', { infer: true }),
    webhookSecret: config.get('BELVO_WEBHOOK_SECRET', { infer: true }),
    widgetCallbackBaseUrl: (
      config.get('BELVO_WIDGET_CALLBACK_BASE_URL', { infer: true }) ?? frontendUrl
    ).replace(/\/$/, ''),
    termsUrl: config.get('BELVO_TERMS_URL', { infer: true }) ?? 'https://belvo.com/terms-service/',
    companyIconUrl:
      config.get('BELVO_COMPANY_ICON_URL', { infer: true }) ??
      'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e6.svg',
    companyLogoUrl:
      config.get('BELVO_COMPANY_LOGO_URL', { infer: true }) ??
      'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e6.svg',
    companyName: config.get('BELVO_COMPANY_NAME', { infer: true }) ?? 'Valora',
    sandboxInstitution: 'ofmockbank_br_retail',
  };
}
