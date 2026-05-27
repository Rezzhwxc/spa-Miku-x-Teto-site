// profile.js — аватарка + редактирование имени

function runProfilePage() {
    console.log('[PROFILE] инициализация');

    // ========== 0. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ localStorage ==========
    const currentUserId = localStorage.getItem('user_id');
    const currentEmail = localStorage.getItem('user_email');
    let currentName = localStorage.getItem('user_name'); // может быть null

    function getDisplayName() {
        if (currentName && currentName !== 'null' && currentName.trim() !== '') {
            return currentName;
        } else if (currentEmail) {
            return currentEmail.split('@')[0];
        } else {
            return 'Гость';
        }
    }

    // ========== 1. ОТОБРАЖЕНИЕ НИКА ==========
    const nicknameEl = document.getElementById('nickname');
    if (nicknameEl) {
        nicknameEl.textContent = getDisplayName();
    }

    // ========== 2. РЕДАКТИРОВАНИЕ НИКА ==========
    const editBtn = document.getElementById('edit-nickname');
    if (editBtn && currentUserId) {
        editBtn.addEventListener('click', () => {
            if (document.getElementById('nickname-input')) return;

            const current = getDisplayName();
            const input = document.createElement('input');
            input.id = 'nickname-input';
            input.type = 'text';
            input.value = current;
            input.maxLength = 32;
            input.placeholder = 'Введите новое имя...';

            Object.assign(input.style, {
                background: 'none',
                border: '2px solid #393939',
                borderRadius: '12px',
                color: '#eaeaeaee',
                fontFamily: "'Unbounded', monospace",
                fontSize: '25px',
                fontWeight: '600',
                letterSpacing: '1px',
                padding: '8px 18px',
                outline: 'none',
                textAlign: 'center',
                width: '340px'
            });

            if (nicknameEl) nicknameEl.replaceWith(input);
            input.focus();
            input.select();

            function restoreNickname(newVal) {
                const p = document.createElement('p');
                p.id = 'nickname';
                p.textContent = newVal || getDisplayName();
                input.replaceWith(p);
            }

            async function save() {
                const newName = input.value.trim();
                if (!newName) {
                    showToast('Имя не может быть пустым', 'error');
                    restoreNickname(current);
                    return;
                }
                if (newName === current) {
                    restoreNickname(current);
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
                        showToast('Имя успешно изменено!', 'success');
                        restoreNickname(newName);
                        // Обновляем кнопку регистрации в сайдбаре
                        const regBtn = document.getElementById('regjs');
                        if (regBtn && localStorage.getItem('is_logged_in') === 'true') {
                            const email = localStorage.getItem('user_email') || '';
                            regBtn.innerHTML = `<img class="reg" src="/static/img/add-user (1).png">${newName || email.split('@')[0]}`;
                        }
                    } else {
                        showToast(data.error || 'Ошибка обновления', 'error');
                        restoreNickname(current);
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Ошибка соединения с сервером', 'error');
                    restoreNickname(current);
                }
            }

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); save(); }
                if (e.key === 'Escape') { restoreNickname(current); }
            });
            input.addEventListener('blur', () => setTimeout(save, 120));
        });
    }

    // ========== 3. АВАТАРКА (существующий код, без изменений) ==========
    const avatarImg = document.getElementById('box-avatar');
    const avaBox = document.getElementById('ava-box');

    if (!avatarImg || !avaBox) {
        console.warn('[PROFILE] Не найдены #box-avatar или #ava-box');
        return;
    }

    // Настройка CSS для плавной анимации
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

    // Открытие/закрытие по клику на аватарку
    avatarImg.addEventListener('click', function(e) {
        e.stopPropagation();
        if (avaBox.style.display === 'none' || avaBox.style.opacity === '0') {
            openAvaBox();
        } else {
            closeAvaBox();
        }
    });

    // Закрытие при клике вне бокса
    document.addEventListener('click', function(e) {
        if (avaBox.style.display === 'block' && avaBox.style.opacity === '1') {
            if (!avatarImg.contains(e.target) && !avaBox.contains(e.target)) {
                closeAvaBox();
            }
        }
    });

    // Выбор аватарки
    const avatarOptions = document.querySelectorAll('#ava-box .img img');

    // Восстанавливаем сохранённую аватарку из localStorage
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

// Делаем функцию доступной глобально (вызывается из spa.js)
window.runProfilePage = runProfilePage;