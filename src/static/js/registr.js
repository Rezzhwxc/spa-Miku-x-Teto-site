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

    // ★ ФУНКЦИЯ ДЛЯ ВСПЛЫВАЮЩИХ УВЕДОМЛЕНИЙ ★
    function showToast(message, type = 'success') {
        const oldToast = document.querySelector('.toast-notification');
        if (oldToast) {
            oldToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, 2800);
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
                showToast('Заполни email и пароль', 'error');
                return;
            }

            if (!validateEmail(email)) {
                showToast('Введите корректный email', 'error');
                return;
            }

            if (!validatePassword(password)) {
                showToast('Пароль должен быть минимум 6 символов', 'error');
                return;
            }

            localStorage.setItem('user_email', email);
            localStorage.setItem('is_logged_in', 'true');

            console.log('Логин:', { email, password });
            showToast('Добро пожаловать, ' + email.split('@')[0], 'success');
            
            hideAllModals();
            
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
                showToast('Заполни все поля', 'error');
                return;
            }

            if (!validateEmail(email)) {
                showToast('Введите корректный email', 'error');
                return;
            }

            if (!validatePassword(password)) {
                showToast('Пароль должен быть минимум 6 символов', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Пароли не совпадают', 'error');
                return;
            }

            localStorage.setItem('user_email', email);
            localStorage.setItem('is_logged_in', 'true');

            console.log('Регистрация:', { email, password });
            showToast('Регистрация успешна! Добро пожаловать, ' + email.split('@')[0] + '! 🎉', 'success');
            
            hideAllModals();
            
            const regBtn = document.getElementById('regjs');
            if (regBtn) {
                regBtn.innerHTML = '<img class="reg" src="/static/img/add-user (1).png">' + email.split('@')[0];
            }
        });
    }

    // ★ ФУНКЦИЯ ВЫХОДА ИЗ АККАУНТА ★
    function logoutUser() {
        localStorage.removeItem('user_email');
        localStorage.removeItem('is_logged_in');
        
        const regBtn = document.getElementById('regjs');
        if (regBtn) {
            regBtn.innerHTML = '<img class="reg" src="/static/img/add-user (1).png">Регистрация';
        }
        
        showToast('Вы вышли из аккаунта', 'success');
        
        const logoutOverlay = document.getElementById('logoutConfirmOverlay');
        if (logoutOverlay) {
            logoutOverlay.classList.remove('active');
            setTimeout(() => {
                logoutOverlay.style.display = 'none';
            }, 300);
        }
        
        setTimeout(() => {
            location.reload();
        }, 500);
    }

    // ★ ОБРАБОТЧИК КНОПКИ ВЫХОДА ★
    const exitBtn = document.querySelector('.exitaccount');
    const logoutOverlay = document.getElementById('logoutConfirmOverlay');
    const logoutConfirmYes = document.getElementById('logoutConfirmYes');
    const logoutConfirmCancel = document.getElementById('logoutConfirmCancel');

    function showLogoutConfirm() {
        if (!logoutOverlay) return;
        logoutOverlay.style.display = 'flex';
        setTimeout(() => {
            logoutOverlay.classList.add('active');
        }, 10);
    }

    function hideLogoutConfirm() {
        if (!logoutOverlay) return;
        logoutOverlay.classList.remove('active');
        setTimeout(() => {
            logoutOverlay.style.display = 'none';
        }, 300);
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
            if (!isLoggedIn) {
                showToast('Вы не авторизованы', 'error');
                return;
            }
            showLogoutConfirm();
        });
    }

    if (logoutConfirmYes) {
        logoutConfirmYes.addEventListener('click', () => {
            logoutUser();
        });
    }

    if (logoutConfirmCancel) {
        logoutConfirmCancel.addEventListener('click', () => {
            hideLogoutConfirm();
        });
    }

    if (logoutOverlay) {
        logoutOverlay.addEventListener('click', (e) => {
            if (e.target === logoutOverlay) {
                hideLogoutConfirm();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutOverlay && logoutOverlay.classList.contains('active')) {
            hideLogoutConfirm();
        }
    });
});