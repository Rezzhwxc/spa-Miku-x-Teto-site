// knopka
let toggleButton = document.getElementById('sidebarToggle');
let contentbox = document.querySelector('.scroll-box');
let strelka = document.querySelector('.strelka');
let txt = document.querySelectorAll('.text-link');
let linkimg = document.querySelectorAll('.icon-container');
let zagol = document.querySelector('.zagol');
let zagcollaps = document.getElementById('zag-collaps');

const savedState = localStorage.getItem('sidebarCollapsed');
if (savedState === 'true') {
    contentbox.classList.add('collapsed');
    toggleButton.classList.add('collapsed');
    strelka.classList.add('collapsed');
    zagol.classList.add('collapsed');
    zagcollaps.classList.add('collapsed');
    linkimg.forEach(el => el.classList.add('collapsed'));
    txt.forEach(el => el.classList.add('collapsed'));
    toggleButton.setAttribute('aria-label', 'Развернуть сайдбар');
}

toggleButton.addEventListener('click', () => {
    contentbox.classList.toggle('collapsed');
    toggleButton.classList.toggle('collapsed');
    strelka.classList.toggle('collapsed');
    zagol.classList.toggle('collapsed');
    zagcollaps.classList.toggle('collapsed');
    linkimg.forEach(el => el.classList.toggle('collapsed'));
    txt.forEach(el => el.classList.toggle('collapsed'));
    const isCollapsed = contentbox.classList.contains('collapsed');
    toggleButton.setAttribute('aria-label', isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});

