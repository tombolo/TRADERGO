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
            <div className='network-boot__nodes' aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                    <span
                        key={i}
                        className='network-boot__node'
                        style={{ animationDelay: `${(i % 6) * 0.22}s` }}
                    />
                ))}
            </div>

            <div className='network-boot__card'>
                <div className='network-boot__orbit' aria-hidden>
                    <span className='network-boot__orbit-ring' />
                    <span className='network-boot__orbit-ring network-boot__orbit-ring--delayed' />
                    <span className='network-boot__orbit-hub' />
                </div>

                {primary ? <p className='network-boot__message'>{primary}</p> : null}
                {secondary ? <p className='network-boot__hint'>{secondary}</p> : null}

                <div className='network-boot__bar' aria-hidden>
                    <div className='network-boot__bar-fill' />
                </div>

                <div className='network-boot__ticks' aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className='network-boot__tick' style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
