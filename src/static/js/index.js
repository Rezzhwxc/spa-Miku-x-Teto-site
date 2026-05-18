// knopka
let toggleButton = document.getElementById('sidebarToggle');
let contentbox = document.querySelector('.scroll-box');
let strelka = document.querySelector('.strelka');
let txt = document.querySelectorAll('.text-link');
let linkimg = document.querySelectorAll('.icon-container');
let zagol = document.querySelector('.zagol');
let zagcollaps = document.getElementById('zag-collaps');


// ===== ЗАГРУЗКА СОСТОЯНИЯ =====
const savedState = localStorage.getItem('sidebarCollapsed');
if (savedState === 'true') {
    contentbox.classList.add('collapsed');
    toggleButton.classList.add('collapsed');
    strelka.classList.add('collapsed');
    zagol.classList.add('collapsed');
    zagcollaps.classList.add('collapsed');
    linkimg.forEach(el => el.classList.add('collapsed'));
    txt.forEach(el => el.classList.add('collapsed'));
    toggleButton.setAttribute('aria-label', 'Развернуть сайдбар');
}

// ===== КЛИК =====
toggleButton.addEventListener('click', () => {
    contentbox.classList.toggle('collapsed');
    toggleButton.classList.toggle('collapsed');
    strelka.classList.toggle('collapsed');
    zagol.classList.toggle('collapsed');
    zagcollaps.classList.toggle('collapsed');

    linkimg.forEach(el => el.classList.toggle('collapsed'));
    txt.forEach(el => el.classList.toggle('collapsed'));

    const isCollapsed = contentbox.classList.contains('collapsed');
    toggleButton.setAttribute('aria-label', isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
    
    // ===== СОХРАНЕНИЕ =====
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});


// ─── ФИЛЬТРАЦИЯ ТРЕКОВ ПО ВОКАЛОИДАМ ДЛЯ INDEX.HTML ──────────────────────────

let indexHandlersBound = false;
let indexCurrentFilter = null;

const defaultCovers = {
    '1': '/static/img/miku-cover.jpg',
    '2': '/static/img/teto-cover.jpg',
    '3': '/static/img/duo-cover.jpg'
};

function normCharacterId(characterId) {
    const n = Number(characterId);
    return Number.isFinite(n) ? n : null;
}

function getBaseSongsList() {
    return window.originalSongsList?.length ? window.originalSongsList : (window.songsList || []);
}

function getSongsByCharacter(characterId) {
    const songsList = getBaseSongsList();
    if (!songsList.length) return [];
    const id = normCharacterId(characterId);
    if (id === null) return songsList;
    return songsList.filter(song => Number(song.vocaloid_id) === id);
}

function setCirculCover(circul, characterId) {
    let coverImg = circul.querySelector('.circulindex-cover');

    if (!coverImg) {
        coverImg = document.createElement('img');
        coverImg.className = 'circulindex-cover';
        circul.insertBefore(coverImg, circul.firstChild);
    }

    coverImg.src = defaultCovers[characterId] || '/static/img/default-cover.png';
    coverImg.alt = circul.querySelector('.txtindex')?.innerText || 'Cover';
}

function updateCirculPlayIcon(characterId, isPlaying) {
    const circul = document.querySelector(`.circulindex[data-character="${characterId}"]`);
    if (!circul) return;

    const icon = circul.querySelector('.iconindex');
    if (icon) {
        icon.src = isPlaying ? '/static/img/pause-button.png' : '/static/img/Polygon 3 (1).png';
    }
}

function displayFilteredSongs(songs) {
    const container = document.getElementById('song-container');
    if (!container) return;

    if (!songs || songs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#e6e3e3d7;font-size:27px;font-family:monospace;user-select:none">Нет треков с этим вокалоидом 😔</p>';
        return;
    }

    container.innerHTML = songs.map(song => {
        const vocaloidName = song.vocaloid_name || 'Vocaloid';
        const vocaloidUrl = (song.vocaloid_url && song.vocaloid_url !== 'null') ? song.vocaloid_url : '#';
        return `
            <div class="song" data-id="${song.id}" data-name="${escapeHtml(song.name)}">
                <img class="song-ava" src="${song.photo ? `/photo/${song.photo}` : '/static/img/zag-collaps.png'}" onerror="this.src='/static/img/zag-collaps.png'">
                <div>
                    <p class="namet">${escapeHtml(song.name)}</p>
                    <p class="autor vocaloid-link" data-url="${vocaloidUrl}">${escapeHtml(vocaloidName)}</p>
                </div>
                <button class="like-song-btn" data-id="${song.id}" data-liked="false">
                    <img class="like-icon" src="/static/img/heart.png" alt="добавить в избранное">
                </button>
            </div>
        `;
    }).join('');

    if (typeof window.attachSongHandlers === 'function') window.attachSongHandlers();
    if (typeof window.attachLikeHandlers === 'function') window.attachLikeHandlers();
    if (typeof window.attachVocaloidLinkHandlers === 'function') window.attachVocaloidLinkHandlers();
    if (typeof window.attachSongBoxHandlers === 'function') window.attachSongBoxHandlers();
}

function getRandomSongByCharacter(characterId) {
    const songsList = getBaseSongsList();
    if (!songsList.length) return null;

    const id = normCharacterId(characterId);
    const filtered = id === null
        ? songsList
        : songsList.filter(song => Number(song.vocaloid_id) === id);

    if (!filtered.length) return null;
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
}

function filterByCharacter(characterId) {
    const songsList = getBaseSongsList();
    if (!songsList.length) return;

    const id = normCharacterId(characterId);
    indexCurrentFilter = id;

    const filtered = id === null
        ? songsList
        : songsList.filter(song => Number(song.vocaloid_id) === id);

    displayFilteredSongs(filtered);

    document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
    if (id !== null) {
        document.querySelector(`.circulindex[data-character="${id}"]`)?.classList.add('active-filter');
    }
}

function playRandomSongByCharacter(characterId) {
    const randomSong = getRandomSongByCharacter(characterId);
    if (randomSong && typeof window.playSongById === 'function') {
        window.playSongById(randomSong.id, true);
    }
}

function togglePlayPauseForCharacter(characterId) {
    const songsList = getBaseSongsList();
    if (!songsList.length) return;

    const id = normCharacterId(characterId);
    const currentSong = songsList.find(s => s.id == window.currentSongId);

    if (!currentSong) {
        playRandomSongByCharacter(characterId);
        return;
    }

    const isCurrentInCategory = Number(currentSong.vocaloid_id) === id;

    if (isCurrentInCategory) {
        if (typeof window.togglePlayPause === 'function') {
            window.togglePlayPause();
        }
    } else {
        playRandomSongByCharacter(characterId);
    }
}

function refreshCirculsUI() {
    const circuls = document.querySelectorAll('.circulindex');

    circuls.forEach(circul => {
        const characterId = circul.dataset.character;
        setCirculCover(circul, characterId);
    });

    const currentSong = getBaseSongsList().find(s => s.id == window.currentSongId);
    const isPlaying = !!(window.currentAudio && !window.currentAudio.paused);

    circuls.forEach(circul => {
        const characterId = circul.dataset.character;
        const id = normCharacterId(characterId);
        const isThisCharacterPlaying = !!currentSong && Number(currentSong.vocaloid_id) === id;
        updateCirculPlayIcon(characterId, isThisCharacterPlaying && isPlaying);
    });
}

function initCharacterFilter() {
    const circuls = document.querySelectorAll('.circulindex');
    if (!circuls.length) return;

    circuls.forEach(circul => {
        if (circul._indexBound) return;
        circul._indexBound = true;

        const characterId = circul.dataset.character;
        setCirculCover(circul, characterId);

        circul.addEventListener('click', (e) => {
            if (e.target.closest('.startstop')) return;
            filterByCharacter(characterId);
        });

        const btn = circul.querySelector('.startstop');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlayPauseForCharacter(characterId);
            });
        }
    });

    displayFilteredSongs(getBaseSongsList());
    refreshCirculsUI();
}

function bindIndexRefreshEvents() {
    if (indexHandlersBound) return;
    indexHandlersBound = true;

    document.addEventListener('play', refreshCirculsUI, true);
    document.addEventListener('pause', refreshCirculsUI, true);
    document.addEventListener('ended', refreshCirculsUI, true);

    document.addEventListener('playStateChanged', () => {
        refreshCirculsUI();
    });
}

function tryInitIndexFilter() {
    if (window.songsList && window.songsList.length > 0) {
        initCharacterFilter();
        bindIndexRefreshEvents();
        return true;
    }
    return false;
}

window.initCharacterFilter = initCharacterFilter;
window.filterByCharacter = filterByCharacter;
window.playRandomSongByCharacter = playRandomSongByCharacter;
window.refreshCirculsUI = refreshCirculsUI;
window.updateCirculPlayIcon = updateCirculPlayIcon;
window.getRandomSongByCharacter = getRandomSongByCharacter;
window.togglePlayPauseForCharacter = togglePlayPauseForCharacter;
window.setCirculCover = setCirculCover;
window.displayFilteredSongs = displayFilteredSongs;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const checkInterval = setInterval(() => {
            if (window.songsList && window.songsList.length > 0) {
                clearInterval(checkInterval);
                initCharacterFilter();
                bindIndexRefreshEvents();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkInterval);
            if (window.songsList && window.songsList.length) {
                initCharacterFilter();
                bindIndexRefreshEvents();
            }
        }, 3000);
    });
} else {
    tryInitIndexFilter();
    bindIndexRefreshEvents();
}

if (typeof window !== 'undefined') {
    let lastUrl = window.location.pathname;
    const observer = new MutationObserver(() => {
        if (window.location.pathname !== lastUrl) {
            lastUrl = window.location.pathname;
            if (lastUrl === '/index' || lastUrl === '/') {
                setTimeout(() => {
                    refreshCirculsUI();
                    displayFilteredSongs(getBaseSongsList());
                }, 100);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}