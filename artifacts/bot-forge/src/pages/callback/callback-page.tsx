import { Callback } from '@deriv-com/auth-client';
import { Button } from '@deriv-com/ui';
import { initializeDerivNewSession, getActiveOptionsAccount } from '@/utils/deriv-new-api';

const CallbackPage = () => {
    return (
        <Callback
            onSignInSuccess={async (_tokens, rawState) => {
                const state = rawState as { account?: string } | null;

                // The callback now contains a New API OAuth access token. Account
                // discovery happens through api.derivws.com instead of legacy
                // acct/token/cur callback fields.
                const { accounts, migrationStatus } = await initializeDerivNewSession();
                const active = getActiveOptionsAccount();

                console.info('[Deriv New API] OAuth session initialized', {
                    accountCount: accounts.length,
                    activeAccount: active?.account_id,
                    migrationStatus: migrationStatus?.status,
                });

                if (!accounts.length) {
                    throw new Error('Deriv authentication succeeded, but no Options trading account was returned.');
                }

                const requested = String(state?.account || '').toLowerCase();
                const preferred = requested === 'demo'
                    ? accounts.find(account => account.account_type === 'demo' && account.status === 'active')
                    : accounts.find(account => account.account_type === 'real' && account.status === 'active');
                const selected = preferred || active || accounts.find(account => account.status === 'active') || accounts[0];

                if (selected) {
                    localStorage.setItem('deriv.new_api.active_account', JSON.stringify(selected));
                }

                // Keep the legacy account route out of the new authentication
                // path. The dashboard can now consume the New API session.
                const accountParam = selected?.account_type === 'demo' ? 'demo' : (selected?.currency || 'USD');
                window.location.replace(window.location.origin + `bot/?account=${encodeURIComponent(accountParam)}`);
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
