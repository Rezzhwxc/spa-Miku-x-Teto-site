// profile.js — только для аватарки

function initProfile() {
    console.log('[PROFILE] инициализация');

    // Находим элементы
    const avatarDiv = document.getElementById('avatar');
    const avaBox = document.getElementById('ava-box');

    if (avatarDiv && avaBox) {
        // По умолчанию скрываем окно выбора аватарки
        avaBox.style.display = 'none';

        // Клик по аватарке — переключаем видимость окна выбора
        avatarDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            if (avaBox.style.display === 'none') {
                avaBox.style.display = 'block';
            } else {
                avaBox.style.display = 'none';
            }
        });
    } else {
        console.warn('[PROFILE] Элементы #avatar или #ava-box не найдены');
    }
}