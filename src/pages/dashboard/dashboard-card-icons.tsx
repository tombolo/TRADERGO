import React from 'react';

const BLUE_900 = '#1e3a8a';

type TIconProps = {
    width?: string;
    height?: string;
    className?: string;
};

export const DashboardMyComputerIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <rect
            x='6'
            y='12'
            width='36'
            height='24'
            rx='3'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
        />
        <rect x='10' y='16' width='28' height='16' rx='1' fill='white' fillOpacity='0.1' />
        <circle cx='16' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <circle cx='20' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <circle cx='24' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <rect x='14' y='24' width='20' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <rect x='14' y='26' width='16' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <rect x='14' y='28' width='12' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <rect x='20' y='38' width='8' height='2' rx='1' fill='white' fillOpacity='0.9' />
    </svg>
);

export const DashboardLocalDeviceIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <rect
            x='8'
            y='10'
            width='32'
            height='28'
            rx='3'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
        />
        <rect x='12' y='16' width='24' height='18' rx='1' fill='white' fillOpacity='0.1' />
        <circle cx='18' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <circle cx='22' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <circle cx='26' cy='20' r='1.5' fill='white' fillOpacity='0.8' />
        <rect x='16' y='24' width='16' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <rect x='16' y='26' width='12' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <rect x='16' y='28' width='8' height='1' rx='0.5' fill='white' fillOpacity='0.6' />
        <circle cx='24' cy='40' r='2' fill='white' fillOpacity='0.9' />
    </svg>
);

export const DashboardGoogleDriveIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <path
            d='M24 4L6 18L12 30L24 44L36 30L42 18L24 4Z'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path
            d='M24 4L42 18L36 30L24 44'
            fill='white'
            fillOpacity='0.1'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path d='M18 22L24 30L30 22' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        <circle cx='24' cy='26' r='1.5' fill='white' fillOpacity='0.8' />
    </svg>
);

export const DashboardBotBuilderIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <rect
            x='6'
            y='12'
            width='36'
            height='24'
            rx='3'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
        />
        <rect x='10' y='16' width='8' height='8' rx='1' fill='white' fillOpacity='0.2' stroke='white' strokeWidth='1' />
        <rect x='20' y='8' width='8' height='8' rx='1' fill='white' fillOpacity='0.2' stroke='white' strokeWidth='1' />
        <rect x='30' y='16' width='8' height='8' rx='1' fill='white' fillOpacity='0.2' stroke='white' strokeWidth='1' />
        <path d='M18 20h4M26 12h4M18 24h12M18 26h8' stroke='white' strokeWidth='1' strokeLinecap='round' />
        <circle cx='14' cy='20' r='1' fill='white' fillOpacity='0.8' />
        <circle cx='26' cy='20' r='1' fill='white' fillOpacity='0.8' />
        <circle cx='34' cy='20' r='1' fill='white' fillOpacity='0.8' />
        <circle cx='24' cy='12' r='1' fill='white' fillOpacity='0.8' />
    </svg>
);

export const DashboardQuickStrategyIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <path
            d='M28 6L16 28h8l-4 14 16-22h-8L28 6Z'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
            strokeLinecap='round'
        />
        <path d='M20 20L24 26L28 20' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        <circle cx='24' cy='23' r='1.5' fill='white' fillOpacity='0.8' />
    </svg>
);

export const DashboardKingOfMatchesIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <path
            d='M24 6L10 14v8c0 8.5 6 16.5 14 20 8-3.5 14-11.5 14-20v-8L24 6z'
            fill='white'
            fillOpacity='0.92'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path
            d='M16 18h4l4-4 4 4h4'
            stroke='white'
            strokeOpacity='0.85'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='24' cy='22' r='3' fill='white' fillOpacity='0.95' />
        <path
            d='M18 30c2 2.5 4 4 6 4s4-1.5 6-4'
            stroke='white'
            strokeOpacity='0.75'
            strokeWidth='1.8'
            strokeLinecap='round'
        />
    </svg>
);

export const DashboardSpeedLabIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <circle cx='24' cy='26' r='14' stroke='white' strokeOpacity='0.95' strokeWidth='2.5' />
        <path
            d='M24 14v4M24 34v4M12 26h4M32 26h4'
            stroke='white'
            strokeOpacity='0.75'
            strokeWidth='2'
            strokeLinecap='round'
        />
        <path
            d='M24 18l2.5 6.5L33 26l-6.5 1.5L24 34l-2.5-6.5L15 26l6.5-1.5L24 18z'
            fill='white'
            fillOpacity='0.92'
            stroke='white'
            strokeWidth='1.2'
            strokeLinejoin='round'
        />
        <path
            d='M30 8l3 5-3 1.5L27 13l3-5z'
            fill='white'
            fillOpacity='0.85'
        />
    </svg>
);

export const DashboardAnalysisIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <rect x='6' y='36' width='6' height='6' rx='1' fill='white' fillOpacity='0.9' />
        <rect x='14' y='30' width='6' height='12' rx='1' fill='white' fillOpacity='0.8' />
        <rect x='22' y='24' width='6' height='18' rx='1' fill='white' fillOpacity='0.7' />
        <rect x='30' y='18' width='6' height='24' rx='1' fill='white' fillOpacity='0.6' />
        <rect x='38' y='12' width='6' height='30' rx='1' fill='white' fillOpacity='0.5' />
        <path d='M4 42h40' stroke='white' strokeWidth='2' strokeLinecap='round' />
        <circle cx='24' cy='8' r='3' fill='white' fillOpacity='0.9' stroke='white' strokeWidth='2' />
        <path d='M20 8L16 4M28 8L32 4' stroke='white' strokeWidth='2' strokeLinecap='round' />
    </svg>
);

/** Alternate face icons for dashboard card flip (pair with primary tile icons). */
export const DashboardFlipFolderIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path
            d='M8 14h12l4 4h16v22H8V14z'
            fill='white'
            fillOpacity='0.88'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path d='M8 20h32' stroke='white' strokeOpacity='0.35' strokeWidth='1' />
        <rect x='14' y='26' width='20' height='3' rx='1' fill='white' fillOpacity='0.45' />
        <rect x='14' y='32' width='14' height='3' rx='1' fill='white' fillOpacity='0.35' />
    </svg>
);

export const DashboardFlipCloudIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path
            d='M14 32h22a8 8 0 000-16 10 10 0 00-18.5-3.5A7 7 0 0014 32z'
            fill='white'
            fillOpacity='0.88'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path d='M20 22l3 3 5-5' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
);

export const DashboardFlipGearIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path
            d='M24 16l1.8 3.6 4 .6-2.9 2.8.7 4L24 25.8l-3.6 1.2.7-4-2.9-2.8 4-.6L24 16z'
            fill='white'
            fillOpacity='0.92'
            stroke='white'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
        <circle cx='24' cy='24' r='4' fill='white' fillOpacity='0.25' stroke='white' strokeWidth='1.5' />
        <path
            d='M24 8v4M24 36v4M8 24h4M36 24h4M12.3 12.3l2.8 2.8M32.9 32.9l2.8 2.8M35.7 12.3l-2.8 2.8M15.1 32.9l-2.8 2.8'
            stroke='white'
            strokeOpacity='0.75'
            strokeWidth='2'
            strokeLinecap='round'
        />
    </svg>
);

export const DashboardFlipRocketIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path
            d='M28 10c8 4 12 14 10 24-6-2-12-2-18 0-2-10 2-20 8-24z'
            fill='white'
            fillOpacity='0.9'
            stroke='white'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <circle cx='26' cy='22' r='3' fill='white' fillOpacity='0.3' />
        <path d='M18 34l-4 8 8-4' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
);

export const DashboardFlipPieIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <circle cx='24' cy='24' r='14' stroke='white' strokeWidth='2' strokeOpacity='0.9' />
        <path d='M24 24V10a14 14 0 0112.1 7l-12.1 7z' fill='white' fillOpacity='0.45' />
        <path d='M24 24l10.4 6a14 14 0 01-20.8-6H24z' fill='white' fillOpacity='0.75' />
        <circle cx='24' cy='24' r='3' fill='white' fillOpacity='0.95' />
    </svg>
);

export const DashboardFlipDiceIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <rect
            x='12'
            y='12'
            width='24'
            height='24'
            rx='4'
            fill='white'
            fillOpacity='0.15'
            stroke='white'
            strokeWidth='2'
        />
        <circle cx='18' cy='18' r='2' fill='white' />
        <circle cx='30' cy='30' r='2' fill='white' />
        <circle cx='24' cy='24' r='2' fill='white' fillOpacity='0.85' />
        <circle cx='18' cy='30' r='2' fill='white' fillOpacity='0.7' />
        <circle cx='30' cy='18' r='2' fill='white' fillOpacity='0.7' />
    </svg>
);

export const DashboardFlipGaugeIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg width={width} height={height} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path
            d='M10 28a14 14 0 1128 0'
            stroke='white'
            strokeWidth='2.5'
            strokeLinecap='round'
            fill='none'
        />
        <path d='M24 28V18' stroke='white' strokeWidth='2.5' strokeLinecap='round' />
        <circle cx='24' cy='28' r='3' fill='white' fillOpacity='0.95' />
        <path d='M16 36h16' stroke='white' strokeOpacity='0.5' strokeWidth='2' strokeLinecap='round' />
    </svg>
);
