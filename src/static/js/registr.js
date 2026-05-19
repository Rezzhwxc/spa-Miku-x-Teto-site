document.addEventListener('DOMContentLoaded', () => {
    const regBtn = document.getElementById('regjs');

    const loginOverlay = document.getElementById('login-overlay');
    const registerOverlay = document.getElementById('register-overlay');

    const openRegisterBtn = document.getElementById('open-register');
    const backToLoginBtn = document.getElementById('back-to-login');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // ★ ВОССТАНОВЛЕНИЕ СЕССИИ ПРИ ЗАГРУЗКЕ ★
    const savedEmail = localStorage.getItem('user_email');
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';

    if (savedEmail && isLoggedIn) {
        const regBtn = document.getElementById('regjs');
        if (regBtn) {
            regBtn.innerHTML = '<img class="reg" src="/static/img/add-user (1).png">' + savedEmail.split('@')[0];
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePassword(password) {
        return password && password.length >= 6;
    }

    function closeOverlay(overlay, immediate = false) {
        if (!overlay) return;

        overlay.classList.remove('active');

        if (immediate) {
            overlay.style.display = 'none';
            return;
        }

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }

    function hideAllModals() {
        closeOverlay(loginOverlay);
        closeOverlay(registerOverlay);
    }

    function openLoginModal() {
        if (!loginOverlay) return;

        if (registerOverlay && registerOverlay.style.display === 'flex') {
            closeOverlay(registerOverlay, true);
        }

        if (loginOverlay.style.display === 'flex' && loginOverlay.classList.contains('active')) return;

        loginOverlay.style.display = 'flex';
        requestAnimationFrame(() => {
            loginOverlay.classList.add('active');
        });
    }

    function openRegisterModal() {
        if (!registerOverlay) return;

        if (loginOverlay && loginOverlay.style.display === 'flex') {
            closeOverlay(loginOverlay, true);
        }

        if (registerOverlay.style.display === 'flex' && registerOverlay.classList.contains('active')) return;

        registerOverlay.style.display = 'flex';
        requestAnimationFrame(() => {
            registerOverlay.classList.add('active');
        });
    }

    if (loginOverlay) loginOverlay.style.display = 'none';
    if (registerOverlay) registerOverlay.style.display = 'none';

    if (regBtn) {
        regBtn.addEventListener('click', () => {
            openLoginModal();
        });
    }

    if (openRegisterBtn) {
        openRegisterBtn.addEventListener('click', () => {
            openRegisterModal();
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            openLoginModal();
        });
    }

    function setupBackdropClose(overlay) {
        if (!overlay) return;

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                hideAllModals();
            }
        });
    }

    setupBackdropClose(loginOverlay);
    setupBackdropClose(registerOverlay);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAllModals();
    });

    if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = loginForm.querySelector('input[name="email"]')?.value.trim();
        const password = loginForm.querySelector('input[name="password"]')?.value;

        if (!email || !password) {
            alert('Заполни email и пароль');
            return;
        }

        if (!validateEmail(email)) {
            alert('Введите корректный email');
            return;
        }

        if (!validatePassword(password)) {
            alert('Пароль должен быть минимум 6 символов');
            return;
        }

        // ★ СОХРАНЯЕМ ДАННЫЕ ★
        localStorage.setItem('user_email', email);
        localStorage.setItem('is_logged_in', 'true');
        
        console.log('Логин:', { email, password });
        alert('Добро пожаловать, ' + email + '!');
        
        // Закрываем окно
        hideAllModals();
        
        // Меняем текст кнопки
        const regBtn = document.getElementById('regjs');
        if (regBtn) {
            regBtn.innerHTML = '<img class="reg" src="/static/img/add-user (1).png">' + email.split('@')[0];
        }
    });
}

    if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = registerForm.querySelector('input[name="email"]')?.value.trim();
        const password = registerForm.querySelector('input[name="password"]')?.value;
        const confirmPassword = registerForm.querySelector('input[name="confirm-password"]')?.value;

        if (!email || !password || !confirmPassword) {
            alert('Заполни все поля');
            return;
        }

        if (!validateEmail(email)) {
            alert('Введите корректный email');
            return;
        }

        if (!validatePassword(password)) {
            alert('Пароль должен быть минимум 6 символов');
            return;
        }

        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        // ★ СОХРАНЯЕМ ДАННЫЕ ★
        localStorage.setItem('user_email', email);
        localStorage.setItem('is_logged_in', 'true');
        
        console.log('Регистрация:', { email, password });
        alert('Регистрация успешна! Добро пожаловать, ' + email);
        
        // Закрываем окно
        hideAllModals();
        
        // Меняем текст кнопки
        const regBtn = document.getElementById('regjs');
        if (regBtn) {
            regBtn.innerHTML = '<img class="reg" src="/static/img/add-user (1).png">' + email.split('@')[0];
        }
    });
}});