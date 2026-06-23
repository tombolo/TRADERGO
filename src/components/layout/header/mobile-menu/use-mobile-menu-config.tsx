import { ComponentProps, ReactNode, useMemo } from 'react';
import RootStore from '@/stores/root-store';
import { LegacyLogout1pxIcon } from '@deriv/quill-icons/Legacy';
import { useTranslations } from '@deriv-com/translations';

export type TSubmenuSection = 'accountSettings' | 'cashier' | 'reports';

//IconTypes
type TMenuConfig = {
    LeftComponent: React.ElementType;
    RightComponent?: ReactNode;
    as: 'a' | 'button';
    href?: string;
    label: ReactNode;
    onClick?: () => void;
    removeBorderBottom?: boolean;
    submenu?: TSubmenuSection;
    target?: ComponentProps<'a'>['target'];
    isActive?: boolean;
}[];

const useMobileMenuConfig = (client?: RootStore['client'], onLogout?: () => void) => {
    const { localize } = useTranslations();

    const menuConfig = useMemo((): TMenuConfig[] => {
        return [
            [
                client?.is_logged_in &&
                    onLogout && {
                        as: 'button',
                        label: localize('Log out'),
                        LeftComponent: LegacyLogout1pxIcon,
                        onClick: onLogout,
                        removeBorderBottom: true,
                    },
            ].filter(Boolean) as TMenuConfig,
        ].filter(section => section.length > 0);
    }, [client?.is_logged_in, onLogout, localize]);

    return {
        config: menuConfig,
    };
};

export default useMobileMenuConfig;
