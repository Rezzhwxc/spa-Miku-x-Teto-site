// ==================== SIDEBAR ====================
// (sidebar-логика в SPA управляется через spa.js / applySidebarState)
// index.js больше не трогает sidebar — это делает spa.js

// ==================== HELPERS ====================


function getSongs() {
    return window.songsList || [];
}

// ==================== CIRCULINDEX COVERS ====================

const defaultCovers = {
    '1': '/static/img/miku-cover.jpg',
    '2': '/static/img/teto-cover.jpg',
    '3': '/static/img/duo-cover.jpg'
};

function setCirculCover(circul, characterId) {
    let coverImg = circul.querySelector('.circulindex-cover');
    if (!coverImg) {
        coverImg = document.createElement('img');
        coverImg.className = 'circulindex-cover';
        circul.insertBefore(coverImg, circul.firstChild);
    }
    coverImg.src = defaultCovers[characterId] || '/static/img/default-cover.png';
}

// ==================== ИКОНКИ PLAY/PAUSE НА КРУГАХ ====================

function updateAllCirculPlayIcons() {
    const songs = getSongs();
    const currentSong = songs.find(s => s.id == window.currentSongId);
    const isPlaying = window.currentAudio && !window.currentAudio.paused;

    document.querySelectorAll('.circulindex').forEach(circul => {
        const icon = circul.querySelector('.iconindex');
        if (icon) icon.src = '/static/img/Polygon 3 (1).png';
    });

    if (currentSong && isPlaying) {
        const charId = String(currentSong.vocaloid_id);
        const circul = document.querySelector(`.circulindex[data-character="${charId}"]`);
        const icon = circul?.querySelector('.iconindex');
        if (icon) icon.src = '/static/img/pause-button.png';
    }
}

// ==================== СПИСОК ТРЕКОВ ====================

function displayFilteredSongs(songs) {
    const container = document.getElementById('song-container');
    if (!container) return;

    if (!songs || !songs.length) {
        container.innerHTML = '<p style="text-align:center;color:#e6e3e3d7;font-size:27px">Нет треков с этим вокалоидом 😔</p>';
        return;
    }

    container.innerHTML = songs.map(song => {
        const vocaloidName = song.vocaloid_name || 'Vocaloid';
        const vocaloidUrl = (song.vocaloid_url && song.vocaloid_url !== 'null') ? song.vocaloid_url : '#';
        return `
            <div class="song" data-id="${song.id}" data-name="${escapeHtml(song.name)}">
                <img class="song-ava"
                     src="${song.photo ? `/photo/${song.photo}` : '/static/img/zag-collaps.png'}"
                     onerror="this.src='/static/img/zag-collaps.png'">
                <div>
                    <p class="namet">${escapeHtml(song.name)}</p>
                    <p class="autor vocaloid-link" data-url="${vocaloidUrl}">${escapeHtml(vocaloidName)}</p>
                </div>
            </div>
        `;
    }).join('');

    if (typeof window.attachLikeHandlers === 'function') window.attachLikeHandlers();
    if (typeof window.attachVocaloidLinkHandlers === 'function') window.attachVocaloidLinkHandlers();
    if (typeof window.attachSongBoxHandlers === 'function') window.attachSongBoxHandlers();
}

// ==================== ФИЛЬТРАЦИЯ ПО ПЕРСОНАЖУ ====================

function getRandomSongByCharacter(characterId) {
    const filtered = getSongs().filter(s => String(s.vocaloid_id) === String(characterId));
    if (!filtered.length) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
}

function filterByCharacter(characterId) {
    const songs = getSongs();
    if (!songs.length) return;

    const charStr = String(characterId);

    // ★ Устанавливаем глобальный фильтр — playNextSong / playPrevSong его используют ★
    window.currentCharacterFilter = charStr;

    // Подсвечиваем активный круг
    document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
    document.querySelector(`.circulindex[data-character="${charStr}"]`)?.classList.add('active-filter');

    // Показываем отфильтрованный список
    const filtered = songs.filter(s => String(s.vocaloid_id) === charStr);
    displayFilteredSongs(filtered);

    // Воспроизведение: если уже играет трек этого персонажа — пауза/продолжение
    const currentSong = songs.find(s => s.id == window.currentSongId);
    if (currentSong && String(currentSong.vocaloid_id) === charStr) {
        if (typeof window.togglePlayPause === 'function') window.togglePlayPause();
    } else {
        // Иначе запускаем случайный трек этого персонажа
        const randomSong = getRandomSongByCharacter(charStr);
        if (randomSong && typeof window.playSongById === 'function') {
            window.playSongById(randomSong.id, true);
        }
    }
}

function clearCharacterFilter() {
    window.currentCharacterFilter = null;
    document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
    displayFilteredSongs(getSongs());
}

// ==================== ИНИЦИАЛИЗАЦИЯ КРУГОВ ====================

function initCirculindex() {
    const circuls = document.querySelectorAll('.circulindex');
    if (!circuls.length) return;

    console.log('[INDEX] Инициализация circulindex');

    circuls.forEach(circul => {
        const charId = circul.dataset.character;
        setCirculCover(circul, charId);

        // Убираем старые обработчики (на случай повторного вызова)
        if (circul._indexClickHandler) {
            circul.removeEventListener('click', circul._indexClickHandler);
        }
        const clickHandler = (e) => {
            if (e.target.closest('.startstop')) return;
            filterByCharacter(charId);
        };
        circul._indexClickHandler = clickHandler;
        circul.addEventListener('click', clickHandler);

        // Кнопка Play внутри круга
        const btn = circul.querySelector('.startstop');
        if (btn) {
            if (btn._indexPlayHandler) {
                btn.removeEventListener('click', btn._indexPlayHandler);
            }
            const playHandler = (e) => {
                e.stopPropagation();
                addAnimation(btn, 'startstop-click-animation');
                filterByCharacter(charId);
            };
            btn._indexPlayHandler = playHandler;
            btn.addEventListener('click', playHandler);
        }
    });

    // Обновляем иконки (актуально при возврате на страницу с играющим треком)
    updateAllCirculPlayIcons();

    // Показываем список: если фильтр активен — показываем фильтрованный, иначе — все
    if (window.currentCharacterFilter) {
        const filtered = getSongs().filter(s => String(s.vocaloid_id) === String(window.currentCharacterFilter));
        displayFilteredSongs(filtered);
        document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
        document.querySelector(`.circulindex[data-character="${window.currentCharacterFilter}"]`)?.classList.add('active-filter');
    } else {
        displayFilteredSongs(getSongs());
    }
}

// Alias для spa.js — он вызывает reinitCirculindex и refreshCirculsUI
function reinitCirculindex() { initCirculindex(); }
function refreshCirculsUI() { initCirculindex(); }

// ==================== СИНХРОНИЗАЦИЯ ИКОНОК ПРИ СМЕНЕ ТРЕКА ====================

document.addEventListener('playStateChanged', updateAllCirculPlayIcons);

// ==================== ЭКСПОРТ ====================

window.initCirculindex = initCirculindex;
window.reinitCirculindex = reinitCirculindex;
window.refreshCirculsUI = refreshCirculsUI;
window.filterByCharacter = filterByCharacter;
window.clearCharacterFilter = clearCharacterFilter;
window.displayFilteredSongs = displayFilteredSongs;