type DerivEnv = 'production' | 'preview';

function getEnv(): DerivEnv {
  try {
    // Vite replaces import.meta.env at build time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any).env?.VITE_DERIV_ENV as string | undefined;
    if (env === 'preview') return 'preview';
  } catch {
    // Not a Vite environment
  }
  return 'production';
}

const URLS = {
  production: {
    authBase: 'https://auth.deriv.com/oauth2',
    apiBase: 'https://api.derivws.com/trading/v1/options',
    publicWs: 'wss://api.derivws.com/trading/v1/options/ws/public',
    appBuilder: 'https://developers.deriv.com',
  },
  preview: {
    authBase: 'https://staging-auth.deriv.com/oauth2',
    apiBase: 'https://staging-api.derivws.com/trading/v1/options',
    publicWs: 'wss://staging-api.derivws.com/trading/v1/options/ws/public',
    appBuilder: 'https://staging-developers.deriv.com',
  },
} as const;

export function getAuthBaseUrl(): string {
  return URLS[getEnv()].authBase;
}

export function getApiBaseUrl(): string {
  return URLS[getEnv()].apiBase;
}

export function getPublicWsUrl(): string {
  return URLS[getEnv()].publicWs;
}

export function getAppBuilderBaseUrl(): string {
  return URLS[getEnv()].appBuilder;
}
