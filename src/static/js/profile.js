// profile.js — аватарка + редактирование имени

function runProfilePage() {
    console.log('[PROFILE] инициализация');
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
}

window.runProfilePage = runProfilePage;