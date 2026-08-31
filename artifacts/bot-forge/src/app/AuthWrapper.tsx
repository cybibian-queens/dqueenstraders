import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { localize } from '@deriv-com/translations';
import { getDerivNewToken, initializeDerivNewSession } from '@/utils/deriv-new-api';
import App from './App';

declare global {
    interface Window {
        is_tmb_enabled?: boolean;
    }
}

export const AuthWrapper = () => {
    const [isAuthComplete, setIsAuthComplete] = React.useState(false);
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        let cancelled = false;

        const initializeAuth = async () => {
            try {
                if (getDerivNewToken()) {
                    await initializeDerivNewSession();
                }
            } catch (error) {
                console.error('[Auth] New API session initialization failed:', error);
            } finally {
                if (!cancelled) setIsAuthComplete(true);
            }
        };

        if (!isOnline) {
            setIsAuthComplete(true);
            return;
        }

        initializeAuth();

        return () => {
            cancelled = true;
        };
    }, [isOnline]);

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
