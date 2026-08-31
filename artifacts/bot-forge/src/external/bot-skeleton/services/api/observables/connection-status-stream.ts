import { BehaviorSubject } from 'rxjs';
import { TAuthData } from '@/types/api-types';

export enum CONNECTION_STATUS {
    OPENED = 'opened',
    CLOSED = 'closed',
    UNKNOWN = 'unknown',
}

export const connectionStatus$ = new BehaviorSubject<string>('unknown');
export const isAuthorizing$ = new BehaviorSubject<boolean>(false);
export const isAuthorized$ = new BehaviorSubject<boolean>(false);
export const account_list$ = new BehaviorSubject<TAuthData['account_list']>([]);
export const authData$ = new BehaviorSubject<TAuthData | null>(null);

export const setConnectionStatus = (status: CONNECTION_STATUS) => connectionStatus$.next(status);
export const setIsAuthorized = (isAuthorized: boolean) => isAuthorized$.next(isAuthorized);
export const setIsAuthorizing = (isAuthorizing: boolean) => isAuthorizing$.next(isAuthorizing);
export const setAccountList = (accountList: TAuthData['account_list']) => account_list$.next(accountList);
export const setAuthData = (authData: TAuthData | null) => authData$.next(authData);
