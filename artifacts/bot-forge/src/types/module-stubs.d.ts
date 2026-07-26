/**
 * Type stubs for packages whose installed versions have incomplete or empty type declarations.
 * IMPORTANT: An ambient `declare module` in a .d.ts file completely REPLACES the installed
 * package types. Only use it when the package exports {} or is not installed.
 * For packages with real types, use module augmentation (`declare module '...' { ... }`) only
 * to ADD missing exports.
 */

// ---------------------------------------------------------------------------
// @deriv-com/utils — installed package dist/index.d.ts exports `export { }`.
// This ambient declaration is the complete type shape for the module.
// ---------------------------------------------------------------------------
declare module '@deriv-com/utils' {
    export const BrandConstants: { [key: string]: string };
    export const LocalStorageConstants: { [key: string]: string };
    export const LocalStorageUtils: {
        setValue: (key: string, value: unknown) => void;
        getValue: (key: string) => string | null;
        removeValue: (key: string) => void;
        getObject: (key: string) => Record<string, unknown> | null;
        setObject: (key: string, value: Record<string, unknown>) => void;
        [key: string]: unknown;
    };
    export const ObjectUtils: { [key: string]: unknown };
    export const URLConstants: { [key: string]: string };

    // URLUtils is both a runtime value and a type namespace.
    // The namespace provides sub-types used in type annotations (e.g. URLUtils.LoginInfo).
    export namespace URLUtils {
        type LoginInfo = {
            token: string;
            loginid: string;
            currency: string;
            country?: string;
            [key: string]: string | undefined;
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const URLUtils: Record<string, any>;
}

// ---------------------------------------------------------------------------
// @deriv-com/analytics — installed package exports Analytics, but ambient
// module declarations replace it. Re-declare Analytics alongside TEvents.
// ---------------------------------------------------------------------------
declare module '@deriv-com/analytics' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const Analytics: Record<string, any>;
    export type TEvents = { [eventName: string]: Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// @deriv/stores/types — installed but TStores not exported in current version.
// ---------------------------------------------------------------------------
declare module '@deriv/stores/types' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type TStores = { client: any; ui: any; common: any; modules: any; [key: string]: any };
    export type TRootStore = TStores;
}

// ---------------------------------------------------------------------------
// @deriv/api — not installed; stub the hooks used in the codebase.
// ---------------------------------------------------------------------------
declare module '@deriv/api' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function useMutation<T extends string>(endpoint: T): { mutate: (params?: any) => void; isLoading: boolean; error: unknown; data: unknown };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function useQuery<T extends string>(endpoint: T, payload?: any): { data: unknown; isLoading: boolean; error: unknown };
}

// ---------------------------------------------------------------------------
// shadcn/ui extra packages that need stubs
// ---------------------------------------------------------------------------
declare module 'react-day-picker' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const DayPicker: React.FC<any>;
    export type DayPickerProps = Record<string, unknown>;
    export type DayPickerSingleProps = Record<string, unknown>;
    export type DayPickerRangeProps = Record<string, unknown>;
    export type SelectSingleEventHandler = (day: Date | undefined) => void;
    export type SelectRangeEventHandler = (range: { from?: Date; to?: Date } | undefined) => void;
    export type DateRange = { from?: Date; to?: Date };
}

declare module 'next-themes' {
    export function useTheme(): { theme: string; setTheme: (theme: string) => void; resolvedTheme?: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const ThemeProvider: React.FC<any>;
}

declare module 'sonner' {
    export const Toaster: React.FC<Record<string, unknown>>;
    export const toast: {
        (message: string, options?: Record<string, unknown>): void;
        success: (message: string, options?: Record<string, unknown>) => void;
        error: (message: string, options?: Record<string, unknown>) => void;
        info: (message: string, options?: Record<string, unknown>) => void;
        warning: (message: string, options?: Record<string, unknown>) => void;
        promise: <T>(promise: Promise<T>, options?: Record<string, unknown>) => void;
    };
}

// ---------------------------------------------------------------------------
// XML file imports — used for Blockly workspace XML templates.
// ---------------------------------------------------------------------------
declare module '*.xml' {
    const content: string;
    export default content;
}
