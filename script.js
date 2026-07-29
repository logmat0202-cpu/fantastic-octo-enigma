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
// ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА (ПЛАВАЮЩИЙ БЛОК)
// =============================================

let tonConnector = null;
const MANIFEST_URL = window.location.origin + '/tonconnect-manifest.json';

async function initTonConnect() {
    try {
        if (typeof window.TonConnect === 'undefined') {
            console.error('TON Connect SDK не загружен!');
            document.getElementById('connectWalletBtn').textContent = '❌';
            return;
        }

        tonConnector = new window.TonConnect({
            manifestUrl: MANIFEST_URL
        });

        const wallet = tonConnector.wallet;
        if (wallet) {
            updateUI(wallet);
        }

        tonConnector.onStatusChange((wallet) => {
            if (wallet) {
                updateUI(wallet);
            } else {
                resetUI();
            }
        });

        document.getElementById('connectWalletBtn').addEventListener('click', async () => {
            try {
                await tonConnector.connect();
            } catch (error) {
                console.error('Ошибка подключения:', error);
                tg.showAlert('Не удалось подключить кошелек: ' + error.message);
            }
        });

        document.getElementById('disconnectWalletBtn').addEventListener('click', () => {
            tonConnector.disconnect();
        });

        document.getElementById('connectWalletBtn').textContent = '🔌 Подключить';

    } catch (error) {
        console.error('Ошибка инициализации TON:', error);
        document.getElementById('connectWalletBtn').textContent = '❌';
    }
}

function updateUI(wallet) {
    const address = wallet.account.address;
    document.getElementById('walletStatusFloat').textContent = address.slice(0, 6) + '...' + address.slice(-4);
    document.getElementById('walletBalanceFloat').textContent = 'Загрузка...';
    document.getElementById('connectWalletBtn').style.display = 'none';
    document.getElementById('walletInfoFloat').classList.add('visible');
    loadBalance(address);
}

function resetUI() {
    document.getElementById('walletStatusFloat').textContent = '—';
    document.getElementById('walletBalanceFloat').textContent = '—';
    document.getElementById('connectWalletBtn').style.display = 'block';
    document.getElementById('walletInfoFloat').classList.remove('visible');
}

async function loadBalance(address) {
    try {
        const response = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        const data = await response.json();
        const balance = data.balance / 1e9;
        document.getElementById('walletBalanceFloat').textContent = balance.toFixed(2) + ' TON';
    } catch (error) {
        document.getElementById('walletBalanceFloat').textContent = 'Ошибка';
    }
}

// Запускаем инициализацию через 1 секунду
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initTonConnect, 1000);
});
