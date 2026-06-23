import React from 'react';

const ANALYSIS_ICON_COLOR = '#2563eb';
const KING_OF_MATCHES_ICON_COLOR = '#d97706';
const SPEED_LAB_ICON_COLOR = '#7c3aed';

type TIconProps = {
    width?: string;
    height?: string;
    className?: string;
};

type TDerivIconProps = TIconProps & {
    src: string;
    alt: string;
};

const DerivSvgIcon = ({ width = '48px', height = '48px', className, src, alt }: TDerivIconProps) => (
    <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        decoding='async'
        loading='lazy'
        draggable={false}
        style={{ display: 'block' }}
    />
);

export const DashboardMyComputerIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <DerivSvgIcon
        src='/assets/icons/IcMyComputer.svg'
        alt='My computer'
        width={width}
        height={height}
        className={className}
    />
);

export const DashboardLocalDeviceIcon = DashboardMyComputerIcon;

export const DashboardGoogleDriveIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <DerivSvgIcon
        src='/assets/icons/IcGoogleDriveDbot.svg'
        alt='Google Drive'
        width={width}
        height={height}
        className={className}
    />
);

export const DashboardBotBuilderIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <DerivSvgIcon src='/assets/icons/IcBotBuilder.svg' alt='Bot builder' width={width} height={height} className={className} />
);

export const DashboardQuickStrategyIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <DerivSvgIcon
        src='/assets/icons/IcQuickStrategy.svg'
        alt='Quick strategy'
        width={width}
        height={height}
        className={className}
    />
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
            fill={KING_OF_MATCHES_ICON_COLOR}
            fillOpacity='0.92'
            stroke='#b45309'
            strokeWidth='2'
            strokeLinejoin='round'
        />
        <path
            d='M16 18h4l4-4 4 4h4'
            stroke='#fef3c7'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='24' cy='22' r='3' fill='#fef3c7' />
        <path
            d='M18 30c2 2.5 4 4 6 4s4-1.5 6-4'
            stroke='#fef3c7'
            strokeOpacity='0.9'
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
        <circle cx='24' cy='26' r='14' stroke={SPEED_LAB_ICON_COLOR} strokeWidth='2.5' />
        <path
            d='M24 14v4M24 34v4M12 26h4M32 26h4'
            stroke='#a78bfa'
            strokeWidth='2'
            strokeLinecap='round'
        />
        <path
            d='M24 18l2.5 6.5L33 26l-6.5 1.5L24 34l-2.5-6.5L15 26l6.5-1.5L24 18z'
            fill={SPEED_LAB_ICON_COLOR}
            fillOpacity='0.92'
            stroke='#5b21b6'
            strokeWidth='1.2'
            strokeLinejoin='round'
        />
        <path d='M30 8l3 5-3 1.5L27 13l3-5z' fill='#c4b5fd' />
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
        <rect x='6' y='36' width='6' height='6' rx='1' fill={ANALYSIS_ICON_COLOR} fillOpacity='0.55' />
        <rect x='14' y='30' width='6' height='12' rx='1' fill={ANALYSIS_ICON_COLOR} fillOpacity='0.7' />
        <rect x='22' y='24' width='6' height='18' rx='1' fill={ANALYSIS_ICON_COLOR} fillOpacity='0.85' />
        <rect x='30' y='18' width='6' height='24' rx='1' fill={ANALYSIS_ICON_COLOR} fillOpacity='0.95' />
        <rect x='38' y='12' width='6' height='30' rx='1' fill={ANALYSIS_ICON_COLOR} />
        <path d='M4 42h40' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' />
        <circle cx='24' cy='8' r='3' fill={ANALYSIS_ICON_COLOR} stroke='#1d4ed8' strokeWidth='2' />
        <path d='M20 8L16 4M28 8L32 4' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' />
    </svg>
);

/** Alternate face icons for dashboard card flip (pair with primary tile icons). */
export const DashboardFlipFolderIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
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
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
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
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
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
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
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
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <circle cx='24' cy='24' r='14' stroke='white' strokeWidth='2' strokeOpacity='0.9' />
        <path d='M24 24V10a14 14 0 0112.1 7l-12.1 7z' fill='white' fillOpacity='0.45' />
        <path d='M24 24l10.4 6a14 14 0 01-20.8-6H24z' fill='white' fillOpacity='0.75' />
        <circle cx='24' cy='24' r='3' fill='white' fillOpacity='0.95' />
    </svg>
);

export const DashboardFlipDiceIcon = ({ width = '48px', height = '48px', className }: TIconProps) => (
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
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
    <svg
        width={width}
        height={height}
        viewBox='0 0 48 48'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={className}
    >
        <path d='M10 28a14 14 0 1128 0' stroke='white' strokeWidth='2.5' strokeLinecap='round' fill='none' />
        <path d='M24 28V18' stroke='white' strokeWidth='2.5' strokeLinecap='round' />
        <circle cx='24' cy='28' r='3' fill='white' fillOpacity='0.95' />
        <path d='M16 36h16' stroke='white' strokeOpacity='0.5' strokeWidth='2' strokeLinecap='round' />
    </svg>
);
