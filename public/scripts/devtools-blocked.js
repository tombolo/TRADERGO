(function () {
    var STYLE_ID = 'devtools-blocked-styles';

    var CSS =
        '.devtools-blocked{position:relative;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2.4rem;overflow:hidden;background:radial-gradient(circle at top left,rgba(34,197,94,.18),transparent 32%),radial-gradient(circle at bottom right,rgba(16,185,129,.12),transparent 28%),linear-gradient(160deg,#020617 0%,#0f172a 45%,#111827 100%);color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
        '.devtools-blocked__glow{position:absolute;inset:auto;width:28rem;height:28rem;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.22) 0%,rgba(34,197,94,0) 70%);filter:blur(12px);pointer-events:none;animation:devtools-blocked-pulse 4s ease-in-out infinite}' +
        '.devtools-blocked__glow--top{top:8%;left:12%}' +
        '.devtools-blocked__glow--bottom{right:10%;bottom:10%;animation-delay:1.5s}' +
        '.devtools-blocked__card{position:relative;z-index:1;width:min(100%,52rem);padding:3.2rem 2.8rem;border:1px solid rgba(148,163,184,.18);border-radius:2rem;background:rgba(15,23,42,.82);box-shadow:0 24px 60px rgba(2,6,23,.45),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(18px);text-align:center}' +
        '.devtools-blocked__logo{width:7.2rem;height:7.2rem;margin:0 auto 1.8rem;border-radius:1.6rem;object-fit:cover;box-shadow:0 12px 30px rgba(34,197,94,.18)}' +
        '.devtools-blocked__icon{display:inline-flex;align-items:center;justify-content:center;width:5.6rem;height:5.6rem;margin-bottom:1.6rem;border-radius:1.6rem;background:linear-gradient(135deg,rgba(34,197,94,.18),rgba(16,185,129,.08));color:#4ade80;box-shadow:inset 0 0 0 1px rgba(74,222,128,.18)}' +
        '.devtools-blocked__icon svg{width:2.8rem;height:2.8rem}' +
        '.devtools-blocked__eyebrow{margin:0 0 .8rem;color:#86efac;font-size:1.2rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase}' +
        '.devtools-blocked__title{margin:0 0 1.2rem;font-size:clamp(2.4rem,4vw,3.2rem);font-weight:700;line-height:1.15;letter-spacing:-.03em}' +
        '.devtools-blocked__message{margin:0 auto 1rem;max-width:38rem;color:#cbd5e1;font-size:1.7rem;line-height:1.6}' +
        '.devtools-blocked__hint{margin:0 auto 2.4rem;max-width:34rem;color:#94a3b8;font-size:1.45rem;line-height:1.6}' +
        '.devtools-blocked__actions{display:flex;justify-content:center}' +
        '.devtools-blocked__button{display:inline-flex;align-items:center;justify-content:center;min-width:16rem;padding:1.2rem 2rem;border:none;border-radius:999px;background:linear-gradient(135deg,#15803d 0%,#16a34a 55%,#22c55e 100%);color:#f8fafc;font-size:1.5rem;font-weight:600;cursor:pointer;box-shadow:0 12px 30px rgba(34,197,94,.28);transition:transform .2s ease,box-shadow .2s ease}' +
        '.devtools-blocked__button:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(34,197,94,.34)}' +
        '@keyframes devtools-blocked-pulse{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.08);opacity:1}}';

    var SHIELD_ICON =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L4 6.5V11.5C4 16.2 7.1 20.5 12 21.5C16.9 20.5 20 16.2 20 11.5V6.5L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 12.2L11.2 14L14.8 10.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function ensureStyles(doc) {
        if (doc.getElementById(STYLE_ID)) return;

        var style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        doc.head.appendChild(style);
    }

    function renderDevToolsBlockedScreen(doc) {
        doc = doc || document;
        ensureStyles(doc);

        doc.body.innerHTML = '';
        doc.body.style.margin = '0';
        doc.body.style.background = '#020617';

        var screen = doc.createElement('div');
        screen.className = 'devtools-blocked';
        screen.setAttribute('role', 'alert');
        screen.innerHTML =
            '<div class="devtools-blocked__glow devtools-blocked__glow--top"></div>' +
            '<div class="devtools-blocked__glow devtools-blocked__glow--bottom"></div>' +
            '<div class="devtools-blocked__card">' +
            '<img class="devtools-blocked__logo" src="/assets/images/MERRICK.png" alt="TRADER GO" />' +
            '<div class="devtools-blocked__icon">' +
            SHIELD_ICON +
            '</div>' +
            '<p class="devtools-blocked__eyebrow">Security Notice</p>' +
            '<h1 class="devtools-blocked__title">Access Restricted</h1>' +
            '<p class="devtools-blocked__message">This application cannot be used while developer tools are open.</p>' +
            '<p class="devtools-blocked__hint">Close developer tools, then refresh the page to continue using TRADER GO.</p>' +
            '<div class="devtools-blocked__actions">' +
            '<button type="button" class="devtools-blocked__button">Refresh Page</button>' +
            '</div>' +
            '</div>';

        var refreshButton = screen.querySelector('.devtools-blocked__button');
        if (refreshButton) {
            refreshButton.addEventListener('click', function () {
                window.location.reload();
            });
        }

        doc.body.appendChild(screen);
    }

    window.renderDevToolsBlockedScreen = renderDevToolsBlockedScreen;
})();
