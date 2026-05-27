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
    // Очищаем содержимое страницы профиля
    const scrollBox = document.querySelector('.scroll-box');
    if (scrollBox) {
        scrollBox.innerHTML = `
            <div style="text-align:center;padding:50px;color:#e6e3e3;font-family:unbound">
                ⚠️ Доступ запрещён.<br>
                <a href="/index" style="color:#10dfd8; text-decoration:none;">Вернуться на главную</a>
            </div>
        `;
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
            input.addEventListener('blur', () => setTimeout(save, 120));
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
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const newSrc = this.src;
            avatarImg.src = newSrc;
            localStorage.setItem('user_avatar', newSrc);
            closeAvaBox();
            if (typeof showToast === 'function') {
                showToast('Аватар изменён!', 'success');
            } else {
                console.log('Аватар изменён на', newSrc);
            }
        });
    });
}

window.runProfilePage = runProfilePage;