import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initiateLogin,
  initiateSignUp,
  handleOAuthCallback,
  refreshAccessToken,
  fetchAccounts,
  getWebSocketOTP,
  logout as coreLogout,
  getAuthInfo,
  getDerivAccounts,
  getActiveLoginId,
  setActiveLoginId,
  setAccountType,
  clearAllAuthData,
  parseReferralLink,
  parseLandingParams,
  resolveReferralViaProxy,
} from '@deriv/core';
import type { AuthInfo, DerivAccount, AuthState, AuthConfig } from '@deriv/core';

function getClientId(): string {
  return import.meta.env.VITE_DERIV_APP_ID ?? '';
}

function getAuthConfig(): AuthConfig {
  const config: AuthConfig = {
    clientId: getClientId(),
    redirectUri:
      import.meta.env.VITE_DERIV_REDIRECT_URI ??
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };

  const scopesEnv = import.meta.env.VITE_DERIV_OAUTH_SCOPES ?? '';
  if (scopesEnv) {
    config.scopes = scopesEnv
      .split(',')
      .map((s: string) => s.trim())
      .join(' ');
  }

  const referralLink = import.meta.env.VITE_DERIV_REFERRAL_LINK ?? '';
  if (referralLink) {
    const referral = parseReferralLink(referralLink);
    if (referral) {
      config.affiliateToken = referral.affiliateToken;
      config.affiliateTokenParam = referral.affiliateTokenParam;
      config.utmCampaign = referral.utmCampaign;
      config.utmSource = referral.utmSource;
      config.utmMedium = referral.utmMedium;
    }
  }

  const landing = parseLandingParams();
  if (landing) {
    if (landing.affiliateToken) {
      config.affiliateToken = landing.affiliateToken;
      config.affiliateTokenParam = landing.affiliateTokenParam;
    }
    if (landing.utmSource) config.utmSource = landing.utmSource;
    if (landing.utmMedium) config.utmMedium = landing.utmMedium;
    if (landing.utmCampaign) config.utmCampaign = landing.utmCampaign;
  }

  return config;
}

async function getAuthConfigWithReferral(): Promise<AuthConfig> {
  const config = getAuthConfig();
  if (!config.affiliateToken) {
    try {
      const referralLink = import.meta.env.VITE_DERIV_REFERRAL_LINK ?? '';
      const resolved = await resolveReferralViaProxy(referralLink);
      if (resolved) {
        config.affiliateToken = resolved.affiliateToken;
        config.affiliateTokenParam = resolved.affiliateTokenParam;
        if (resolved.utmSource) config.utmSource = resolved.utmSource;
        if (resolved.utmMedium) config.utmMedium = resolved.utmMedium;
        if (resolved.utmCampaign) config.utmCampaign = resolved.utmCampaign;
      }
    } catch {
      // Never block login on attribution resolution.
    }
  }
  return config;
}

export interface UseAuthReturn {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  activeAccountId: string | null;
  wsUrl: string | undefined;
  updateAccountBalance: (accountId: string, balance: string | number) => void;
  login: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => Promise<void>;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>('unauthenticated');
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const clientId = getClientId();

  const fetchOTPUrl = useCallback(async (accountId: string, authInfo: AuthInfo): Promise<string> => {
    return getWebSocketOTP(accountId, authInfo, clientId);
  }, [clientId]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hasCode = searchParams.has('code');

      if (hasCode) {
        try {
          setAuthState('authenticating');
          const config = getAuthConfig();
          const authInfo = await handleOAuthCallback(window.location.href, config);
          const fetchedAccounts = await fetchAccounts(authInfo, clientId);
          const savedLoginId = getActiveLoginId();
          const firstAccount = fetchedAccounts[0];
          const targetId = savedLoginId ?? firstAccount?.account_id;
          if (!targetId) throw new Error('No accounts found');
          if (firstAccount?.account_type) setAccountType(firstAccount.account_type);
          setActiveLoginId(targetId);
          const wsOtpUrl = await fetchOTPUrl(targetId, authInfo);
          setAccounts(fetchedAccounts);
          setActiveAccountId(targetId);
          setWsUrl(wsOtpUrl);
          setAuthState('authenticated');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          setAuthState('error');
          clearAllAuthData();
        }
        return;
      }

      const authInfo = getAuthInfo();
      if (!authInfo) {
        setAuthState('unauthenticated');
        return;
      }

      try {
        setAuthState('authenticating');
        const refreshed = await refreshAccessToken(authInfo.refresh_token, clientId);
        const fetchedAccounts = await fetchAccounts(refreshed, clientId);
        const savedLoginId = getActiveLoginId() ?? getDerivAccounts()?.[0]?.account_id;
        const firstAccount = fetchedAccounts[0];
        const targetId = savedLoginId ?? firstAccount?.account_id;
        if (!targetId) throw new Error('No accounts found');
        if (firstAccount?.account_type) setAccountType(firstAccount.account_type);
        setActiveLoginId(targetId);
        const wsOtpUrl = await fetchOTPUrl(targetId, refreshed);
        setAccounts(fetchedAccounts);
        setActiveAccountId(targetId);
        setWsUrl(wsOtpUrl);
        setAuthState('authenticated');
      } catch {
        setAuthState('unauthenticated');
        clearAllAuthData();
      }
    };

    init();
  }, [fetchOTPUrl, clientId]);

  const updateAccountBalance = useCallback((accountId: string, balance: string | number) => {
    const nextBalance = String(balance);
    setAccounts((current) =>
      current.map((account) =>
        account.account_id === accountId ? { ...account, balance: nextBalance } : account
      )
    );
  }, []);

  const login = useCallback(async () => {
    const config = await getAuthConfigWithReferral();
    initiateLogin(config);
  }, []);

  const signUp = useCallback(async () => {
    const config = await getAuthConfigWithReferral();
    initiateSignUp(config);
  }, []);

  const logout = useCallback(() => {
    coreLogout();
    setAccounts([]);
    setActiveAccountId(null);
    setWsUrl(undefined);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  const switchAccount = useCallback(
    async (accountId: string) => {
      const authInfo = getAuthInfo();
      if (!authInfo) return;

      try {
        const account = accounts.find(a => a.account_id === accountId);
        if (account) setAccountType(account.account_type);
        const wsOtpUrl = await fetchOTPUrl(accountId, authInfo);
        setActiveLoginId(accountId);
        setActiveAccountId(accountId);
        setWsUrl(wsOtpUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Account switch failed');
      }
    },
    [fetchOTPUrl, accounts]
  );

  const activeAccount =
    accounts.find(acc => acc.account_id === activeAccountId) ?? accounts[0] ?? null;

  return {
    authState,
    accounts,
    activeAccount,
    activeAccountId,
    wsUrl,
    updateAccountBalance,
    login,
    signUp,
    logout,
    switchAccount,
    error,
  };
}
