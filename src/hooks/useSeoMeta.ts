import { useEffect } from 'react';
import {
    DEFAULT_DESCRIPTION,
    DEFAULT_TITLE,
    OG_IMAGE,
    SEO_KEYWORDS,
    SITE_NAME,
    SITE_URL,
    TAB_SEO,
    getTabFromHash,
} from '@/constants/seo';

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
    let el = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function applySeo(tab?: string) {
    const hashTab = tab ?? getTabFromHash();
    const tabMeta = TAB_SEO[hashTab];
    const title = tabMeta?.title ?? DEFAULT_TITLE;
    const description = tabMeta?.description ?? DEFAULT_DESCRIPTION;
    const url = hashTab === 'dashboard' || !hashTab ? `${SITE_URL}/` : `${SITE_URL}/#${hashTab}`;

    document.title = title;
    setMeta('title', title);
    setMeta('description', description);
    setMeta('keywords', SEO_KEYWORDS);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:site_name', SITE_NAME, 'property');
    setMeta('og:image', OG_IMAGE, 'property');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:url', url);
    setMeta('twitter:image', OG_IMAGE);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = url;
}

/** Updates document title and meta tags when the main tab hash changes (SPA SEO). */
export function useSeoMeta(activeTabIndex?: number) {
    useEffect(() => {
        const update = () => applySeo();
        update();
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, [activeTabIndex]);
}
