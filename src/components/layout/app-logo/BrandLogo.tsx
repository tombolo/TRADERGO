type TBrandLogoProps = {
    width?: number;
    height?: number;
    className?: string;
};

export const BrandLogo = ({
    width = 120,
    height = 32,
    className = ''
}: TBrandLogoProps) => {
    return (
        <img
            src='/assets/images/MERRICK.png'
            alt='Merrick'
            width={width}
            height={height}
            className={className}
            decoding='async'
            loading='eager'
            onError={e => {
                const img = e.currentTarget;
                const current = img.getAttribute('src') || '';

                // Try a few common locations/extensions before falling back.
                const candidates = [
                    '/assets/images/MERRICK.png',
                    '/assets/images/MERRICK.pnd',
                    '/images/MERRICK.png',
                    '/images/MERRICK.pnd',
                    '/deriv-logo.svg',
                ];

                const next = candidates[Math.min(candidates.indexOf(current) + 1, candidates.length - 1)];
                img.src = next;
            }}
        />
    );
};
