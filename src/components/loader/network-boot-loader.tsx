import { BrandLogo } from '@/components/layout/app-logo/BrandLogo';
import './network-boot-loader.scss';

type NetworkBootLoaderProps = {
    /** Primary status line (e.g. localized loading message). */
    message?: string;
    /** Optional secondary hint under the main message. */
    hint?: string;
};

const STAR_SEEDS = Array.from({ length: 56 }, (_, i) => ({
    left: ((i * 47 + 11) % 96) + 2,
    top: ((i * 31 + 5) % 92) + 4,
    scale: 0.45 + ((i * 13) % 7) / 10,
    delay: ((i * 17) % 24) * 0.08,
    duration: 2.2 + ((i * 5) % 10) * 0.15,
}));

export default function NetworkBootLoader({ message, hint }: NetworkBootLoaderProps) {
    const primary = message?.trim();
    const secondary = hint?.trim();

    return (
        <div
            className='network-boot'
            role='status'
            aria-live='polite'
            aria-busy='true'
            data-testid='dt_network_boot_loader'
        >
            <div className='network-boot__bg' aria-hidden />
            <div className='network-boot__nebula' aria-hidden />
            <div className='network-boot__grid' aria-hidden />
            <div className='network-boot__horizon' aria-hidden />
            <div className='network-boot__uplinks' aria-hidden>
                {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} className='network-boot__uplink' style={{ animationDelay: `${i * 0.55}s` }} />
                ))}
            </div>

            <div className='network-boot__stars' aria-hidden>
                {STAR_SEEDS.map((s, i) => (
                    <span
                        key={i}
                        className='network-boot__star'
                        style={{
                            left: `${s.left}%`,
                            top: `${s.top}%`,
                            transform: `scale(${s.scale})`,
                            animationDelay: `${s.delay}s`,
                            animationDuration: `${s.duration}s`,
                        }}
                    />
                ))}
            </div>

            <div className='network-boot__globe' aria-hidden>
                <svg className='network-boot__globe-svg' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
                    <defs>
                        <linearGradient id='network-boot-globe-fill' x1='0%' y1='0%' x2='100%' y2='100%'>
                            <stop offset='0%' stopColor='rgba(56,189,248,0.22)' />
                            <stop offset='40%' stopColor='rgba(99,102,241,0.18)' />
                            <stop offset='100%' stopColor='rgba(15,23,42,0.35)' />
                        </linearGradient>
                        <linearGradient id='network-boot-arc' x1='0%' y1='0%' x2='100%' y2='0%'>
                            <stop offset='0%' stopColor='transparent' />
                            <stop offset='40%' stopColor='rgba(34,211,238,0.85)' />
                            <stop offset='100%' stopColor='transparent' />
                        </linearGradient>
                        <radialGradient id='network-boot-globe-limb' cx='35%' cy='30%' r='65%'>
                            <stop offset='0%' stopColor='rgba(253,224,71,0.15)' />
                            <stop offset='45%' stopColor='rgba(56,189,248,0.08)' />
                            <stop offset='100%' stopColor='transparent' />
                        </radialGradient>
                    </defs>
                    <circle className='network-boot__globe-back' cx='100' cy='100' r='88' />
                    <circle cx='100' cy='100' r='88' fill='url(#network-boot-globe-limb)' />
                    <g className='network-boot__globe-spin'>
                        <ellipse className='network-boot__globe-ring' cx='100' cy='100' rx='88' ry='36' />
                        <ellipse
                            className='network-boot__globe-ring network-boot__globe-ring--b'
                            cx='100'
                            cy='100'
                            rx='36'
                            ry='88'
                        />
                        <ellipse
                            className='network-boot__globe-ring network-boot__globe-ring--c'
                            cx='100'
                            cy='100'
                            rx='72'
                            ry='72'
                        />
                    </g>
                    <g className='network-boot__globe-dots'>
                        <circle cx='48' cy='92' r='2.5' />
                        <circle cx='152' cy='108' r='2.5' />
                        <circle cx='100' cy='32' r='2.5' />
                        <circle cx='100' cy='168' r='2.5' />
                        <circle cx='168' cy='72' r='2' />
                        <circle cx='32' cy='128' r='2' />
                    </g>
                    <path
                        className='network-boot__globe-arc'
                        d='M 24 100 Q 100 40 176 100'
                        fill='none'
                        stroke='url(#network-boot-arc)'
                        strokeWidth='1.5'
                    />
                    <path
                        className='network-boot__globe-arc network-boot__globe-arc--delay'
                        d='M 176 100 Q 100 160 24 100'
                        fill='none'
                        stroke='url(#network-boot-arc)'
                        strokeWidth='1.2'
                        opacity='0.65'
                    />
                </svg>
            </div>

            <div className='network-boot__constellation' aria-hidden>
                <svg
                    className='network-boot__constellation-svg'
                    viewBox='0 0 400 260'
                    preserveAspectRatio='xMidYMid slice'
                >
                    <defs>
                        <linearGradient id='network-boot-link' x1='0%' y1='0%' x2='100%' y2='0%'>
                            <stop offset='0%' stopColor='rgba(129,140,248,0.15)' />
                            <stop offset='50%' stopColor='rgba(34,211,238,0.55)' />
                            <stop offset='100%' stopColor='rgba(167,139,250,0.15)' />
                        </linearGradient>
                    </defs>
                    <g className='network-boot__constellation-lines'>
                        <path
                            d='M32 140 L108 88 L200 130 L292 72 L368 118'
                            fill='none'
                            className='network-boot__constellation-path'
                        />
                        <path
                            d='M32 140 L108 192 L200 130 L292 188 L368 118'
                            fill='none'
                            className='network-boot__constellation-path network-boot__constellation-path--b'
                        />
                        <path
                            d='M108 88 L108 192 M292 72 L292 188'
                            fill='none'
                            className='network-boot__constellation-path network-boot__constellation-path--c'
                        />
                    </g>
                    <g className='network-boot__constellation-nodes'>
                        <circle cx='32' cy='140' r='3.5' />
                        <circle cx='108' cy='88' r='3' />
                        <circle cx='108' cy='192' r='3' />
                        <circle cx='200' cy='130' r='4' />
                        <circle cx='292' cy='72' r='3' />
                        <circle cx='292' cy='192' r='3' />
                        <circle cx='368' cy='118' r='3.5' />
                    </g>
                </svg>
            </div>

            <div className='network-boot__nodes' aria-hidden>
                {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className='network-boot__node' style={{ animationDelay: `${(i % 8) * 0.2}s` }} />
                ))}
            </div>

            <div className='network-boot__packets' aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className='network-boot__packet' style={{ animationDelay: `${i * 0.75}s` }} />
                ))}
            </div>

            <div className='network-boot__card'>
                <div className='network-boot__logo-section'>
                    <BrandLogo width={140} height={40} className='network-boot__logo' />
                </div>

                <div className='network-boot__orbit' aria-hidden>
                    <span className='network-boot__orbit-ring' />
                    <span className='network-boot__orbit-ring network-boot__orbit-ring--delayed' />
                    <span className='network-boot__orbit-satellite' />
                    <span className='network-boot__orbit-hub' />
                </div>

                {primary ? <p className='network-boot__message'>{primary}</p> : null}
                {secondary ? <p className='network-boot__hint'>{secondary}</p> : null}

                <div className='network-boot__bar' aria-hidden>
                    <div className='network-boot__bar-fill' />
                </div>

                <div className='network-boot__ticks' aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} className='network-boot__tick' style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                </div>

                <div className='network-boot__footer'>
                    <p className='network-boot__powered-by'>Powered by <span className='network-boot__deriv-brand'>Deriv</span></p>
                </div>
            </div>
        </div>
    );
}
