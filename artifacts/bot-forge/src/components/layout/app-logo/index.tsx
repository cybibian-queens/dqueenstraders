import { standalone_routes } from '@/components/shared';
import { useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    if (!isDesktop) return null;
    return (
        <a
            className='app-header__logo'
            href={standalone_routes.bot}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
        >
            {/* Crown icon in brand gold */}
            <svg width='28' height='28' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <circle cx='14' cy='14' r='14' fill='#d38301' opacity='0.12' />
                <path
                    d='M5 20h18l-3-10-5 6-3-8-3 8-5-6-3 10z'
                    fill='none'
                    stroke='#d38301'
                    strokeWidth='1.8'
                    strokeLinejoin='round'
                />
                <path d='M5 20h18' stroke='#d38301' strokeWidth='1.8' strokeLinecap='round' />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#d38301', letterSpacing: 0.2, lineHeight: 1 }}>
                DQueens<span style={{ color: '#1d2130', marginLeft: 4, fontWeight: 600 }}>Traders</span>
            </span>
        </a>
    );
};
