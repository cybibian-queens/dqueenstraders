import { Callback } from '@deriv-com/auth-client';
import { Button } from '@deriv-com/ui';
import { initializeDerivNewSession, getActiveOptionsAccount, setActiveOptionsAccount } from '@/utils/deriv-new-api';

const CallbackPage = () => {
    return (
        <Callback
            onSignInSuccess={async (_tokens, rawState) => {
                const state = rawState as { account?: string } | null;
                const { accounts } = await initializeDerivNewSession();

                if (!accounts.length) {
                    throw new Error('Deriv authentication succeeded, but no Options trading account was returned.');
                }

                const requested = String(state?.account || '').toLowerCase();
                const preferred = requested === 'real'
                    ? accounts.find(account => account.account_type === 'real' && account.status === 'active')
                    : accounts.find(account => account.account_type === 'demo' && account.status === 'active');
                const selected = preferred || getActiveOptionsAccount() || accounts.find(account => account.status === 'active') || accounts[0];

                if (selected) setActiveOptionsAccount(selected);

                console.info('[Deriv New API] OAuth session initialized', {
                    accountCount: accounts.length,
                    activeAccount: selected?.account_id,
                });

                const accountParam = selected?.account_type === 'demo' ? 'demo' : (selected?.currency || 'USD');
                window.location.replace(window.location.origin + `/?account=${encodeURIComponent(accountParam)}`);
            }}
            renderReturnButton={() => (
                <Button
                    className='callback-return-button'
                    onClick={() => {
                        window.location.href = '/';
                    }}
                >
                    {'Return to Dashboard'}
                </Button>
            )}
        />
    );
};

export default CallbackPage;
