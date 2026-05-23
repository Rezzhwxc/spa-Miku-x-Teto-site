/**
 * spa.js — Single Page Application router for Miku x Teto
 * v5 — search on /index (index.html), player persistence, sidebar sync
 */

// ─── Debug helper ─────────────────────────────────────────────────────────────
const SPA_DEBUG = true;
function log(...a) { if (SPA_DEBUG) console.log('[SPA]', ...a); }
function err(...a) { console.error('[SPA]', ...a); }


// ─── Route map ───────────────────────────────────────────────────────────────
const ROUTES = {
    '/index':    { fragment: 'index',    css: 'index.css',    title: 'Miku x Teto - главная',   contentClass: 'scroll-box',     extraBoxClass: null,   js: initIndex },
    '/tracks':   { fragment: 'tracks',   css: 'tracks.css',   title: 'Miku x Teto - треки',     contentClass: 'scroll-box',     extraBoxClass: null,   js: initTracks },
    '/bio':      { fragment: 'bio',      css: 'bio.css',      title: 'Miku x Teto - биография', contentClass: 'scroll-box',     extraBoxClass: null,   js: initBio },
    '/bio-miku': { fragment: 'bio-miku', css: 'bio-miku.css', title: 'Miku - биография',        contentClass: 'scroll-boxmiku', extraBoxClass: 'boxup',  js: initBioMiku },
    '/bio-teto': { fragment: 'bio-teto', css: 'bio-teto.css', title: 'Teto - биография',        contentClass: 'scroll-boxteto', extraBoxClass: 'boxup',  js: initBioTeto },
    '/profile':  { fragment: 'profile',  css: 'profile.css',  title: 'Miku x Teto - profile',   contentClass: 'scroll-box',     extraBoxClass: null, js: initProfile},
};


function normalizePath(p) {
    p = p.split('?')[0].split('#')[0];
    if (p === '/' || p === '') return '/index';
    return p;
}


// ─── Shell DOM refs ───────────────────────────────────────────────────────────
const appView     = document.getElementById('app-view');
const pageCssEl   = document.getElementById('page-css');
const pageTitleEl = document.getElementById('page-title');
const loaderEl    = document.getElementById('spa-loader');


if (!appView)   err('FATAL: #app-view not found in shell!');
if (!pageCssEl) err('FATAL: #page-css not found in shell!');


// ─── Loading bar ──────────────────────────────────────────────────────────────
function loaderStart() {
    if (!loaderEl) return;
    loaderEl.style.width = '0%';
    loaderEl.classList.add('active');
    requestAnimationFrame(() => { if (loaderEl) loaderEl.style.width = '60%'; });
}
function loaderDone() {
    if (!loaderEl) return;
    loaderEl.style.width = '100%';
    setTimeout(() => { 
        if (loaderEl) {
            loaderEl.classList.remove('active'); 
            loaderEl.style.width = '0%';
        }
    }, 350);
}


// ─── Sidebar ──────────────────────────────────────────────────────────────────
function applySidebarState() {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const contentBox = appView.querySelector('.scroll-box, .scroll-boxmiku, .scroll-boxteto');
    const boxup = appView.querySelector('.boxup');
    const toggleBtn = document.getElementById('sidebarToggle');
    const strelka = document.querySelector('.strelka');
    const zagol = document.querySelector('.zagol');
    const zagcollaps = document.getElementById('zag-collaps');
    const iconContainers = document.querySelectorAll('.icon-container');
    const textLinks = document.querySelectorAll('.text-link');
    
    if (contentBox) collapsed ? contentBox.classList.add('collapsed') : contentBox.classList.remove('collapsed');
    if (boxup) collapsed ? boxup.classList.add('collapsed') : boxup.classList.remove('collapsed');
    if (toggleBtn) collapsed ? toggleBtn.classList.add('collapsed') : toggleBtn.classList.remove('collapsed');
    if (strelka) collapsed ? strelka.classList.add('collapsed') : strelka.classList.remove('collapsed');
    if (zagol) collapsed ? zagol.classList.add('collapsed') : zagol.classList.remove('collapsed');
    if (zagcollaps) collapsed ? zagcollaps.classList.add('collapsed') : zagcollaps.classList.remove('collapsed');
    iconContainers.forEach(el => collapsed ? el.classList.add('collapsed') : el.classList.remove('collapsed'));
    textLinks.forEach(el => collapsed ? el.classList.add('collapsed') : el.classList.remove('collapsed'));
    if (toggleBtn) toggleBtn.setAttribute('aria-label', collapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
}


(function bindSidebarToggle() {
    const btn = document.getElementById('sidebarToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const contentBox = appView.querySelector('.scroll-box, .scroll-boxmiku, .scroll-boxteto');
        const boxup = appView.querySelector('.boxup');
        const strelka = document.querySelector('.strelka');
        const zagol = document.querySelector('.zagol');
        const zagcollaps = document.getElementById('zag-collaps');
        
        if (contentBox) contentBox.classList.toggle('collapsed');
        if (boxup) boxup.classList.toggle('collapsed');
        btn.classList.toggle('collapsed');
        if (strelka) strelka.classList.toggle('collapsed');
        if (zagol) zagol.classList.toggle('collapsed');
        if (zagcollaps) zagcollaps.classList.toggle('collapsed');
        document.querySelectorAll('.icon-container').forEach(el => el.classList.toggle('collapsed'));
        document.querySelectorAll('.text-link').forEach(el => el.classList.toggle('collapsed'));
        
        const isCollapsed = contentBox ? contentBox.classList.contains('collapsed') : false;
        btn.setAttribute('aria-label', isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
})();


// ─── Link delegation ──────────────────────────────────────────────────────────
function delegateLinks(root) {
    if (!root) return;
    root.querySelectorAll('a[href]').forEach(a => {
        if (a._spaLinked) return;
        const href = a.getAttribute('href');
        if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto')) return;
        let targetPath;
        try { targetPath = normalizePath(new URL(a.href, location.origin).pathname); } catch { return; }
        if (ROUTES[targetPath]) {
            a._spaLinked = true;
            a.addEventListener('click', e => { e.preventDefault(); navigateTo(targetPath); });
        }
    });
}


function loadPageCss(href) {
    return new Promise((resolve) => {
        const targetHref = '/static/css/' + href;

        if (pageCssEl.getAttribute('href') === targetHref || pageCssEl.href.endsWith('/' + href)) {
            if (pageCssEl.sheet) {
                resolve();
            } else {
                pageCssEl.addEventListener('load', function onLoad() {
                    pageCssEl.removeEventListener('load', onLoad);
                    resolve();
                }, { once: true });
            }
            return;
        }

        const onLoad = () => {
            pageCssEl.removeEventListener('load', onLoad);
            resolve();
        };

        pageCssEl.addEventListener('load', onLoad);
        pageCssEl.href = targetHref;
    });
}


// ─── Core router ─────────────────────────────────────────────────────────────
let currentPath = null;
let isFetching  = false;


async function navigateTo(path, pushState = true) {
    path = normalizePath(path);
    if (isFetching) { log('busy, skip', path); return; }

    const route = ROUTES[path];
    if (!route) {
        err('No route for', path);
        showError('Маршрут не найден: ' + path);
        return;
    }

    log('→', path, '| fetching /api/fragment/' + route.fragment);
    isFetching = true;
    loaderStart();

    try {
        const res = await fetch('/api/fragment/' + route.fragment, { cache: 'no-store' });
        log('response status:', res.status, '| url:', res.url);

        if (!res.ok) {
            showError('Сервер вернул ' + res.status + ' для /api/fragment/' + route.fragment);
            return;
        }

        const html = await res.text();
        log('html length:', html.length);

        if (html.includes('id="app-view"')) {
            showError('/api/fragment/' + route.fragment + ' вернул SPA shell — проверь api.py');
            return;
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const contentEl = doc.querySelector('.' + route.contentClass);
        const boxupEl = route.extraBoxClass ? doc.querySelector('.' + route.extraBoxClass) : null;

        log('contentEl (.' + route.contentClass + '):', !!contentEl);

        if (!contentEl) {
            showError('Не найден элемент .' + route.contentClass + ' во фрагменте "' + route.fragment + '"');
            return;
        }

        appView.style.transition = 'opacity 0.1s ease';
        appView.style.opacity = '0';
        await sleep(130);

        await loadPageCss(route.css);

        appView.innerHTML = '';
        if (boxupEl) appView.appendChild(boxupEl.cloneNode(true));
        appView.appendChild(contentEl.cloneNode(true));

        if (pushState) history.pushState({ path }, route.title, path);
        pageTitleEl.textContent = route.title;
        currentPath = path;

        delegateLinks(appView);
        applySidebarState();
        route.js();

        requestAnimationFrame(() => {
            appView.style.opacity = '1';
        });

        // ─── ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ КОНТЕНТА ────────────────────────────
            if (path === '/index') {
                setTimeout(async () => {
                if (typeof loadSongs === 'function') {
                    await loadSongs();
                }
                if (typeof restorePlayerUI === 'function') {
                    restorePlayerUI();
                }
                // Переинициализируем круги на главной
                if (typeof reinitCirculindex === 'function') {
                    setTimeout(() => {
                        reinitCirculindex();
                    }, 50);
                } else if (typeof refreshCirculsUI === 'function') {
                    refreshCirculsUI();
                } else if (typeof initCirculindex === 'function') {
                    initCirculindex();
                }
                // Запускаем поиск
                if (typeof initSearch === 'function') {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        initSearch();
                }
            }
                const scrollToContent2 = sessionStorage.getItem('scrollToContent2');
                if (scrollToContent2 === 'true') {
                    sessionStorage.removeItem('scrollToContent2');
                    setTimeout(() => {
                        const target = document.getElementById('content2');
                        const scrollBox = document.querySelector('.scroll-box');
                        if (target && scrollBox) {
                            const offsetTop = target.offsetTop - 80;
                            scrollBox.scrollTo({ top: offsetTop, behavior: 'smooth' });
                            console.log('[SPA] Прокрутка к #content2 выполнена');
                        } else {
                            console.warn('[SPA] Не найдены #content2 или .scroll-box');
                        }
                    }, 200); // задержка, чтобы DOM точно отрисовался
                }
        }, 100);
    } else if (path === '/tracks') {
    setTimeout(async () => {
        if (typeof loadSongs === 'function') {
            await loadSongs();
        }
        if (typeof restorePlayerUI === 'function') {
            restorePlayerUI();
        }
        // ★ Инициализация поиска на странице треков ★
        if (typeof initSearch === 'function') {
            setTimeout(() => {
                initSearch();
            }, 50);
        }
    }, 0);
}
        
        loaderDone();

    } catch (e) {
        err('fetch error:', e);
        showError('Ошибка сети: ' + e.message);
    } finally {
        isFetching = false;
    }
}


function showError(msg) {
    err(msg);
    loaderDone();
    appView.style.opacity = '1';
    appView.innerHTML =
        '<div style="color:#e6e3e3;padding:50px 40px;font-family:monospace;font-size:15px;' +
        'background:#1a1a1a;border:1px solid #555;border-radius:12px;margin:30px;line-height:1.8">' +
        '<b style="color:#ff6b6b;font-size:17px">⚠ SPA Error</b><br><br>' + msg +
        '<br><br><small style="color:#777">DevTools → Console для деталей</small></div>';
}


// ─── Page init callbacks ──────────────────────────────────────────────────────

function initIndex() { 
    log('initIndex');
    // Все инициализации теперь в navigateTo
}

function initTracks() {
    log('initTracks');
    // Сбрасываем фильтр персонажа — на треках должны играть все треки подряд
    window.currentCharacterFilter = null;
}

function initProfile() {
    log('initProfile');
}

function initBio() {
    log('initBio');
    const mikuLink = appView.querySelector('#miku a');
    const tetoLink = appView.querySelector('#teto a');
    if (mikuLink) {
        mikuLink.addEventListener('click', e => { 
            e.preventDefault(); 
            navigateTo('/bio-miku'); 
        });
    }
    if (tetoLink) {
        tetoLink.addEventListener('click', e => { 
            e.preventDefault(); 
            navigateTo('/bio-teto'); 
        });
    }
}

function initBioMiku() { 
    log('initBioMiku');
    // Кнопка перехода к трекам
    const travelBtn = document.querySelector('#traveltracks');
    if (travelBtn) {
        travelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('scrollToContent2', 'true');
            navigateTo('/index');
        });
    }
}

function initBioTeto() {
    log('initBioTeto');
    const v = appView.querySelector('#song');
    if (v) v.volume = 0.17;
    // Кнопка перехода к трекам
    const travelBtn = document.querySelector('#traveltracks');
    if (travelBtn) {
        travelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('scrollToContent2', 'true');
            navigateTo('/index');
        });
    }
}


// ─── Back / forward ───────────────────────────────────────────────────────────
window.addEventListener('popstate', e => {
    navigateTo(e.state?.path || normalizePath(location.pathname), false);
});


// ─── Wire sidebar links (shell, wired once) ───────────────────────────────────
delegateLinks(document.querySelector('.sidebar'));


// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// ─── Boot ─────────────────────────────────────────────────────────────────────
log('boot | path:', location.pathname);
history.replaceState({ path: normalizePath(location.pathname) }, document.title, location.pathname);
navigateTo(normalizePath(location.pathname), false);