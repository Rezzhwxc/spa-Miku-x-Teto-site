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
    updateProfileAvatar();
    initLikesIcon();
    const circuls = document.querySelectorAll('.circulindex');
    if (!circuls.length) return;

    console.log('[INDEX] Инициализация circulindex');

    initNavScroll();
    initNavStickyToCorner();
    

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
function reinitCirculindex() {updateProfileAvatar();
                                initLikesIcon();
                                    initCirculindex(); }
function refreshCirculsUI() { initCirculindex(); }

// ==================== СИНХРОНИЗАЦИЯ ИКОНОК ПРИ СМЕНЕ ТРЕКА ====================

document.addEventListener('playStateChanged', updateAllCirculPlayIcons);

// ==================== НАВИГАЦИЯ ПО СТРАНИЦЕ (ПРОКРУТКА) ====================

function initNavScroll() {
    const navItems = document.querySelectorAll('.navindex p');
    const scrollBox = document.querySelector('.scroll-box');
    
    if (!navItems.length || !scrollBox) return;
    
    // Удаляем старые обработчики
    navItems.forEach(item => {
        if (item._scrollHandler) {
            item.removeEventListener('click', item._scrollHandler);
        }
        
        const handler = () => {
            const targetId = item.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;
            
            const offsetTop = target.offsetTop - 80;
            scrollBox.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // Через небольшую задержку после прокрутки обновим активный пункт
            setTimeout(() => {
                updateActiveNavItem();
            }, 500);
        };
        
        item._scrollHandler = handler;
        item.addEventListener('click', handler);
    });
    
    // ★ Добавляем обработчик скролла ★
    scrollBox.removeEventListener('scroll', updateActiveNavItem);
    scrollBox.addEventListener('scroll', updateActiveNavItem);
    
    // ★ Первоначальное обновление ★
    updateActiveNavItem();
}

// ==================== ОБНОВЛЕНИЕ АКТИВНОГО ПУНКТА НАВИГАЦИИ ====================

function updateActiveNavItem() {
    const scrollBox = document.querySelector('.scroll-box');
    const navItems = document.querySelectorAll('.navindex p');
    if (!scrollBox || !navItems.length) return;

    const scrollTop = scrollBox.scrollTop;
    const viewportMiddle = scrollTop + scrollBox.clientHeight / 3; // верхняя треть

    let activeId = null;

    const sections = [
        { id: 'content1', navIndex: 0 },
        { id: 'content2', navIndex: 1 },
        { id: 'content3', navIndex: 2 }
    ];

    for (let i = 0; i < sections.length; i++) {
        const section = document.getElementById(sections[i].id);
        if (section) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            if (viewportMiddle >= sectionTop && viewportMiddle < sectionBottom) {
                activeId = sections[i].navIndex;
                break;
            }
        }
    }

    // Если ни один не попал (в самом верху) — активен первый
    if (activeId === null && scrollTop < 50) activeId = 0;
    // Если в самом низу — активен последний
    if (activeId === null && scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 50) activeId = 2;

    navItems.forEach((item, idx) => {
        if (idx === activeId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ==================== ПРИЛИПАНИЕ НАВИГАЦИИ К УГЛУ ====================
function initNavStickyToCorner() {
    const scrollBox = document.querySelector('.scroll-box');
    const nav = document.querySelector('.navindex');
    if (!scrollBox || !nav) return;

    let ticking = false;
    const handleScroll = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollTop = scrollBox.scrollTop;
                if (scrollTop > 200) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    };

    if (scrollBox._navStickyHandler) {
        scrollBox.removeEventListener('scroll', scrollBox._navStickyHandler);
    }
    scrollBox._navStickyHandler = handleScroll;
    scrollBox.addEventListener('scroll', handleScroll);
    handleScroll(); // вызвать один раз для начального состояния
}

// ==================== АВАТАРКА НА ГЛАВНОЙ ====================

function updateProfileAvatar() {
    const avatarImg = document.getElementById('avatar');
    if (!avatarImg) return;
    
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (!isLoggedIn) {
        // Незалогиненный — всегда default.png
        if (avatarImg.src !== '/static/img/default.png') {
            avatarImg.src = '/static/img/default.png';
        }
        return;
    }
    
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedAvatar && savedAvatar !== avatarImg.src) {
        avatarImg.src = savedAvatar;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ИКОНКИ ИЗБРАННОГО ====================
function initLikesIcon() {
    const likesIcon = document.querySelector('#likes img');
    if (!likesIcon) return;
    // Удаляем старый обработчик, чтобы не дублировать
    if (likesIcon._favClickHandler) {
        likesIcon.removeEventListener('click', likesIcon._favClickHandler);
    }
    const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        playFavoritesPlaylist();
    };
    likesIcon._favClickHandler = handler;
    likesIcon.addEventListener('click', handler);
}

// ==================== ВОСПРОИЗВЕДЕНИЕ ИЗБРАННОГО ПЛЕЙЛИСТА ====================

async function playFavoritesPlaylist() {
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    const userId = localStorage.getItem('user_id');
    
    if (!isLoggedIn || !userId) {
        if (typeof window.showToast === 'function') {
            window.showToast('Сначала войдите в аккаунт', 'error');
        }
        return;
    }
    
    // Если уже активен режим избранного – просто переключаем паузу/воспроизведение
    if (window.isPlayingFromFavorites === true) {
        if (typeof window.togglePlayPause === 'function') {
            window.togglePlayPause();
        }
        updateFavoritesIcon();
        return;
    }
    
    // Ждём, пока загрузятся треки (если ещё не загружены)
    if (!window.songsList || !window.songsList.length) {
        if (typeof window.loadSongs === 'function') {
            await window.loadSongs();
        } else {
            console.warn('loadSongs не определена');
            return;
        }
    }
    
    try {
        const response = await fetch(`/api/favorites?user_id=${userId}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const favoriteIds = data.favorites;
        if (!favoriteIds.length) {
            if (typeof window.showToast === 'function') {
                window.showToast('У вас пока нет избранных треков', 'error');
            }
            return;
        }
        
        const allSongs = window.songsList;
        const favoriteSongs = favoriteIds
            .map(id => allSongs.find(s => String(s.id) === String(id)))
            .filter(Boolean);
        
        if (!favoriteSongs.length) {
            if (typeof window.showToast === 'function') {
                window.showToast('Не удалось загрузить избранные треки', 'error');
            }
            return;
        }
        
        // Устанавливаем режим избранного в плеере
        window.isPlayingFromFavorites = true;
        window.currentFavoriteList = favoriteSongs;
        
        // Запускаем первый трек из избранного
        if (typeof window.playSongById === 'function') {
            window.playSongById(favoriteSongs[0].id, true, true);
        }
        
        // Показываем тост только при первом запуске (не при переключении паузы)
        if (typeof window.showToast === 'function') {
            window.showToast(`Сейчас играет: избранные, всего ${favoriteSongs.length} треков`, 'success');
        }
        
        // Обновляем иконку
        updateFavoritesIcon();
    } catch (err) {
        console.error('Ошибка загрузки избранного плейлиста:', err);
        if (typeof window.showToast === 'function') {
            window.showToast('Ошибка при загрузке избранного', 'error');
        }
    }
}

// ==================== ОБНОВЛЕНИЕ ИКОНКИ ИЗБРАННОГО ====================
function updateFavoritesIcon() {
    const isActive = window.isPlayingFromFavorites === true;
    const isPlaying = window.currentAudio && !window.currentAudio.paused;
    const icon = document.querySelector('#likes img');
    if (!icon) return;
    if (isActive && isPlaying) {
        icon.src = '/static/img/pauseindex.png';
    } else if (isActive && !isPlaying) {
        icon.src = '/static/img/PolygonIndex.png';
    } else {
        icon.src = '/static/img/PolygonIndex.png';
    }
}

// Подписываемся на изменения состояния плеера
document.addEventListener('playStateChanged', updateFavoritesIcon);


// Также вызываем сразу, если DOM уже загружен
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateProfileAvatar);
} else {
    updateProfileAvatar();
}

// ==================== ЭКСПОРТ ====================

window.initCirculindex = initCirculindex;
window.reinitCirculindex = reinitCirculindex;
window.refreshCirculsUI = refreshCirculsUI;
window.filterByCharacter = filterByCharacter;
window.clearCharacterFilter = clearCharacterFilter;
window.displayFilteredSongs = displayFilteredSongs;