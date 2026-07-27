// =============================================
// 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM
// =============================================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// =============================================
// 2. НАВИГАЦИЯ ПО ТРЁМ ВКЛАДКАМ
// =============================================
const tabs = document.querySelectorAll('.tab-item');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Убираем активный класс у всех вкладок
        tabs.forEach(t => t.classList.remove('active'));

        // Добавляем активный класс текущей вкладке
        tab.classList.add('active');

        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // Показываем нужную страницу
        const pageId = tab.dataset.page;
        document.getElementById(pageId).classList.add('active');
    });
});

console.log('✅ Приложение запущено!');
