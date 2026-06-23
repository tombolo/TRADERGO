import { observer } from 'mobx-react-lite';
import OrbitDotsLoader from '@/components/loader/orbit-dots-loader';
import { useStore } from '@/hooks/useStore';

const BlocklyLoading = observer(() => {
    const { blockly_store } = useStore();
    const { is_loading } = blockly_store;

    return (
        <>
            {is_loading && (
                <div className='bot__loading' data-testid='blockly-loader'>
                    <OrbitDotsLoader label='Loading Blockly' />
                    <div>Loading Blockly...</div>
                </div>
            )}
        </>
    );
});

export default BlocklyLoading;
