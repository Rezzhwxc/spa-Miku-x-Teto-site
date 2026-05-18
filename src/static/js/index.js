// knopka (sidebar)
let toggleButton = document.getElementById('sidebarToggle');
let contentbox = document.querySelector('.scroll-box');
let strelka = document.querySelector('.strelka');
let txt = document.querySelectorAll('.text-link');
let linkimg = document.querySelectorAll('.icon-container');
let zagol = document.querySelector('.zagol');
let zagcollaps = document.getElementById('zag-collaps');

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
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});

// ==================== CIRCULINDEX ФИЛЬТРАЦИЯ ====================

const defaultCovers = {
    '1': '/static/img/miku-cover.jpg',
    '2': '/static/img/teto-cover.jpg',
    '3': '/static/img/duo-cover.jpg'
};

let currentActiveFilter = null;

function getSongs() {
    return window.songsList || [];
}

function setCirculCover(circul, characterId) {
    let coverImg = circul.querySelector('.circulindex-cover');
    if (!coverImg) {
        coverImg = document.createElement('img');
        coverImg.className = 'circulindex-cover';
        circul.insertBefore(coverImg, circul.firstChild);
    }
    coverImg.src = defaultCovers[characterId] || '/static/img/default-cover.png';
}

function updateCirculPlayIcon(characterId, isPlaying) {
    const circul = document.querySelector(`.circulindex[data-character="${characterId}"]`);
    if (!circul) return;
    const icon = circul.querySelector('.iconindex');
    if (icon) {
        icon.src = isPlaying ? '/static/img/pause-button.png' : '/static/img/Polygon 3 (1).png';
    }
}

function updateAllCirculPlayIcons() {
    const songs = getSongs();
    const currentSong = songs.find(s => s.id == window.currentSongId);
    const isPlaying = window.currentAudio && !window.currentAudio.paused;
    
    document.querySelectorAll('.circulindex').forEach(circul => {
        const icon = circul.querySelector('.iconindex');
        if (icon) icon.src = '/static/img/Polygon 3 (1).png';
    });
    
    if (currentSong && isPlaying) {
        const activeId = String(currentSong.vocaloid_id);
        updateCirculPlayIcon(activeId, true);
    }
}

function displayFilteredSongs(songs) {
    const container = document.getElementById('song-container');
    if (!container) return;
    
    if (!songs.length) {
        container.innerHTML = '<p style="text-align:center;color:#e6e3e3d7;font-size:27px">Нет треков с этим вокалоидом 😔</p>';
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
            </div>
        `;
    }).join('');
    
    // Подключаем обработчики из player.js
    if (typeof attachLikeHandlers === 'function') attachLikeHandlers();
    if (typeof attachVocaloidLinkHandlers === 'function') attachVocaloidLinkHandlers();
}

function filterByCharacter(characterId) {
    const songs = getSongs();
    if (!songs.length) return;
    
    currentActiveFilter = characterId;
    const filtered = songs.filter(song => String(song.vocaloid_id) === characterId);
    displayFilteredSongs(filtered);
    
    document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
    document.querySelector(`.circulindex[data-character="${characterId}"]`)?.classList.add('active-filter');
}

function getRandomSongByCharacter(characterId) {
    const songs = getSongs();
    if (!songs.length) return null;
    const filtered = songs.filter(song => String(song.vocaloid_id) === characterId);
    if (!filtered.length) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
}

function togglePlayPauseForCharacter(characterId) {
    const songs = getSongs();
    if (!songs.length) return;
    
    const currentSong = songs.find(s => s.id == window.currentSongId);
    if (!currentSong) {
        const randomSong = getRandomSongByCharacter(characterId);
        if (randomSong && typeof playSongById === 'function') playSongById(randomSong.id, true);
        return;
    }
    
    if (String(currentSong.vocaloid_id) === characterId) {
        if (typeof togglePlayPause === 'function') togglePlayPause();
    } else {
        const randomSong = getRandomSongByCharacter(characterId);
        if (randomSong && typeof playSongById === 'function') playSongById(randomSong.id, true);
    }
}

// Полная переинициализация (для SPA)
function reinitCirculindex() {
    const circuls = document.querySelectorAll('.circulindex');
    if (!circuls.length) return;
    
    console.log('[INDEX] Реинициализация после возврата');
    
    circuls.forEach(circul => {
        const charId = circul.dataset.character;
        
        // Восстанавливаем обложку
        setCirculCover(circul, charId);
        
        // Обновляем иконку Play/Pause
        const currentSong = getSongs().find(s => s.id == window.currentSongId);
        const isPlaying = window.currentAudio && !window.currentAudio.paused;
        const isActive = currentSong && String(currentSong.vocaloid_id) === charId;
        const icon = circul.querySelector('.iconindex');
        if (icon) {
            icon.src = (isActive && isPlaying) ? '/static/img/pause-button.png' : '/static/img/Polygon 3 (1).png';
        }
        
        // ПЕРЕСОЗДАЁМ ОБРАБОТЧИКИ (удаляем старые и добавляем новые)
        // Удаляем старый обработчик клика на круге
        const oldClickHandler = circul._clickHandler;
        if (oldClickHandler) {
            circul.removeEventListener('click', oldClickHandler);
        }
        // Создаём новый обработчик
        const clickHandler = (e) => {
            if (e.target.closest('.startstop')) return;
            filterByCharacter(charId);
        };
        circul._clickHandler = clickHandler;
        circul.addEventListener('click', clickHandler);
        
        // Обработчик для кнопки Play
        const btn = circul.querySelector('.startstop');
        if (btn) {
            const oldPlayHandler = btn._playHandler;
            if (oldPlayHandler) {
                btn.removeEventListener('click', oldPlayHandler);
            }
            const playHandler = (e) => {
                e.stopPropagation();
                togglePlayPauseForCharacter(charId);
            };
            btn._playHandler = playHandler;
            btn.addEventListener('click', playHandler);
        }
    });
    
    // Восстанавливаем фильтр, если был активен
    if (currentActiveFilter) {
        const filtered = getSongs().filter(song => String(song.vocaloid_id) === currentActiveFilter);
        displayFilteredSongs(filtered);
        document.querySelectorAll('.circulindex').forEach(el => el.classList.remove('active-filter'));
        document.querySelector(`.circulindex[data-character="${currentActiveFilter}"]`)?.classList.add('active-filter');
    } else {
        const songs = getSongs();
        if (songs.length) displayFilteredSongs(songs);
    }
}

// Обновляем refreshCirculsUI (для совместимости)
function refreshCirculsUI() {
    reinitCirculindex();
}

function initCirculindex() {
    const circuls = document.querySelectorAll('.circulindex');
    if (!circuls.length) return;
    
    console.log('[INDEX] Инициализация circulindex');
    
    circuls.forEach(circul => {
        const charId = circul.dataset.character;
        setCirculCover(circul, charId);
        
        // Клик по кругу (фильтрация)
        circul.addEventListener('click', (e) => {
            if (e.target.closest('.startstop')) return;
            filterByCharacter(charId);
        });
        
        // Кнопка Play
        const btn = circul.querySelector('.startstop');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlayPauseForCharacter(charId);
            });
        }
    });
    
    // Показываем все треки
    const songs = getSongs();
    if (songs.length) displayFilteredSongs(songs);
}

// Слушаем события плеера
document.addEventListener('playStateChanged', () => {
    updateAllCirculPlayIcons();
});

// Следим за загрузкой треков
let songsLoaded = false;
let originalLoadSongs = window.loadSongs;

if (originalLoadSongs) {
    window.loadSongs = async function() {
        await originalLoadSongs();
        if (!songsLoaded) {
            songsLoaded = true;
            setTimeout(() => {
                initCirculindex();
            }, 100);
        }
    };
}

// Если songsList уже загружена
if (window.songsList && window.songsList.length) {
    setTimeout(() => {
        initCirculindex();
    }, 100);
}

// Экспорт функций
window.refreshCirculsUI = refreshCirculsUI;
window.initCirculindex = initCirculindex;
window.filterByCharacter = filterByCharacter;