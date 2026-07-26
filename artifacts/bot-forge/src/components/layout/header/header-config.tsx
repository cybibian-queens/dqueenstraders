import React, { ReactNode } from 'react';
import { standalone_routes } from '@/components/shared';
import {
    LegacyCashierIcon as CashierLogo,
    LegacyChartsIcon as AnalyticsLogo,
    LegacyDerivIcon as RobotLogo,
    LegacyHomeNewIcon as TradershubLogo,
    LegacyReportsIcon as ReportsLogo,
} from '@deriv/quill-icons/Legacy';
import { localize } from '@deriv-com/translations';

export type PlatformsConfig = {
    active: boolean;
    buttonIcon: ReactNode;
    description: string;
    href: string;
    icon: ReactNode;
    showInEU: boolean;
};

export type MenuItemsConfig = {
    as: 'a' | 'button';
    href: string;
    icon: ReactNode;
    label: string;
};

export type TAccount = {
    balance: string;
    currency: string;
    icon: React.ReactNode;
    isActive: boolean;
    isEu: boolean;
    isVirtual: boolean;
    loginid: string;
    token: string;
    type: string;
};

/** Inline text logo so we don't depend on quill-icons wordmarks for brand name */
const BotForgeLogo = ({ height = 25 }: { height?: number }) => (
    <span
        style={{
            fontWeight: 800,
            fontSize: height * 0.72,
            color: '#d38301',
            letterSpacing: 0.1,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
        }}
    >
        DQ
        <span style={{ fontWeight: 600, color: '#1d2130' }}>Bot Forge</span>
    </span>
);

const TraderLogo = ({ height = 25 }: { height?: number }) => (
    <span style={{ fontWeight: 700, fontSize: height * 0.68, color: '#333', lineHeight: 1 }}>
        DQ Trader
    </span>
);

export const platformsConfig: PlatformsConfig[] = [
    {
        active: false,
        buttonIcon: <TraderLogo height={25} />,
        description: localize('A whole new trading experience on a powerful yet easy to use platform.'),
        href: standalone_routes.trade,
        icon: <TraderLogo height={32} />,
        showInEU: true,
    },
    {
        active: true,
        buttonIcon: <BotForgeLogo height={25} />,
        description: localize('Automated trading at your fingertips. No coding needed.'),
        href: standalone_routes.bot,
        icon: <BotForgeLogo height={32} />,
        showInEU: false,
    },
];

export const TRADERS_HUB_LINK_CONFIG = {
    as: 'a',
    href: standalone_routes.traders_hub,
    icon: <TradershubLogo iconSize='xs' />,
    label: "Trader's Hub",
};

export const MenuItems: MenuItemsConfig[] = [
    {
        as: 'a',
        href: standalone_routes.cashier,
        icon: <CashierLogo iconSize='xs' />,
        label: localize('Cashier'),
    },
    {
        as: 'a',
        href: standalone_routes.reports,
        icon: <ReportsLogo iconSize='xs' />,
        label: localize('Reports'),
    },
    {
        as: 'a',
        href: standalone_routes.free_bots,
        icon: <RobotLogo iconSize='xs' />,
        label: localize('Free Bots'),
    },
    {
        as: 'a',
        href: standalone_routes.analysis_tool,
        icon: <AnalyticsLogo iconSize='xs' />,
        label: localize('Analysis Tool'),
    },
];
