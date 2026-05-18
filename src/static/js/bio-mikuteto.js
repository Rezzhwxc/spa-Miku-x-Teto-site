// knopka
let toggleButton = document.getElementById('sidebarToggle');
let contentbox = document.querySelector('.scroll-boxmiku, .scroll-boxteto'); // Находит тот, который есть
let strelka = document.querySelector('.strelka');
let txt = document.querySelectorAll('.text-link');
let linkimg = document.querySelectorAll('.icon-container');
let zagol = document.querySelector('.zagol');
let zagcollaps = document.getElementById('zag-collaps');
let boxup = document.querySelector('.boxup');

// ===== ЗАГРУЗКА СОСТОЯНИЯ =====
const savedState = localStorage.getItem('sidebarCollapsed');
if (savedState === 'true') {
    if (boxup) boxup.classList.add('collapsed');
    if (contentbox) contentbox.classList.add('collapsed');
    if (toggleButton) toggleButton.classList.add('collapsed');
    if (strelka) strelka.classList.add('collapsed');
    if (zagol) zagol.classList.add('collapsed');
    if (zagcollaps) zagcollaps.classList.add('collapsed');
    if (linkimg.length) linkimg.forEach(el => el.classList.add('collapsed'));
    if (txt.length) txt.forEach(el => el.classList.add('collapsed'));
    if (toggleButton) toggleButton.setAttribute('aria-label', 'Развернуть сайдбар');
}

// ===== КЛИК =====
if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        if (boxup) boxup.classList.toggle('collapsed');
        if (contentbox) contentbox.classList.toggle('collapsed');
        if (toggleButton) toggleButton.classList.toggle('collapsed');
        if (strelka) strelka.classList.toggle('collapsed');
        if (zagol) zagol.classList.toggle('collapsed');
        if (zagcollaps) zagcollaps.classList.toggle('collapsed');
        
        if (linkimg.length) linkimg.forEach(el => el.classList.toggle('collapsed'));
        if (txt.length) txt.forEach(el => el.classList.toggle('collapsed'));
        
        const isCollapsed = contentbox ? contentbox.classList.contains('collapsed') : false;
        if (toggleButton) toggleButton.setAttribute('aria-label', isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
        
        // ===== СОХРАНЕНИЕ =====
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
}