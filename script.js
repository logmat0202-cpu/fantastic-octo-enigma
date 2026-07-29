// =============================================
// 1. TELEGRAM
// =============================================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// =============================================
// 2. НАВИГАЦИЯ
// =============================================
const tabs = document.querySelectorAll('.tab-item');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.page).classList.add('active');
    });
});

// =============================================
// 3. РАБОТА С СЕРВЕРОМ (БЕЗ КЛЮЧЕЙ!)
// =============================================
const SERVER_URL = 'https://fantastic-octo-enigma.onrender.com';
// Замени на свой URL после деплоя

async function loadProfile() {
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        document.getElementById('profileInfo').innerHTML = '<p>Ошибка: не удалось получить данные</p>';
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.id.toString(),
                username: user.first_name || 'Игрок'
            })
        });

        const data = await response.json();

        if (data.error) {
            document.getElementById('profileInfo').innerHTML = `<p>Ошибка: ${data.error}</p>`;
            return;
        }

        document.getElementById('profileInfo').innerHTML = `
            <p><strong>Имя:</strong> ${data.username}</p>
            <p><strong>Баланс:</strong> ${data.balance} TON</p>
            <p><strong>Побед:</strong> ${data.wins}</p>
           
        `;
    } catch (error) {
        document.getElementById('profileInfo').innerHTML = `<p>Ошибка подключения к серверу</p>`;
        console.error('Ошибка:', error);
    }
}

// =============================================
// 4. ЗАПУСК
// =============================================
loadProfile();
// =============================================
// =============================================
// ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА (UI)
// =============================================

let tonConnectUI = null;
const MANIFEST_URL = window.location.origin + '/tonconnect-manifest.json';

async function initWalletUI() {
    try {
        // Проверяем загрузку UI-библиотеки
        if (typeof window.TonConnectUI === 'undefined') {
            console.error('❌ TON Connect UI не загружен!');
            return;
        }

        // Создаём экземпляр UI
        tonConnectUI = new window.TonConnectUI({
            manifestUrl: MANIFEST_URL,
            buttonRootId: 'ton-connect-button' // контейнер для кнопки
        });

        // Подписываемся на изменения статуса
        tonConnectUI.onStatusChange((wallet) => {
            if (wallet) {
                console.log('✅ Кошелек подключен:', wallet.account.address);
                // Баланс можно загрузить отдельно
                loadBalanceUI(wallet.account.address);
            } else {
                console.log('❌ Кошелек отключен');
            }
        });

        console.log('✅ TON Connect UI инициализирован');

    } catch (error) {
        console.error('❌ Ошибка инициализации UI:', error);
    }
}

// Загрузка баланса (для UI)
async function loadBalanceUI(address) {
    try {
        const response = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        const data = await response.json();
        const balance = data.balance / 1e9;
        console.log(`💰 Баланс: ${balance.toFixed(2)} TON`);
        // UI сам показывает баланс в кнопке
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
}

// Запускаем через 1 секунду
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initWalletUI, 1000);
});
