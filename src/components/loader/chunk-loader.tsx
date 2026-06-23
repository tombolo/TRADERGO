import OrbitDotsLoader from './orbit-dots-loader';

export default function ChunkLoader({ message }: { message: string }) {
    return (
        <div className='app-root'>
            <OrbitDotsLoader />
            {message ? <div className='load-message'>{message}</div> : null}
        </div>
    );
}
