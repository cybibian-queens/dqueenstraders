import CommonStore from '@/stores/common-store';
import { TAuthData } from '@/types/api-types';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import {
    CONNECTION_STATUS,
    setAccountList,
    setAuthData,
    setConnectionStatus,
    setIsAuthorized,
    setIsAuthorizing,
} from './observables/connection-status-stream';
import chart_api from './chart-api';
import { generateDerivApiInstance } from './appId';
import { getActiveOptionsAccount, getDerivNewToken, getOptionsAccounts, clearDerivNewSession } from '@/utils/deriv-new-api';

type CurrentSubscription = {
    id: string;
    unsubscribe: () => void;
};

type SubscriptionPromise = Promise<{
    subscription: CurrentSubscription;
}>;

type TApiBaseApi = {
    connection: {
        readyState: number;
        addEventListener: (event: string, callback: () => void) => void;
        removeEventListener: (event: string, callback: () => void) => void;
    };
    send: (data: unknown) => any;
    disconnect: () => void;
    onMessage: () => {
        subscribe: (callback: (message: unknown) => void) => { unsubscribe: () => void };
    };
    getSelfExclusion: () => Promise<unknown>;
};

class APIBase {
    api: TApiBaseApi | null = null;
    token = '';
    account_id = '';
    pip_sizes = {};
    account_info: any = {};
    is_running = false;
    subscriptions: CurrentSubscription[] = [];
    time_interval: ReturnType<typeof setInterval> | null = null;
    has_active_symbols = false;
    is_stopping = false;
    active_symbols = [];
    current_auth_subscriptions: SubscriptionPromise[] = [];
    is_authorized = false;
    active_symbols_promise: Promise<void> | null = null;
    common_store: CommonStore | undefined;
    landing_company: string | null = null;

    unsubscribeAllSubscriptions = () => {
        this.current_auth_subscriptions?.forEach(subscription_promise => {
            subscription_promise.then(({ subscription }) => {
                if (subscription?.id) this.api?.send({ forget: subscription.id });
            });
        });
        this.current_auth_subscriptions = [];
    };

    onsocketopen = () => setConnectionStatus(CONNECTION_STATUS.OPENED);

    onsocketclose = () => {
        setConnectionStatus(CONNECTION_STATUS.CLOSED);
        this.reconnectIfNotConnected();
    };

    async init(force_create_connection = false) {
        this.toggleRunButton(true);

        if (this.api) this.unsubscribeAllSubscriptions();

        if (!this.api || this.api.connection.readyState !== 1 || force_create_connection) {
            if (this.api?.connection) {
                this.api.disconnect();
                setConnectionStatus(CONNECTION_STATUS.CLOSED);
            }

            this.api = await generateDerivApiInstance({ authenticated: true }) as TApiBaseApi;
            this.api.connection.addEventListener('open', this.onsocketopen);
            this.api.connection.addEventListener('close', this.onsocketclose);
        }

        this.initEventListeners();

        if (getDerivNewToken()) {
            setIsAuthorizing(true);
            await this.loadNewApiAccountState();
        }

        chart_api.init(force_create_connection);
    }

    getConnectionStatus() {
        if (this.api?.connection) {
            const ready_state = this.api.connection.readyState;
            return socket_state[ready_state as keyof typeof socket_state] || 'Unknown';
        }
        return 'Socket not initialized';
    }

    terminate() {
        if (this.api) this.api.disconnect();
        clearDerivNewSession();
    }

    initEventListeners() {
        window.addEventListener('online', this.reconnectIfNotConnected);
        window.addEventListener('focus', this.reconnectIfNotConnected);
    }

    async createNewInstance(account_id: string) {
        if (this.account_id !== account_id) {
            await this.init(true);
        }
    }

    reconnectIfNotConnected = () => {
        if (this.api?.connection?.readyState && this.api.connection.readyState > 1) this.init(true);
    };

    async loadNewApiAccountState() {
        if (!this.api) return;
        try {
            const accounts = await getOptionsAccounts();
            const active = getActiveOptionsAccount();
            if (!active) throw new Error('No active Deriv Options account is selected.');

            const selected = accounts.find(account => account.account_id === active.account_id) || active;
            this.token = getDerivNewToken() || '';
            this.account_id = selected.account_id;
            this.account_info = {
                loginid: selected.account_id,
                balance: selected.balance,
                currency: selected.currency,
                account_type: selected.account_type,
                account_list: accounts,
            } as unknown as TAuthData;

            setAccountList(accounts as unknown as TAuthData['account_list']);
            setAuthData(this.account_info as TAuthData);
            setIsAuthorized(true);
            this.is_authorized = true;

            if (this.has_active_symbols) this.toggleRunButton(false);
            else this.active_symbols_promise = this.getActiveSymbols();

            await this.subscribe();
        } catch (error) {
            this.is_authorized = false;
            setIsAuthorized(false);
            globalObserver.emit('Error', error);
        } finally {
            setIsAuthorizing(false);
        }
    }

    async getSelfExclusion() {
        if (!this.api || !this.is_authorized) return;
        await this.api.getSelfExclusion();
    }

    async subscribe() {
        const subscribeToStream = (streamName: string) => doUntilDone(
            () => {
                const subscription = this.api?.send({
                    [streamName]: 1,
                    subscribe: 1,
                    ...(streamName === 'balance' ? { account: 'all' } : {}),
                });
                if (subscription) this.current_auth_subscriptions.push(subscription);
                return subscription;
            },
            [],
            this
        );

        await Promise.all(['balance', 'transaction', 'proposal_open_contract'].map(subscribeToStream));
    }

    getActiveSymbols = async () => {
        await doUntilDone(() => this.api?.send({ active_symbols: 'brief' }), [], this).then(
            ({ active_symbols = [], error = {} }) => {
                const pip_sizes: Record<string, number> = {};
                if (active_symbols.length) this.has_active_symbols = true;
                active_symbols.forEach(({ symbol, pip }: { symbol: string; pip: string }) => {
                    pip_sizes[symbol] = +(+pip).toExponential().substring(3);
                });
                this.pip_sizes = pip_sizes;
                this.toggleRunButton(false);
                this.active_symbols = active_symbols;
                return active_symbols || error;
            }
        );
    };

    toggleRunButton = (toggle: boolean) => {
        const run_button = document.querySelector('#db-animation__run-button');
        if (run_button) (run_button as HTMLButtonElement).disabled = toggle;
    };

    setIsRunning(toggle = false) { this.is_running = toggle; }
    pushSubscription(subscription: CurrentSubscription) { this.subscriptions.push(subscription); }

    clearSubscriptions() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];
        const global_timeouts = globalObserver.getState('global_timeouts') ?? [];
        global_timeouts.forEach((_: unknown, i: number) => clearTimeout(i));
    }
}

export const api_base = new APIBase();
