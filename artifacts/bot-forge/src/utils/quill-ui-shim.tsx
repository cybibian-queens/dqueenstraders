import React from 'react';

type CommonProps = {
    children?: React.ReactNode;
    className?: string;
    label?: React.ReactNode;
    size?: string;
};

export const ThemeProvider = ({ children }: CommonProps & { theme?: 'dark' | 'light' }) => <>{children}</>;

const SelectableChip = ({
    label,
    selected,
    className = '',
    ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) => (
    <button
        type='button'
        className={`quill-chip ${selected ? 'quill-chip--selected' : ''} ${className}`.trim()}
        aria-pressed={selected}
        {...props}
    >
        {label}
    </button>
);

export const Chip = {
    Selectable: SelectableChip,
};

export const Link = React.forwardRef<
    HTMLAnchorElement,
    CommonProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { hasChevron?: boolean }
>(({ children, hasChevron, className = '', ...props }, ref) => (
    <a ref={ref} className={`quill-link ${className}`.trim()} {...props}>
        {children}
        {hasChevron ? <span aria-hidden='true'>›</span> : null}
    </a>
));
Link.displayName = 'Link';

export const VerticalStepper = ({ currentStep, labels }: { currentStep: number; labels: React.ReactNode[] }) => (
    <ol className='quill-vertical-stepper'>
        {labels.map((label, index) => (
            <li
                key={index}
                className={index <= currentStep ? 'quill-vertical-stepper__step--active' : undefined}
                aria-current={index === currentStep ? 'step' : undefined}
            >
                {label}
            </li>
        ))}
    </ol>
);

export const Button = ({
    label,
    children,
    className = '',
    variant,
    ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
        type='button'
        className={`quill-button ${variant ? `quill-button--${variant}` : ''} ${className}`.trim()}
        {...props}
    >
        {label ?? children}
    </button>
);

export const Text = ({
    children,
    className = '',
    bold,
    ...props
}: CommonProps & React.HTMLAttributes<HTMLSpanElement> & { bold?: boolean }) => (
    <span className={`quill-text ${className}`.trim()} style={{ fontWeight: bold ? 700 : undefined }} {...props}>
        {children}
    </span>
);