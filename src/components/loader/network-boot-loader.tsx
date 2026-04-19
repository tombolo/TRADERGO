import './network-boot-loader.scss';

type NetworkBootLoaderProps = {
    /** Primary status line (e.g. localized loading message). */
    message?: string;
    /** Optional secondary hint under the main message. */
    hint?: string;
};

export default function NetworkBootLoader({ message, hint }: NetworkBootLoaderProps) {
    const primary = message?.trim();
    const secondary = hint?.trim();

    return (
        <div className='network-boot' role='status' aria-live='polite' aria-busy='true' data-testid='dt_network_boot_loader'>
            <div className='network-boot__bg' aria-hidden />
            <div className='network-boot__grid' aria-hidden />
            <div className='network-boot__glow' aria-hidden />
            <div className='network-boot__aurora' aria-hidden />

            <div className='network-boot__globe' aria-hidden>
                <svg className='network-boot__globe-svg' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
                    <defs>
                        <linearGradient id='network-boot-globe-fill' x1='0%' y1='0%' x2='100%' y2='100%'>
                            <stop offset='0%' stopColor='rgba(45,212,191,0.15)' />
                            <stop offset='50%' stopColor='rgba(99,102,241,0.12)' />
                            <stop offset='100%' stopColor='rgba(56,189,248,0.1)' />
                        </linearGradient>
                        <linearGradient id='network-boot-arc' x1='0%' y1='0%' x2='100%' y2='0%'>
                            <stop offset='0%' stopColor='transparent' />
                            <stop offset='45%' stopColor='rgba(45,212,191,0.9)' />
                            <stop offset='100%' stopColor='transparent' />
                        </linearGradient>
                    </defs>
                    <circle className='network-boot__globe-back' cx='100' cy='100' r='88' />
                    <g className='network-boot__globe-spin'>
                        <ellipse className='network-boot__globe-ring' cx='100' cy='100' rx='88' ry='36' />
                        <ellipse className='network-boot__globe-ring network-boot__globe-ring--b' cx='100' cy='100' rx='36' ry='88' />
                        <ellipse className='network-boot__globe-ring network-boot__globe-ring--c' cx='100' cy='100' rx='72' ry='72' />
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
                        opacity='0.7'
                    />
                </svg>
            </div>

            <div className='network-boot__ai-mesh' aria-hidden>
                <svg className='network-boot__ai-svg' viewBox='0 0 400 240' preserveAspectRatio='xMidYMid slice'>
                    <g className='network-boot__ai-lines'>
                        <path d='M40 120 L120 60 L200 120 L280 48 L360 120' fill='none' className='network-boot__ai-path' />
                        <path d='M40 120 L120 180 L200 120 L280 192 L360 120' fill='none' className='network-boot__ai-path network-boot__ai-path--b' />
                        <path d='M120 60 L120 180' fill='none' className='network-boot__ai-path network-boot__ai-path--c' />
                        <path d='M280 48 L280 192' fill='none' className='network-boot__ai-path network-boot__ai-path--c' />
                    </g>
                    <g className='network-boot__ai-nodes'>
                        <circle cx='40' cy='120' r='4' />
                        <circle cx='120' cy='60' r='4' />
                        <circle cx='120' cy='180' r='4' />
                        <circle cx='200' cy='120' r='5' />
                        <circle cx='280' cy='48' r='4' />
                        <circle cx='280' cy='192' r='4' />
                        <circle cx='360' cy='120' r='4' />
                    </g>
                </svg>
            </div>

            <div className='network-boot__nodes' aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                    <span
                        key={i}
                        className='network-boot__node'
                        style={{ animationDelay: `${(i % 8) * 0.18}s` }}
                    />
                ))}
            </div>

            <div className='network-boot__packets' aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className='network-boot__packet' style={{ animationDelay: `${i * 0.9}s` }} />
                ))}
            </div>

            <div className='network-boot__card'>
                <div className='network-boot__orbit' aria-hidden>
                    <span className='network-boot__orbit-ring' />
                    <span className='network-boot__orbit-ring network-boot__orbit-ring--delayed' />
                    <span className='network-boot__orbit-ai' />
                    <span className='network-boot__orbit-hub' />
                </div>

                {primary ? <p className='network-boot__message'>{primary}</p> : null}
                {secondary ? <p className='network-boot__hint'>{secondary}</p> : null}

                <div className='network-boot__bar' aria-hidden>
                    <div className='network-boot__bar-fill' />
                </div>

                <div className='network-boot__ticks' aria-hidden>
                    {Array.from({ length: 7 }).map((_, i) => (
                        <span key={i} className='network-boot__tick' style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
