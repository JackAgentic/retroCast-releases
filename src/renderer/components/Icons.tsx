const iconStyle = { shapeRendering: 'crispEdges' as const };

interface IconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const PixelFileVideo = ({ size = 48, className = "", style = {} }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ ...iconStyle, ...style }}>
        <rect x="3" y="2" width="18" height="20" stroke="black" strokeWidth="2" fill="white" />
        <rect x="3" y="2" width="12" height="6" stroke="black" strokeWidth="2" fill="white" />
        <rect x="15" y="2" width="6" height="6" stroke="black" strokeWidth="2" fill="black" />
        <path d="M9 12L9 18L15 15L9 12Z" fill="black" />
    </svg>
);

export const PixelCheck = ({ size = 48, className = "", style = {} }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ ...iconStyle, ...style }}>
        <rect x="2" y="2" width="20" height="20" stroke="black" strokeWidth="2" fill="white" />
        <path d="M6 12L10 16L18 8" stroke="black" strokeWidth="3" fill="none" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
);

export const PixelUpload = ({ size = 16, className = "", style = {} }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ ...iconStyle, ...style }}>
        <rect x="4" y="14" width="16" height="8" stroke="black" strokeWidth="2" fill="white" />
        <rect x="10" y="4" width="4" height="12" fill="black" />
        <rect x="6" y="8" width="4" height="4" fill="black" />
        <rect x="14" y="8" width="4" height="4" fill="black" />
    </svg>
);

export const LuminaLogo = ({ size = 32, className = "", style = {} }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ shapeRendering: 'crispEdges', ...style }}
    >
        {/* Pixel TV — antenna nubs */}
        <rect x="5" y="1" width="2" height="2" fill="currentColor" />
        <rect x="17" y="1" width="2" height="2" fill="currentColor" />
        {/* Antenna diagonals */}
        <rect x="7" y="3" width="2" height="2" fill="currentColor" />
        <rect x="15" y="3" width="2" height="2" fill="currentColor" />
        <rect x="9" y="4" width="6" height="1" fill="currentColor" />

        {/* TV case */}
        <rect x="2" y="5" width="20" height="14" fill="currentColor" />
        {/* Screen inset */}
        <rect x="4" y="7" width="16" height="10" fill="var(--bg-color, white)" />

        {/* Pixel play button */}
        <rect x="10" y="9" width="2" height="6" fill="currentColor" />
        <rect x="12" y="10" width="2" height="4" fill="currentColor" />
        <rect x="14" y="11" width="2" height="2" fill="currentColor" />

        {/* Knob on case */}
        <rect x="21" y="8" width="1" height="2" fill="var(--bg-color, white)" />
        <rect x="21" y="12" width="1" height="2" fill="var(--bg-color, white)" />

        {/* Stand */}
        <rect x="10" y="19" width="4" height="2" fill="currentColor" />
        <rect x="8" y="21" width="8" height="2" fill="currentColor" />
    </svg>
);
