import { useCallback } from 'react';
import { useStore } from './useStore';

const useThemeSwitcher = () => {
    const { ui } = useStore() ?? {
        ui: {
            setDarkMode: () => {},
            is_dark_mode_on: false,
        },
    };
    const { setDarkMode, is_dark_mode_on } = ui;

    const applyDarkMode = useCallback(
        (dark: boolean) => {
            const body = document.querySelector('body');
            if (!body) return;
            if (dark) {
                localStorage.setItem('theme', 'dark');
                body.classList.remove('theme--light');
                body.classList.add('theme--dark');
                setDarkMode(true);
            } else {
                localStorage.setItem('theme', 'light');
                body.classList.remove('theme--dark');
                body.classList.add('theme--light');
                setDarkMode(false);
            }
        },
        [setDarkMode]
    );

    const toggleTheme = useCallback(() => {
        const body = document.querySelector('body');
        if (!body) return;
        applyDarkMode(!body.classList.contains('theme--dark'));
    }, [applyDarkMode]);

    return {
        toggleTheme,
        is_dark_mode_on,
        setDarkMode,
        applyDarkMode,
    };
};

export default useThemeSwitcher;
