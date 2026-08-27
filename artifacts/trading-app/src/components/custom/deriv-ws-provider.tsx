import { createContext, useContext, useEffect } from 'react';
import { useDerivWS } from '@deriv/core';
import { useAuth } from '@/hooks/use-auth';
import type { DerivWS } from '@deriv/core';
import type { UseAuthReturn } from '@/hooks/use-auth';

interface DerivWSContextValue {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  auth: UseAuthReturn;
}

const DerivWSContext = createContext<DerivWSContextValue | null>(null);

/**
 * Maintains a single WebSocket connection and auth state above all page components.
 * Also owns the account-balance subscription so every trading surface sees the
 * same live balance and the balance recovers automatically after reconnects.
 */
export function DerivWSProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { ws, isConnected, isExhausted } = useDerivWS({
    url: auth.wsUrl,
    accountId: auth.activeAccountId ?? undefined,
  });

  useEffect(() => {
    if (!ws || !isConnected || !auth.activeAccountId || auth.authState !== 'authenticated') {
      return;
    }

    let disposed = false;
    let unsubscribeBalance: (() => void) | null = null;

    ws.subscribe({ balance: 1 }, (data) => {
      if (disposed) return;
      const balance = data.balance as number | string | undefined;
      if (balance !== undefined) {
        auth.updateAccountBalance(auth.activeAccountId!, balance);
      }
    })
      .then(({ unsubscribe }) => {
        if (disposed) {
          unsubscribe();
          return;
        }
        unsubscribeBalance = unsubscribe;
      })
      .catch(() => {
        // Connection state/reconnect handling will retry the subscription.
      });

    // A successful buy response contains balance_after. Apply it immediately;
    // the balance subscription remains authoritative for subsequent updates.
    const unsubscribeMessages = ws.onMessage((data) => {
      if (disposed) return;
      const buy = data.buy as Record<string, unknown> | undefined;
      const balanceAfter = buy?.balance_after as number | string | undefined;
      if (balanceAfter !== undefined) {
        auth.updateAccountBalance(auth.activeAccountId!, balanceAfter);
      }
    });

    return () => {
      disposed = true;
      unsubscribeMessages();
      unsubscribeBalance?.();
    };
  }, [ws, isConnected, auth.authState, auth.activeAccountId, auth.updateAccountBalance]);

  return (
    <DerivWSContext.Provider value={{ ws, isConnected, isExhausted, auth }}>
      {children}
    </DerivWSContext.Provider>
  );
}

export function useDerivWSContext(): DerivWSContextValue {
  const ctx = useContext(DerivWSContext);
  if (!ctx) {
    throw new Error('useDerivWSContext must be used within a DerivWSProvider');
  }
  return ctx;
}
