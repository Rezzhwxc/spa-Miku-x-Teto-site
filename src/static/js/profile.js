// profile.js — аватарка + редактирование имени

function runProfilePage() {
    console.log('[PROFILE] инициализация');
    const songsList = getSongs();
    // ★ ПРОВЕРКА АВТОРИЗАЦИИ ★
const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
const userId = localStorage.getItem('user_id');

if (!isLoggedIn || !userId) {
    console.warn('[PROFILE] Пользователь не авторизован');
    if (typeof window.showToast === 'function') {
        window.showToast('Сначала войдите в аккаунт', 'error');
    }
    // Перенаправляем через 1 секунду (чтобы пользователь увидел сообщение)
    setTimeout(() => {
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('/index');
        } else {
            window.location.href = '/index';
        }
    }, 1000);
    return;
}

    // ========== 0. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ localStorage ==========
    const currentUserId = localStorage.getItem('user_id');
    const currentEmail = localStorage.getItem('user_email');
    let currentName = localStorage.getItem('user_name');

    function getDisplayName() {
        if (currentName && currentName !== 'null' && currentName.trim() !== '') {
            return currentName;
        } else if (currentEmail) {
            return currentEmail.split('@')[0];
        } 
    }

    // ========== 1. ОТОБРАЖЕНИЕ НИКА ==========
    function updateNicknameDisplay() {
        const nicknameEl = document.getElementById('nickname');
        if (nicknameEl) nicknameEl.textContent = getDisplayName();
    }
    updateNicknameDisplay();

    // ========== 2. РЕДАКТИРОВАНИЕ НИКА ==========
    const editBtn = document.getElementById('edit-nickname');
    if (editBtn && currentUserId) {
        // Удаляем старый обработчик, если есть, чтобы не дублировать
        if (editBtn._nickEditHandler) {
            editBtn.removeEventListener('click', editBtn._nickEditHandler);
        }

        const editHandler = () => {
            // Каждый раз заново получаем актуальный элемент
            const nicknameEl = document.getElementById('nickname');
            if (!nicknameEl) return;
            if (document.getElementById('nickname-input')) return;

            const current = getDisplayName();
            const input = document.createElement('input');
            input.id = 'nickname-input';
            input.type = 'text';
            input.value = current;
            input.maxLength = 10;
            input.placeholder = 'Введите новое имя...';

            nicknameEl.replaceWith(input);
            input.focus();
            input.select();

            function restoreNickname(newVal) {
                const p = document.createElement('p');
                p.id = 'nickname';
                p.textContent = newVal || getDisplayName();
                input.replaceWith(p);
            }

            let isSaving = false; // флаг для предотвращения двойного сохранения

async function save() {
    if (isSaving) return;
    isSaving = true;

    const newName = input.value.trim();
    if (!newName) {
        window.showToast('Имя не может быть пустым', 'error');
        restoreNickname(current);
        isSaving = false;
        return;
    }
    if (newName.length > 10) {
        window.showToast('Имя не может быть длиннее 10 символов', 'error');
        restoreNickname(current);
        isSaving = false;
        return;
    }
    const invalidChars = /[<>\"'&%$#@!*()\\/;=`]/g;
    if (invalidChars.test(newName)) {
        window.showToast('Имя содержит недопустимые символы', 'error');
        restoreNickname(current);
        isSaving = false;
        return;
    }
    if (newName === current) {
        restoreNickname(current);
        isSaving = false;
        return;
    }

    try {
        const response = await fetch('/api/update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, name: newName })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('user_name', newName);
            currentName = newName;
            window.showToast('Имя успешно изменено!', 'success');
            restoreNickname(newName);
            const regBtn = document.getElementById('regjs');
            if (regBtn && localStorage.getItem('is_logged_in') === 'true') {
                const email = localStorage.getItem('user_email') || '';
                regBtn.innerHTML = `<img class="reg" src="/static/img/add-user (1).png">${newName || email.split('@')[0]}`;
            }
        } else {
            window.showToast(data.error || 'Ошибка обновления', 'error');
            restoreNickname(current);
        }
    } catch (err) {
        console.error(err);
        window.showToast('Ошибка соединения с сервером', 'error');
        restoreNickname(current);
    }
    isSaving = false;
}

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); save(); }
                if (e.key === 'Escape') { restoreNickname(current); }
            });
        };

        editBtn._nickEditHandler = editHandler;
        editBtn.addEventListener('click', editHandler);
    }

    // ========== 3. АВАТАРКА (без изменений) ==========
    const avatarImg = document.getElementById('box-avatar');
    const avaBox = document.getElementById('ava-box');

    if (!avatarImg || !avaBox) {
        console.warn('[PROFILE] Не найдены #box-avatar или #ava-box');
        return;
    }

    avaBox.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    avaBox.style.opacity = '0';
    avaBox.style.transform = 'scale(0.95)';
    avaBox.style.display = 'none';

    function openAvaBox() {
        avaBox.style.display = 'block';
        setTimeout(() => {
            avaBox.style.opacity = '1';
            avaBox.style.transform = 'scale(1)';
        }, 10);
    }

    function closeAvaBox() {
        avaBox.style.opacity = '0';
        avaBox.style.transform = 'scale(0.95)';
        setTimeout(() => {
            avaBox.style.display = 'none';
        }, 250);
    }

    avatarImg.addEventListener('click', function(e) {
        e.stopPropagation();
        if (avaBox.style.display === 'none' || avaBox.style.opacity === '0') {
            openAvaBox();
        } else {
            closeAvaBox();
        }
    });

    document.addEventListener('click', function(e) {
        if (avaBox.style.display === 'block' && avaBox.style.opacity === '1') {
            if (!avatarImg.contains(e.target) && !avaBox.contains(e.target)) {
                closeAvaBox();
            }
        }
    });

    const avatarOptions = document.querySelectorAll('#ava-box .img img');
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedAvatar && savedAvatar !== avatarImg.src) {
        avatarImg.src = savedAvatar;
    }

    avatarOptions.forEach(option => {
    option.addEventListener('click', async function(e) {
        e.stopPropagation();
        const newSrc = this.src;
        avatarImg.src = newSrc;
        localStorage.setItem('user_avatar', newSrc);
        closeAvaBox();

        // Отправляем на сервер
        try {
            const response = await fetch('/api/update_avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUserId, avatar_url: newSrc })
            });
            const data = await response.json();
            if (data.success) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Аватар сохранён!', 'success');
                }
            } else {
                console.warn('Не удалось сохранить аватар на сервере');
            }
        } catch (err) {
            console.error('Ошибка отправки аватарки', err);
        }
    });
});

// ========== 4. УДАЛЕНИЕ АККАУНТА ==========
const deleteBtn = document.getElementById('leave');
const deleteOverlay = document.getElementById('deleteConfirmOverlay');
const deleteMessage = document.getElementById('deleteConfirmMessage');
const deleteConfirmYes = document.getElementById('deleteConfirmYes');
const deleteConfirmCancel = document.getElementById('deleteConfirmCancel');

let deleteStep = 1; // 1 = первый вопрос, 2 = второй вопрос

function showDeleteConfirm(step = 1) {
    if (!deleteOverlay) return;
    deleteStep = step;
    if (step === 1) {
        deleteMessage.textContent = 'Вы уверены, что хотите удалить аккаунт?';
        deleteConfirmYes.textContent = 'Да, удалить';
    } else {
        deleteMessage.textContent = 'После удаления все ваши избранные и сохранения безвозвратно удалятся!!';
        deleteConfirmYes.textContent = 'Продолжить';
    }
    deleteOverlay.style.display = 'flex';
    setTimeout(() => deleteOverlay.classList.add('active'), 10);
}

function hideDeleteConfirm() {
    if (!deleteOverlay) return;
    deleteOverlay.classList.remove('active');
    setTimeout(() => deleteOverlay.style.display = 'none', 300);
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        showDeleteConfirm(1);
    });
}

async function handleDeleteConfirm() {
    if (deleteStep === 1) {
        // переходим ко второму шагу
        showDeleteConfirm(2);
    } else {
        // выполняем удаление
        try {
            const response = await fetch('/api/delete_account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUserId })
            });
            const data = await response.json();
            if (data.success) {
                window.showToast('Аккаунт удалён. До встречи^^', 'success');
                // очищаем localStorage
                localStorage.removeItem('user_email');
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('is_logged_in');
                localStorage.removeItem('user_avatar');
                // перенаправляем на главную
                setTimeout(() => {
                    window.location.href = '/index';
                }, 1500);
            } else {
                window.showToast(data.error || 'Ошибка при удалении', 'error');
                hideDeleteConfirm();
            }
        } catch (err) {
            console.error(err);
            window.showToast('Ошибка соединения с сервером', 'error');
            hideDeleteConfirm();
        }
    }
}

        if (deleteConfirmYes) {
            deleteConfirmYes.addEventListener('click', handleDeleteConfirm);
        }
        if (deleteConfirmCancel) {
            deleteConfirmCancel.addEventListener('click', () => hideDeleteConfirm());
        }
        if (deleteOverlay) {
            deleteOverlay.addEventListener('click', (e) => {
                if (e.target === deleteOverlay) hideDeleteConfirm();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && deleteOverlay && deleteOverlay.classList.contains('active')) {
                hideDeleteConfirm();
            }
        });

    // ★ ОБЪЯВЛЯЕМ ПЕРЕМЕННУЮ ДЛЯ ХРАНЕНИЯ СПИСКА ИЗБРАННЫХ ТРЕКОВ ★
    let favoriteSongsList = [];

    // ========== 5. ЗАГРУЗКА ИЗБРАННЫХ ТРЕКОВ ==========
    async function loadFavorites() {
        const likesBox = document.getElementById('likes-box');
        if (!likesBox) return;
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            likesBox.innerHTML = '<p class="profile-empty">Войдите, чтобы видеть избранное</p>';
            return;
        }
        try {
            const response = await fetch(`/api/favorites?user_id=${userId}`);
            const data = await response.json();
            if (data.success && data.favorites.length) {
                const songs = getSongs();
                const favoriteSongs = data.favorites
                    .map(id => songs.find(s => String(s.id) === String(id)))
                    .filter(Boolean);
                if (favoriteSongs.length) {
                    // ★ СОХРАНЯЕМ СПИСОК В ПЕРЕМЕННУЮ ★
                    favoriteSongsList = favoriteSongs;
                    likesBox.innerHTML = favoriteSongs.map(song => buildFavoriteCard(song)).join('');
                    attachFavoriteCardHandlers(likesBox);
                } else {
                    likesBox.innerHTML = '<p class="profile-empty">Нет избранных треков</p>';
                }
            } else {
                likesBox.innerHTML = '<p class="profile-empty">Нет избранных треков</p>';
            }
        } catch (err) {
            console.error('Ошибка загрузки избранных:', err);
            likesBox.innerHTML = '<p class="profile-empty">Ошибка загрузки</p>';
        }
    }

    function buildFavoriteCard(song) {
    const cover = song.photo ? `/photo/${song.photo}` : '/static/img/default-cover.png';
    const artist = escapeHtml(song.vocaloid_name || 'Vocaloid');
    const name = escapeHtml(song.name || '—');
    const isPlaying = window.currentSongId && String(window.currentSongId) === String(song.id);
    const playIcon = (isPlaying && window.currentAudio && !window.currentAudio.paused)
        ? '/static/img/pause-button.png'
        : '/static/img/Polygon 3 (1).png';
    return `
        <div class="search-item" data-id="${song.id}">
            <div class="search-cover">
                <img src="${cover}" onerror="this.src='/static/img/default-cover.png'" alt="${name}">
            </div>
            <div class="search-info">
                <div class="search-title">${name}</div>
                <div class="search-artist">${artist}</div>
            </div>
            <div class="search-play">
                <img src="${playIcon}" alt="play">
            </div>
        </div>`;
}

    function attachFavoriteCardHandlers(container) {
    // Кнопка Play внутри .search-play
    container.querySelectorAll('.search-play').forEach(btn => {
        const parentItem = btn.closest('.search-item');
        const songId = parentItem ? parseInt(parentItem.dataset.id) : null;
        const currentSong = getSongs().find(s => s.id == window.currentSongId);

        if (!songId) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Проверяем, играет ли уже этот трек
            const currentSong = songsList.find(s => s.id == window.currentSongId);
            if (currentSong && currentSong.id == songId && window.currentAudio && !window.currentAudio.paused) {
                window.togglePlayPause();
            } else {
                // Включаем режим избранного
                window.isPlayingFromFavorites = true;
                window.currentFavoriteList = [...favoriteSongsList];
                window.playSongById(songId, true);
            }
            setTimeout(() => refreshProfilePlayIcons(), 200);
        });
    });
    // Клик по всей строке .search-item
    container.querySelectorAll('.search-item').forEach(item => {
        const songId = parseInt(item.dataset.id);
        if (!songId) return;
        item.addEventListener('click', (e) => {
            if (e.target.closest('.search-play')) return;
            const currentSong = songsList.find(s => s.id == window.currentSongId);
            if (currentSong && currentSong.id == songId && window.currentAudio && !window.currentAudio.paused) {
                window.togglePlayPause();
            } else {
                window.isPlayingFromFavorites = true;
                window.currentFavoriteList = [...favoriteSongsList];
                window.playSongById(songId, true);
            }
            setTimeout(() => refreshProfilePlayIcons(), 200);
        });
        item.style.cursor = 'pointer';
    });
}

    function refreshProfilePlayIcons() {
    const isPlaying = window.currentAudio && !window.currentAudio.paused;
    document.querySelectorAll('.search-play').forEach(btn => {
        const parentItem = btn.closest('.search-item');
        if (!parentItem) return;
        const songId = parseInt(parentItem.dataset.id);
        const img = btn.querySelector('img');
        if (img) {
            img.src = (String(window.currentSongId) === String(songId) && isPlaying)
                ? '/static/img/pause-button.png'
                : '/static/img/Polygon 3 (1).png';
        }
    });
}

    // Вызов загрузки избранного после загрузки треков (как и в случае с недавними)
    // Можно добавить в конец runProfilePage:
    if (getSongs().length) {
        loadFavorites();
    } else {
        let attempts = 0;
        const poll = setInterval(() => {
            attempts++;
            if (getSongs().length || attempts > 30) {
                clearInterval(poll);
                loadFavorites();
            }
        }, 150);
    }
    document.addEventListener('playStateChanged', refreshProfilePlayIcons);
}

window.runProfilePage = runProfilePage;