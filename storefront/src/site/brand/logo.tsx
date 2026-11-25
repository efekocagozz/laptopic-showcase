interface LogoProps {
    className?: string;
}

/** Laptopic wordmark. Uses currentColor so it follows the text colour in light and dark mode. */
export function Logo({className}: LogoProps) {
    return (
        <span className={`inline-flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight ${className ?? ''}`}>
            <svg viewBox="0 0 32 24" aria-hidden="true" className="h-5 w-auto text-primary">
                <rect x="5" y="2" width="22" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M1 20h30l-2.5 3h-25z" fill="currentColor" />
            </svg>
            <span>laptopic</span>
        </span>
    );
}
