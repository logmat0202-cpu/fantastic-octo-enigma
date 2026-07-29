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
// script.js

// =============================================
// ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА (UI)
// =============================================

let tonConnectUI = null;

// Манифест
const MANIFEST_URL = window.location.origin + '/tonconnect-manifest.json';

async function initTonConnect() {
    try {
        // Проверяем, загружена ли библиотека
        if (typeof TON_CONNECT_UI === 'undefined') {
            console.error('TON Connect UI не загружен!');
            document.getElementById('connectWalletBtn').textContent = '❌ TON не загружен';
            return;
        }

        // Создаём экземпляр с кнопкой
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: MANIFEST_URL,
            buttonRootId: 'ton-connect-button' // сюда вставится кнопка
        });

        // Подписываемся на изменения статуса
        tonConnectUI.onStatusChange((wallet) => {
            if (wallet) {
                updateUI(wallet);
            } else {
                resetUI();
            }
        });

        // Показываем кнопку, скрываем старую
        document.getElementById('ton-connect-button').style.display = 'block';
        document.getElementById('connectWalletBtn').style.display = 'none';

        console.log('✅ TON Connect UI инициализирован');

    } catch (error) {
        console.error('Ошибка инициализации TON:', error);
        document.getElementById('connectWalletBtn').textContent = '❌ Ошибка TON';
    }
}

// Обновление интерфейса при подключении
function updateUI(wallet) {
    const address = wallet.account.address;
    document.getElementById('walletStatus').innerHTML = `
        ✅ ${address.slice(0, 6)}...${address.slice(-4)}
    `;
    document.getElementById('walletBalance').textContent = 'Загрузка...';
    document.getElementById('walletInfo').style.display = 'block';
    loadBalance(address);
}

// Сброс интерфейса при отключении
function resetUI() {
    document.getElementById('walletStatus').textContent = '❌ Не подключен';
    document.getElementById('walletBalance').textContent = '—';
    document.getElementById('walletInfo').style.display = 'none';
}

// Загрузка баланса
async function loadBalance(address) {
    try {
        const response = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        const data = await response.json();
        const balance = data.balance / 1e9;
        document.getElementById('walletBalance').textContent = `${balance.toFixed(2)} TON`;
    } catch (error) {
        document.getElementById('walletBalance').textContent = 'Ошибка';
    }
}

// Запускаем
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initTonConnect, 500);
});
