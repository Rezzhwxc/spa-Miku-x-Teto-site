/**
 * player.js — Music Player for Miku x Teto
 * v5 — с поиском треков, без Ранней инициализации поиска в SPA
 */

// ─── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (доступны из window) ──────────────────────────────
window.currentAudio = null;
window.currentSongId = null;
window.songsList = [];
window.originalSongsList = [];
window.playMode = 0;
window.usedSongsInShuffle = [];
window.playerHydrating = false;
window.lastAnimatedSongId = null;

window.currentCharacterFilter = null;

window.isPlayingFromFavorites = false;
window.currentFavoriteList = [];

window._playerUpdateTimer = null;
window._playerUpdateAnimationTimer = null;

let audioContext = null;
let mediaSourceNode = null;
let gainNode = null;
let compressorNode = null;

let currentAudio = null;
let currentSongId = null;
let songsList = [];
let originalSongsList = [];
let playMode = 0;
let usedSongsInShuffle = [];

let songNavLock = false;

function syncGlobals() {
    window.currentAudio = currentAudio;
    window.currentSongId = currentSongId;
    window.songsList = songsList;
    window.originalSongsList = originalSongsList;
    window.playMode = playMode;
    window.usedSongsInShuffle = usedSongsInShuffle;
}

function initWebAudio(audioEl) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!mediaSourceNode) {
        mediaSourceNode = audioContext.createMediaElementSource(audioEl);
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.85;

        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -24;
        compressorNode.knee.value = 10;
        compressorNode.ratio.value = 6;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.25;

        mediaSourceNode.connect(gainNode);
        gainNode.connect(compressorNode);
        compressorNode.connect(audioContext.destination);
    }
}

function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

const playerElements = {
    cover: document.getElementById('playerCover'),
    title: document.getElementById('currentSongTitle'),
    artist: document.getElementById('currentArtist'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playPauseImg: document.getElementById('playPausePlayerImg'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    progressBar: document.getElementById('progressBar'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeBtn: document.getElementById('volumeBtn'),
    nowPlayingBar: document.getElementById('nowPlayingBar')
};

const formatTime = (sec) => isNaN(sec) ? '0:00' : `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
const escapeHtml = (text) => text ? new Option(text).innerHTML : '';

function saveOriginalOrder() {
    if (originalSongsList.length === 0 && songsList.length) originalSongsList = [...songsList];
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function initAudio() {
    currentAudio = document.getElementById('globalAudioPlayer') || new Audio();
    if (!document.getElementById('globalAudioPlayer')) document.body.appendChild(currentAudio);
    setupAudioEvents();

    if (playerElements.volumeSlider) {
        currentAudio.volume = 0.7;
        playerElements.volumeSlider.value = 0.7;
        playerElements.volumeSlider.style.setProperty('--volume', '70%');
    }

    try {
        initWebAudio(currentAudio);
    } catch (e) {
        console.warn('Web Audio API недоступен:', e);
    }

    syncGlobals();
}

function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    const coverSrc = song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png';

    navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name || '—',
        artist: song.vocaloid_name || 'Vocaloid',
        album: 'Miku x Teto',
        artwork: [
            { src: coverSrc, sizes: '96x96', type: 'image/png' },
            { src: coverSrc, sizes: '128x128', type: 'image/png' },
            { src: coverSrc, sizes: '256x256', type: 'image/png' }
        ]
    });

    const actions = {
        play: () => togglePlayPause(),
        pause: () => togglePlayPause(),
        previoustrack: () => playPrevSong(),
        nexttrack: () => playNextSong()
    };

    Object.entries(actions).forEach(([name, handler]) => {
        try {
            navigator.mediaSession.setActionHandler(name, handler);
        } catch (e) {}
    });
}

function setupAudioEvents() {
    currentAudio.addEventListener('timeupdate', () => {
        if (window.playerHydrating) return;
        if (currentAudio.duration && !isNaN(currentAudio.duration)) {
            const progress = currentAudio.currentTime / currentAudio.duration;
            if (playerElements.progressBar) {
                playerElements.progressBar.value = progress;
                playerElements.progressBar.style.setProperty('--progress', `${progress * 100}%`);
            }
            if (playerElements.currentTime) playerElements.currentTime.textContent = formatTime(currentAudio.currentTime);
        }
        syncGlobals();
    });

    currentAudio.addEventListener('loadedmetadata', () => {
        if (playerElements.duration) {
            playerElements.duration.textContent = formatTime(currentAudio.duration);
        }

        if (window.playerHydrating) return;

        if (playerElements.progressBar && isFinite(currentAudio.duration) && currentAudio.duration > 0) {
            const progress = currentAudio.currentTime / currentAudio.duration;
            playerElements.progressBar.max = 1;
            playerElements.progressBar.value = progress;
            playerElements.progressBar.style.setProperty('--progress', `${progress * 100}%`);
        }
    });

    currentAudio.addEventListener('ended', () => playNextSong());

    currentAudio.addEventListener('play', () => {
        updateCirculIcon(currentSongId, true);
        if (playerElements.playPauseImg) playerElements.playPauseImg.src = '/static/img/pause-button.png';
        document.querySelector(`.circul[data-id="${currentSongId}"]`)?.classList.remove('paused');
        syncGlobals();
    });

    currentAudio.addEventListener('pause', () => {
        updateCirculIcon(currentSongId, false);
        if (playerElements.playPauseImg) playerElements.playPauseImg.src = '/static/img/Polygon 3 (1).png';
        document.querySelector(`.circul[data-id="${currentSongId}"]`)?.classList.add('paused');
        syncGlobals();
    });
}

function updateCirculIcon(songId, isPlaying) {
    const btn = document.querySelector(`.startstop[data-id="${songId}"]`);
    if (btn?.querySelector('img')) {
        btn.querySelector('img').src = isPlaying ? '/static/img/pause-button.png' : '/static/img/Polygon 3 (1).png';
    }
}

function resetAllCirculIcons() {
    document.querySelectorAll('.startstop[data-id]').forEach(btn => {
        const img = btn.querySelector('img');
        if (img) img.src = '/static/img/Polygon 3 (1).png';
    });
}

function updateNavButtons(song) {
    if (!song) return;

    if (playMode === 2) {
        if (playerElements.prevBtn) playerElements.prevBtn.disabled = false;
        if (playerElements.nextBtn) playerElements.nextBtn.disabled = false;
        return;
    }

    const idx = originalSongsList.findIndex(s => s.id == song.id);
    if (playerElements.prevBtn) playerElements.prevBtn.disabled = idx <= 0;
    if (playerElements.nextBtn) playerElements.nextBtn.disabled = idx >= originalSongsList.length - 1;
}

function updatePlayerUI(song, opts = {}) {
    if (window._playerUpdateTimer) clearTimeout(window._playerUpdateTimer);
    if (window._playerUpdateAnimationTimer) clearTimeout(window._playerUpdateAnimationTimer);
    if (!song) return;

    const silent = opts.silent === true;
    const restoreOnly = opts.restoreOnly === true;
    const titleEl = playerElements.title;
    const artistEl = playerElements.artist;
    const coverEl = playerElements.cover;

    if (restoreOnly) {
        if (titleEl) titleEl.textContent = song.name || '—';
        if (artistEl) artistEl.textContent = song.vocaloid_name || 'Vocaloid';
        if (coverEl) coverEl.src = song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png';
        if (playerElements.nowPlayingBar) playerElements.nowPlayingBar.style.display = 'block';
        if ('mediaSession' in navigator) updateMediaSession(song);
        updateNavButtons(song);
        syncGlobals();
        return;
    }

    titleEl?.classList.remove('fade-out', 'fade-in');
    artistEl?.classList.remove('fade-out', 'fade-in');
    coverEl?.classList.remove('slide-out-left', 'slide-in-left');

    void titleEl?.offsetWidth;
    void artistEl?.offsetWidth;
    void coverEl?.offsetWidth;

    titleEl?.classList.add('fade-out');
    artistEl?.classList.add('fade-out');
    coverEl?.classList.add('slide-out-left');

    window._playerUpdateTimer = setTimeout(() => {
    if (titleEl) titleEl.textContent = song.name || '—';
    if (artistEl) artistEl.textContent = song.vocaloid_name || 'Vocaloid';
    if (coverEl) coverEl.src = song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png';

        titleEl?.classList.remove('fade-out');
        artistEl?.classList.remove('fade-out');
        coverEl?.classList.remove('slide-out-left');

        void titleEl?.offsetWidth;
        void artistEl?.offsetWidth;
        void coverEl?.offsetWidth;

        titleEl?.classList.add('fade-in');
        artistEl?.classList.add('fade-in');
        coverEl?.classList.add('slide-in-left');

        window._playerUpdateAnimationTimer = setTimeout(() => {
            titleEl?.classList.remove('fade-in');
            artistEl?.classList.remove('fade-in');
            coverEl?.classList.remove('slide-in-left');
        }, 220);
    }, 160);

    if (playerElements.nowPlayingBar) playerElements.nowPlayingBar.style.display = 'block';
    if ('mediaSession' in navigator) updateMediaSession(song);

    updateNavButtons(song);
    syncGlobals();
}

function restorePlayerUI() {
    if (!window.currentSongId || !songsList.length) return;

    const song = songsList.find(s => s.id == window.currentSongId);
    if (!song) return;

    window.playerHydrating = true;
    updatePlayerUI(song, { restoreOnly: true });
    highlightActiveSong(window.currentSongId);
    updateCirculIcon(window.currentSongId, !currentAudio?.paused);

    requestAnimationFrame(() => {
        if (currentAudio && playerElements.currentTime) {
            playerElements.currentTime.textContent = formatTime(currentAudio.currentTime || 0);
        }
        if (currentAudio && playerElements.progressBar && isFinite(currentAudio.duration) && currentAudio.duration > 0) {
            const progress = currentAudio.currentTime / currentAudio.duration;
            playerElements.progressBar.value = progress;
            playerElements.progressBar.style.setProperty('--progress', `${progress * 100}%`);
        }
        window.playerHydrating = false;
    });
}

function playSongById(songId, autoPlay = true, fromFavorites = false) {
    // Очищаем таймауты анимаций перед новым треком
    if (window._playerUpdateTimer) clearTimeout(window._playerUpdateTimer);
    if (window._playerUpdateAnimationTimer) clearTimeout(window._playerUpdateAnimationTimer);

    const song = songsList.find(s => s.id == songId);
    if (!song) return;
    
    // Если этот трек уже играет – ничего не делаем (или можно было бы поставить на паузу, но не нужно)
    if (currentSongId == songId && currentAudio && !currentAudio.paused) {
        return;
    }
    
    // Сброс режима избранного, если трек не из избранного
    if (!fromFavorites) {
        window.isPlayingFromFavorites = false;
        window.currentFavoriteList = [];
    }
    
    if (!currentAudio) initAudio();
    
    const isNewSong = (currentSongId != songId);
    
    if (isNewSong) {
        resetAllCirculIcons();
        currentAudio.src = `/play/${songId}`;
        currentSongId = songId;
        addToRecentSongs(songId);
        updateRecentPlayed(songId);
        currentAudio.load();
        if (playerElements.progressBar) {
            playerElements.progressBar.value = 0;
            playerElements.progressBar.style.setProperty('--progress', '0%');
        }
    }
    
    // Обновляем UI один раз (анимация только для нового трека)
    updatePlayerUI(song, { silent: !isNewSong });
    
    if (autoPlay) {
        const attemptPlay = () => {
            currentAudio.play().catch((err) => {
                // Только лог в консоль, без изменения UI
                console.log('Автовоспроизведение заблокировано:', err);
            });
        };
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => attemptPlay()).catch(() => attemptPlay());
        } else {
            attemptPlay();
        }
        updateCirculIcon(songId, true);
        if (playerElements.playPauseImg) playerElements.playPauseImg.src = '/static/img/pause-button.png';
    }
    
    highlightActiveSong(songId);
    syncGlobals();
}

function togglePlayPause() {
    if (!currentAudio) return;
    resumeAudioContext();
    currentAudio.paused ? (currentAudio.src ? currentAudio.play() : currentSongId && playSongById(currentSongId, true)) : currentAudio.pause();
    syncGlobals();
}
function playPrevSong() {
    if (songNavLock) return;
    songNavLock = true;
    setTimeout(() => { songNavLock = false; }, 300);

    if (playMode === 1) {
        if (currentSongId && currentAudio) {
            currentAudio.currentTime = 0;
            currentAudio.play();
        }
        return;
    }

    let availableSongs = [];
    if (window.isPlayingFromFavorites && window.currentFavoriteList.length) {
        availableSongs = window.currentFavoriteList;
    } else if (window.currentCharacterFilter) {
        availableSongs = songsList.filter(s => String(s.vocaloid_id) === String(window.currentCharacterFilter));
    } else {
        availableSongs = songsList;
    }

    if (!availableSongs.length) return;

    let prevSong = null;
    if (playMode === 2) {
        // Для случайного режима выбираем случайный трек, не входящий в последние 3
        const candidates = availableSongs.filter(s => !window.recentPlayedIds.includes(s.id) && s.id !== currentSongId);
        if (candidates.length) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            prevSong = candidates[randomIndex];
        } else {
            const anyExceptCurrent = availableSongs.filter(s => s.id !== currentSongId);
            if (anyExceptCurrent.length) {
                prevSong = anyExceptCurrent[Math.floor(Math.random() * anyExceptCurrent.length)];
            }
        }
    } else {
        prevSong = getPrevSongNoRepeat(availableSongs, currentSongId);
    }

    if (prevSong) playSongById(prevSong.id, true, window.isPlayingFromFavorites);
}


function playNextSong() {
    if (songNavLock) return;
    songNavLock = true;
    setTimeout(() => { songNavLock = false; }, 300);

    // Режим повтора одного трека
    if (playMode === 1) {
        if (currentSongId && currentAudio) {
            currentAudio.currentTime = 0;
            currentAudio.play();
        }
        return;
    }

    // Определяем доступный список треков (с учётом избранного или фильтра)
    let availableSongs = [];
    if (window.isPlayingFromFavorites && window.currentFavoriteList.length) {
        availableSongs = window.currentFavoriteList;
    } else if (window.currentCharacterFilter) {
        availableSongs = songsList.filter(s => String(s.vocaloid_id) === String(window.currentCharacterFilter));
    } else {
        availableSongs = songsList;
    }

    if (!availableSongs.length) return;

    let nextSong = null;
    if (playMode === 2) {
        // Случайный режим – выбираем случайный трек, которого нет в последних 3
        const candidates = availableSongs.filter(s => !window.recentPlayedIds.includes(s.id) && s.id !== currentSongId);
        if (candidates.length) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            nextSong = candidates[randomIndex];
        } else {
            // Если все треки в недавних – берём любой, кроме текущего
            const anyExceptCurrent = availableSongs.filter(s => s.id !== currentSongId);
            if (anyExceptCurrent.length) {
                nextSong = anyExceptCurrent[Math.floor(Math.random() * anyExceptCurrent.length)];
            }
        }
    } else {
        // Последовательный режим (playMode === 0) – идём по порядку, но пропускаем недавние
        nextSong = getNextSongNoRepeat(availableSongs, currentSongId);
    }

    if (nextSong) playSongById(nextSong.id, true, window.isPlayingFromFavorites);
}

function seekTo() {
    if (!currentAudio || !playerElements.progressBar) return;

    const progress = parseFloat(playerElements.progressBar.value);
    if (!isNaN(progress) && currentAudio.duration) {
        currentAudio.currentTime = progress * currentAudio.duration;
        playerElements.progressBar.style.setProperty('--progress', `${progress * 100}%`);
    }
}

function changeVolume() {
    if (currentAudio) {
        const vol = parseFloat(playerElements.volumeSlider.value);
        currentAudio.volume = vol;
        playerElements.volumeSlider.style.setProperty('--volume', `${vol * 100}%`);
    }
    updateVolumeIcon();
    syncGlobals();
}

let lastVolume = 0.7;
function toggleMute() {
    if (currentAudio) {
        if (currentAudio.volume > 0) {
            lastVolume = currentAudio.volume;
            currentAudio.volume = 0;
            playerElements.volumeSlider.value = 0;
            playerElements.volumeSlider.style.setProperty('--volume', '0%');
        } else {
            currentAudio.volume = lastVolume;
            playerElements.volumeSlider.value = lastVolume;
            playerElements.volumeSlider.style.setProperty('--volume', `${lastVolume * 100}%`);
        }
        updateVolumeIcon();
    }
    syncGlobals();
}

function updateVolumeIcon() {
    const vol = currentAudio?.volume || 0;
    const img = playerElements.volumeBtn?.querySelector('img');
    if (img) img.src = vol === 0 ? '/static/img/volume-mute.png' : '/static/img/volume-up.png';
}

function highlightActiveSong(songId) {
    document.querySelectorAll('.circul, .song').forEach(el => el.classList.remove('playing'));
    if (songId) {
        document.querySelector(`.circul[data-id="${songId}"]`)?.classList.add('playing');
        document.querySelector(`.song[data-id="${songId}"]`)?.classList.add('playing');
    }
}

function addAnimation(btn, className) {
    btn.classList.add(className);
    setTimeout(() => btn.classList.remove(className), 200);
}

function updatePlaylistOrder() {
    saveOriginalOrder();
    if (playMode === 2) {
        const currentSong = songsList.find(s => s.id == currentSongId);
        const shuffled = shuffleArray(originalSongsList);
        songsList = currentSong ? [currentSong, ...shuffled.filter(s => s.id !== currentSong.id)] : shuffled;
    } else if (playMode === 0) {
        songsList = [...originalSongsList];
    }
    syncGlobals();
}

function togglePlayMode() {
    const repeatBtn = document.getElementById('repeatModeBtn');
    const repeatImg = document.getElementById('repeatModeImg');

    playMode = (playMode + 1) % 3;

    if (repeatBtn) {
        repeatBtn.classList.remove('active-one', 'active-random');
        const modes = [
            { src: '/static/img/repeat.png', opacity: '0.5', btnOpacity: '0.5' },
            { src: '/static/img/repeat.png', opacity: '1', btnOpacity: '1', addClass: 'active-one' },
            { src: '/static/img/random.png', opacity: '1', btnOpacity: '1', addClass: 'active-random' }
        ];
        const m = modes[playMode];
        repeatImg.src = m.src;
        repeatImg.style.opacity = m.opacity;
        repeatBtn.style.opacity = m.btnOpacity;
        if (m.addClass) repeatBtn.classList.add(m.addClass);
    }

    if (playMode === 2) {
        usedSongsInShuffle = [];
        if (playerElements.prevBtn) playerElements.prevBtn.disabled = false;
        if (playerElements.nextBtn) playerElements.nextBtn.disabled = false;
    } else {
        if (currentSongId) {
            const idx = originalSongsList.findIndex(s => s.id == currentSongId);
            if (playerElements.prevBtn) playerElements.prevBtn.disabled = idx <= 0;
            if (playerElements.nextBtn) playerElements.nextBtn.disabled = idx >= originalSongsList.length - 1;
        }
    }

    updatePlaylistOrder();
    if (currentSongId) {
        const currentSong = songsList.find(s => s.id == currentSongId);
        if (currentSong && playerElements.title) {
            if (playerElements.title) playerElements.title.textContent = currentSong.name || '—';
            if (playerElements.artist) playerElements.artist.textContent = currentSong.vocaloid_name || 'Vocaloid';
        }
    }
    syncGlobals();
}

async function loadSongs() {
    try {
        const res = await fetch('/api/songs');
        const data = await res.json();
        if (data.success) {
            songsList = data.songs;
            originalSongsList = [...songsList];
            displayTopSongs(songsList.slice(0, 3));
            displayOtherSongs(songsList.slice(3));
            syncGlobals();
        }
    } catch (error) { console.error('Ошибка загрузки треков:', error); }
}

// ─── ПОИСК ТРЕКОВ ────────────────────────────────────────────────────────────
let searchDebounceTimer = null;

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResult = document.getElementById('search-result');

    console.log('initSearch:', { searchInput, searchResult, songsList });

    if (!searchInput || !searchResult) {
        console.warn('Элементы поиска не найдены в DOM. Проверь HTML и порядок загрузки.');
        return;
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            performSearch(searchInput.value.trim(), searchResult);
        }, 150);
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            searchResult.classList.add('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-result') && e.target !== searchInput) {
            searchResult.classList.remove('active');
        }
    });
}

function performSearch(query, searchResult) {
    if (!query) {
        searchResult.classList.remove('active');
        searchResult.innerHTML = '';
        return;
    }

    const lowerQuery = query.toLowerCase();
    const filteredSongs = songsList.filter(song =>
        (song.name && song.name.toLowerCase().includes(lowerQuery)) ||
        (song.vocaloid_name && song.vocaloid_name.toLowerCase().includes(lowerQuery))
    );

    renderSearchResults(filteredSongs, searchResult);
}

function renderSearchResults(songs, searchResult) {
    if (!searchResult) return;

    if (songs.length === 0) {
        searchResult.innerHTML = '<p style="text-align:center;color:#aaa;font-size:18px;padding:20px">Треков не найдено(</p>';
        searchResult.classList.add('active');
        return;
    }

    searchResult.innerHTML = songs.map(song => {
        const coverSrc = song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png';
        const vocaloidName = song.vocaloid_name || 'Vocaloid';
        return `
            <div class="search-item" data-id="${song.id}">
                <div class="search-cover">
                    <img src="${coverSrc}" alt="${escapeHtml(song.name)}" onerror="this.src='/static/img/default-cover.png'">
                </div>
                <div class="search-info">
                    <div class="search-title">${escapeHtml(song.name)}</div>
                    <div class="search-artist">${escapeHtml(vocaloidName)}</div>
                </div>
                <div class="search-play">
                    <img src="/static/img/Polygon 3 (1).png" alt="play">
                </div>
            </div>
        `;
    }).join('');

    searchResult.classList.add('active');

    searchResult.querySelectorAll('.search-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.closest('.search-play')) {
                e.stopPropagation();
            }
            const id = parseInt(item.dataset.id);
            if (!id) return;
            playSongById(id, true);
            document.getElementById('searchInput').value = '';
            searchResult.classList.remove('active');
            searchResult.innerHTML = '';
        };
    });
}

// ─── ОТОБРАЖЕНИЕ ПЛЕЙЛИСТА ───────────────────────────────────────────────────
function displayTopSongs(songs) {
    const block = document.getElementById('block');
    if (!block) return;
    block.innerHTML = songs.map(song => `
        <div class="circul" data-id="${song.id}">
            <img class="circul-cover" src="${song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png'}" alt="${escapeHtml(song.name)}">
            <p class="txt">${escapeHtml(song.name)}</p>
            <button class="startstop" data-id="${song.id}">
                <img class="circul-play-icon" src="/static/img/Polygon 3 (1).png" alt="Start">
            </button>
        </div>
    `).join('');
    for (let i = songs.length; i < 3; i++) block.innerHTML += `<div class="circul"><img class="circul-img" src="/static/img/default-cover.png" style="opacity:0.3"><p class="txt">Нет трека</p><button class="startstop" disabled><img class="icon" src="/static/img/Polygon 3 (1).png" style="opacity:0.3"></button></div>`;
    attachButtonHandlers();
    attachCirculBoxHandlers();
}

function displayOtherSongs(songs) {
    const container = document.getElementById('song-container');
    if (!container) return;
    container.innerHTML = songs.length ? songs.map(song => {
        const vocaloidName = song.vocaloid_name || 'Vocaloid';
        const vocaloidUrl = (song.vocaloid_url && song.vocaloid_url !== 'null') ? song.vocaloid_url : '#';
        return `
            <div class="song" data-id="${song.id}" data-name="${escapeHtml(song.name)}">
                <img class="song-ava" src="${song.photo ? `/photo/${song.photo}` : '/static/img/zag-collaps.png'}" onerror="this.src='/static/img/zag-collaps.png'">
                <div><p class="namet">${escapeHtml(song.name)}</p><p class="autor vocaloid-link" data-url="${vocaloidUrl}">${escapeHtml(vocaloidName)}</p></div>
                <button class="like-song-btn" data-id="${song.id}" data-liked="false"><img class="like-icon" src="/static/img/heart.png" alt="добавить в избранное"></button>
            </div>
        `;
    }).join('') : '<p style="text-align:center;color:#e6e3e3d7;font-size:27px;font-family:monospace;user-select:none">Больше треков пока нет:(</p>';

    if (window.currentSongId) {
        const activeSong = songsList.find(s => s.id == window.currentSongId);
        if (activeSong) {
            highlightActiveSong(window.currentSongId);
            updateCirculIcon(window.currentSongId, !currentAudio?.paused);
            if (currentAudio && !currentAudio.paused) {
                const btn = document.querySelector(`.startstop[data-id="${window.currentSongId}"] img`);
                if (btn) btn.src = '/static/img/pause-button.png';
            }
        }
    }

    attachSongHandlers();
    attachLikeHandlers();
    attachVocaloidLinkHandlers();
    attachSongBoxHandlers();
}

function attachButtonHandlers() {
    document.querySelectorAll('.startstop:not([disabled])').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            addAnimation(btn, 'startstop-click-animation');
            const id = parseInt(btn.dataset.id);
            if (currentSongId === id && currentAudio && !currentAudio.paused) currentAudio.pause();
            else if (currentSongId === id && currentAudio && currentAudio.paused) currentAudio.play();
            else playSongById(id, true);
        };
    });
}

function attachCirculBoxHandlers() {
    document.querySelectorAll('.circul').forEach(circul => {
        if (circul._clickHandler) {
            circul.removeEventListener('click', circul._clickHandler);
        }
        const handler = (e) => {
            if (e.target.closest('.startstop')) return;
            circul.classList.add('circul-click-animation');
            setTimeout(() => circul.classList.remove('circul-click-animation'), 200);
            const songId = parseInt(circul.dataset.id);
            if (!songId) return;
            if (currentSongId === songId && currentAudio && !currentAudio.paused) currentAudio.pause();
            else if (currentSongId === songId && currentAudio && currentAudio.paused) currentAudio.play();
            else playSongById(songId, true);
        };
        circul._clickHandler = handler;
        circul.addEventListener('click', handler);
        circul.style.cursor = 'pointer';
    });
}

function attachSongHandlers() {
    document.querySelectorAll('.play-song-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            addAnimation(btn, 'play-click-animation');
            playSongById(parseInt(btn.dataset.id), true);
        };
    });
}

function attachSongBoxHandlers() {
    document.querySelectorAll('.song').forEach(box => {
        box.onclick = (e) => {
            if (e.target.closest('.like-song-btn') || e.target.closest('.vocaloid-link')) return;
            const id = parseInt(box.dataset.id);
            if (currentSongId === id && currentAudio && !currentAudio.paused) currentAudio.pause();
            else if (currentSongId === id && currentAudio && currentAudio.paused) currentAudio.play();
            else playSongById(id, true);
        };
        box.style.cursor = 'pointer';
    });
}

// ─── ИЗБРАННОЕ (ЛАЙКИ) ──────────────────────────────────────────────────────

function getUserFavorites(userId, callback) {
    fetch(`/api/favorites?user_id=${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                callback(data.favorites);
            } else {
                console.error('Ошибка загрузки избранного:', data.error);
                callback([]);
            }
        })
        .catch(err => {
            console.error('Ошибка сети:', err);
            callback([]);
        });
}

function toggleFavorite(userId, songId, callback) {
    fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, song_id: songId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            callback(data.liked);
        } else {
            console.error('Ошибка переключения лайка:', data.error);
            callback(null);
        }
    })
    .catch(err => {
        console.error('Ошибка сети:', err);
        callback(null);
    });
}

function attachLikeHandlers() {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        // Если не залогинен, можно скрыть кнопки лайков или показывать тост
        document.querySelectorAll('.like-song-btn').forEach(btn => {
            btn.style.opacity = '0.5';
            btn.disabled = true;
        });
        return;
    }

    // Загружаем текущий список избранных
    getUserFavorites(userId, (favorites) => {
        const favSet = new Set(favorites.map(id => String(id)));
        document.querySelectorAll('.like-song-btn').forEach(btn => {
            const songId = btn.dataset.id;
            const isLiked = favSet.has(String(songId));
            btn.dataset.liked = String(isLiked);
            const img = btn.querySelector('.like-icon');
            if (img) img.src = isLiked ? '/static/img/heart (1).png' : '/static/img/heart.png';
        });
    });

    // Вешаем обработчики
    document.querySelectorAll('.like-song-btn').forEach(btn => {
        if (btn._likeHandler) {
            btn.removeEventListener('click', btn._likeHandler);
        }
        const handler = (e) => {
            e.stopPropagation();
            if (!userId) {
                window.showToast('Войдите в аккаунт, чтобы добавлять в избранное', 'error');
                return;
            }
            const songId = btn.dataset.id;
            const isLiked = btn.dataset.liked === 'true';
            addAnimation(btn, 'like-click-animation');

            toggleFavorite(userId, songId, (newLiked) => {
                if (newLiked !== null) {
                    btn.dataset.liked = String(newLiked);
                    const img = btn.querySelector('.like-icon');
                    if (img) img.src = newLiked ? '/static/img/heart (1).png' : '/static/img/heart.png';
                    window.showToast(newLiked ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
                }
            });
        };
        btn._likeHandler = handler;
        btn.addEventListener('click', handler);
    });
}

function attachVocaloidLinkHandlers() {
    document.querySelectorAll('.autor.vocaloid-link').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const url = el.dataset.url;
            if (url && url !== '#') window.location.href = url;
        };
        Object.assign(el.style, { cursor: 'pointer', transition: 'color 0.2s' });
        el.onmouseenter = () => el.style.color = 'rgba(189, 189, 189, 0.79)';
        el.onmouseleave = () => el.style.color = '';
    });
}

// ─── НЕДАВНО ПРОСЛУШАННЫЕ ────────────────────────────────────────────────────
function addToRecentSongs(songId) {
    try {
        let recent = JSON.parse(localStorage.getItem('recent_songs') || '[]');
        const idStr = String(songId);
        // Убираем если уже есть, кладём в начало
        recent = recent.filter(id => String(id) !== idStr);
        recent.unshift(idStr);
        // Храним только 10
        recent = recent.slice(0, 10);
        localStorage.setItem('recent_songs', JSON.stringify(recent));
        
        window.dispatchEvent(new CustomEvent('recentSongsUpdated', { detail: { songId } }));
    } catch (e) {
        console.warn('addToRecentSongs error:', e);
    }
}

window.loadSongs = loadSongs;
window.playSongById = playSongById;
window.updatePlayerUI = updatePlayerUI;
window.togglePlayPause = togglePlayPause;
window.playPrevSong = playPrevSong;
window.playNextSong = playNextSong;
window.initAudio = initAudio;
window.syncGlobals = syncGlobals;
window.restorePlayerUI = restorePlayerUI;
window.initSearch = initSearch;

if (!window.playerInitialized && document.getElementById('globalAudioPlayer')) {
    window.playerInitialized = true;
    initAudio();

    if (playerElements.playPauseBtn) playerElements.playPauseBtn.onclick = () => { addAnimation(playerElements.playPauseBtn, 'play-click-animation'); togglePlayPause(); };
    if (playerElements.prevBtn) playerElements.prevBtn.onclick = playPrevSong;
    if (playerElements.nextBtn) playerElements.nextBtn.onclick = playNextSong;
    if (playerElements.volumeBtn) playerElements.volumeBtn.onclick = () => { addAnimation(playerElements.volumeBtn, 'volume-click-animation'); toggleMute(); };
    if (playerElements.progressBar) playerElements.progressBar.oninput = seekTo;
    if (playerElements.volumeSlider) playerElements.volumeSlider.oninput = changeVolume;

    const repeatBtn = document.getElementById('repeatModeBtn');
    if (repeatBtn) repeatBtn.onclick = () => { addAnimation(repeatBtn, 'repeat-click-animation'); togglePlayMode(); };
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (currentAudio?.src) {
            if (playerElements.playPauseBtn) addAnimation(playerElements.playPauseBtn, 'play-click-animation');
            togglePlayPause();
        }
    }
});

// ─── НЕ ПОВТОРЯТЬ ПОСЛЕДНИЕ 3 ТРЕКА ────────────────────────────────────────
window.recentPlayedIds = window.recentPlayedIds || [];

function updateRecentPlayed(songId) {
    // Удаляем старый ID, если он уже был
    const index = window.recentPlayedIds.indexOf(songId);
    if (index !== -1) window.recentPlayedIds.splice(index, 1);
    // Добавляем в начало
    window.recentPlayedIds.unshift(songId);
    // Храним только последние 3
    if (window.recentPlayedIds.length > 3) window.recentPlayedIds.pop();
    console.log('[RECENT] now:', window.recentPlayedIds);
}

// Возвращает следующий трек, не входящий в recentPlayedIds (если возможно)
function getNextSongNoRepeat(availableSongs, currentId) {
    if (!availableSongs.length) return null;
    // Находим индекс текущего трека
    let currentIndex = availableSongs.findIndex(s => s.id == currentId);
    if (currentIndex === -1) currentIndex = 0;

    // Пробуем последовательно, начиная со следующего, с зацикливанием
    for (let i = 1; i <= availableSongs.length; i++) {
        const nextIndex = (currentIndex + i) % availableSongs.length;
        const candidate = availableSongs[nextIndex];
        if (!window.recentPlayedIds.includes(candidate.id)) {
            return candidate;
        }
    }
    // Если все треки в "недавних" – берём любой следующий
    const fallbackIndex = (currentIndex + 1) % availableSongs.length;
    return availableSongs[fallbackIndex];
}

// Возвращает предыдущий трек, не входящий в recentPlayedIds (если возможно)
function getPrevSongNoRepeat(availableSongs, currentId) {
    if (!availableSongs.length) return null;
    let currentIndex = availableSongs.findIndex(s => s.id == currentId);
    if (currentIndex === -1) currentIndex = 0;

    for (let i = 1; i <= availableSongs.length; i++) {
        let prevIndex = currentIndex - i;
        if (prevIndex < 0) prevIndex += availableSongs.length;
        const candidate = availableSongs[prevIndex];
        if (!window.recentPlayedIds.includes(candidate.id)) {
            return candidate;
        }
    }
    const fallbackIndex = currentIndex - 1;
    if (fallbackIndex < 0) return availableSongs[availableSongs.length - 1];
    return availableSongs[fallbackIndex];
}


const volumeSlider = document.getElementById('volumeSlider');
if (volumeSlider) {
    volumeSlider.addEventListener('wheel', (e) => {
        e.preventDefault();
        let currentVolume = parseFloat(volumeSlider.value);
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        let newVolume = currentVolume + delta;
        newVolume = Math.max(0, Math.min(1, newVolume));
        newVolume = Math.round(newVolume * 100) / 100;
        volumeSlider.value = newVolume;
        if (currentAudio) {
            currentAudio.volume = newVolume;
            volumeSlider.style.setProperty('--volume', `${newVolume * 100}%`);
        }
        updateVolumeIcon();
    });
}

// Экспорт обработчиков для index.js
window.attachSongHandlers = attachSongHandlers;
window.attachLikeHandlers = attachLikeHandlers;
window.attachVocaloidLinkHandlers = attachVocaloidLinkHandlers;
window.attachSongBoxHandlers = attachSongBoxHandlers;
window.playSongById = playSongById;
window.songsList = songsList;

// Событие для синхронизации UI
function notifyPlayStateChange() {
    const event = new CustomEvent('playStateChanged');
    document.dispatchEvent(event);
}

// В обработчики play и pause добавь:
currentAudio.addEventListener('play', () => {
    updateCirculIcon(currentSongId, true);
    if (playerElements.playPauseImg) playerElements.playPauseImg.src = '/static/img/pause-button.png';
    document.querySelector(`.circul[data-id="${currentSongId}"]`)?.classList.remove('paused');
    syncGlobals();
    notifyPlayStateChange();
});

currentAudio.addEventListener('pause', () => {
    updateCirculIcon(currentSongId, false);
    if (playerElements.playPauseImg) playerElements.playPauseImg.src = '/static/img/Polygon 3 (1).png';
    document.querySelector(`.circul[data-id="${currentSongId}"]`)?.classList.add('paused');
    syncGlobals();
    notifyPlayStateChange();
});
window.attachLikeHandlers = attachLikeHandlers;
window.attachVocaloidLinkHandlers = attachVocaloidLinkHandlers;
window.togglePlayPause = togglePlayPause;
window.playSongById = playSongById;