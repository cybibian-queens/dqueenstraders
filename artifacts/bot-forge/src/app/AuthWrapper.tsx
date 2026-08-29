import React from 'react';
import Cookies from 'js-cookie';
import ChunkLoader from '@/components/loader/chunk-loader';
import { observer as globalObserver } from '@/external/bot-skeleton/utils/observer';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { clearAuthData } from '@/utils/auth-utils';
import { localize } from '@deriv-com/translations';
import { URLUtils } from '@deriv-com/utils';
import { getDerivNewToken, initializeDerivNewSession } from '@/utils/deriv-new-api';
import App from './App';

declare global {
    interface Window {
        is_tmb_enabled?: boolean;
    }
}

const setLocalStorageToken = async (
    loginInfo: URLUtils.LoginInfo[],
    paramsToDelete: string[],
    setIsAuthComplete: React.Dispatch<React.SetStateAction<boolean>>,
    isOnline: boolean,
) => {
    // New API session: the OAuth callback has already stored a Bearer token.
    // Do not attempt a Legacy authorize() call with that token.
    const newApiToken = getDerivNewToken();
    if (newApiToken) {
        try {
            await initializeDerivNewSession();
        } catch (error) {
            console.error('[Auth] New API session initialization failed:', error);
            // Keep the session available; the trading layer can surface a
            // specific API error instead of reverting to legacy auth.
        } finally {
            URLUtils.filterSearchParams(paramsToDelete);
            setIsAuthComplete(true);
        }
        return;
    }

    // Legacy callback support remains only for users who have not completed the
    // platform migration yet. It is deliberately isolated from the New API path.
    if (loginInfo.length) {
        try {
            const defaultActiveAccount = URLUtils.getDefaultActiveAccount(loginInfo);
            if (!defaultActiveAccount) return;

            const accountsList: Record<string, string> = {};
            const clientAccounts: Record<string, { loginid: string; token: string; currency: string }> = {};

            loginInfo.forEach((account: { loginid: string; token: string; currency: string }) => {
                accountsList[account.loginid] = account.token;
                clientAccounts[account.loginid] = account;
            });

            localStorage.setItem('accountsList', JSON.stringify(accountsList));
            localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
            URLUtils.filterSearchParams(paramsToDelete);

            // Legacy sessions are no longer used to initialize the New API.
            // Preserve the old storage only for the temporary compatibility path.
            if (!isOnline) {
                localStorage.setItem('authToken', loginInfo[0].token);
                localStorage.setItem('active_loginid', loginInfo[0].loginid);
                return;
            }

            localStorage.setItem('authToken', loginInfo[0].token);
            localStorage.setItem('active_loginid', loginInfo[0].loginid);
        } catch (error) {
            console.error('Error setting up legacy login info:', error);
        }
    }
};

export const AuthWrapper = () => {
    const [isAuthComplete, setIsAuthComplete] = React.useState(false);
    const { loginInfo, paramsToDelete } = URLUtils.getLoginInfoFromURL();
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        let cancelled = false;

        const initializeAuth = async () => {
            try {
                const initialization = setLocalStorageToken(
                    loginInfo,
                    paramsToDelete,
                    setIsAuthComplete,
                    isOnline,
                );
                const timeout = new Promise<void>(resolve =>
                    setTimeout(() => {
                        console.warn('[Auth] Initialization timeout; continuing to app');
                        resolve();
                    }, 10000),
                );
                await Promise.race([initialization, timeout]);
                URLUtils.filterSearchParams(['lang']);
                if (!cancelled) setIsAuthComplete(true);
            } catch (error) {
                console.error('[Auth] Authentication initialization failed:', error);
                if (!cancelled) setIsAuthComplete(true);
            }
        };

        if (!isOnline) setIsAuthComplete(true);
        initializeAuth();

        return () => {
            cancelled = true;
        };
    }, [loginInfo, paramsToDelete, isOnline]);

    React.useEffect(() => {
        if (!isOnline && !isAuthComplete) {
            const timeout = setTimeout(() => setIsAuthComplete(true), 2000);
            return () => clearTimeout(timeout);
        }
    }, [isOnline, isAuthComplete]);

    if (!isAuthComplete) {
        return <ChunkLoader message={isOnline ? localize('Initializing...') : localize('Loading offline mode...')} />;
    }

    return <App />;
};
