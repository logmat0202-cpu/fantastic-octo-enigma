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
// ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА
// =============================================

// =============================================
// ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА (РАБОЧАЯ ВЕРСИЯ)
// =============================================

let tonConnector = null;

// Манифест должен быть доступен по HTTPS
const MANIFEST_URL = 'https://' + window.location.hostname + '/tonconnect-manifest.json';

async function initTonConnect() {
    try {
        // Создаём экземпляр TonConnect
        tonConnector = new TonConnect({
            manifestUrl: MANIFEST_URL
        });

        // Проверяем, есть ли уже подключенный кошелек
        const wallet = tonConnector.wallet;
        if (wallet) {
            updateUI(wallet);
        }

        // Подписываемся на изменения статуса
        tonConnector.onStatusChange((wallet) => {
            if (wallet) {
                updateUI(wallet);
            } else {
                resetUI();
            }
        });

        // Кнопка "Подключить"
        document.getElementById('connectWalletBtn').addEventListener('click', async () => {
            try {
                await tonConnector.connect({
                    // Список поддерживаемых кошельков
                    wallets: [
                        'tonkeeper',
                        'tonhub',
                        'tonwallet',
                        'mytonwallet',
                        'crystal'
                    ]
                });
            } catch (error) {
                console.error('Ошибка подключения:', error);
                tg.showAlert('Не удалось подключить кошелек. Попробуйте снова.');
            }
        });

        // Кнопка "Отключить"
        document.getElementById('disconnectWalletBtn').addEventListener('click', () => {
            tonConnector.disconnect();
        });

    } catch (error) {
        console.error('Ошибка инициализации TON Connect:', error);
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
    document.getElementById('connectWalletBtn').style.display = 'none';
    document.getElementById('walletInfo').style.display = 'block';
    
    // Загружаем баланс
    loadBalance(address);
}

// Сброс интерфейса при отключении
function resetUI() {
    document.getElementById('walletStatus').textContent = '❌ Не подключен';
    document.getElementById('walletBalance').textContent = '—';
    document.getElementById('connectWalletBtn').style.display = 'block';
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
        console.error('Ошибка загрузки баланса:', error);
        document.getElementById('walletBalance').textContent = 'Ошибка';
    }
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Ждём 0.5 сек, чтобы всё загрузилось
    setTimeout(initTonConnect, 500);
});
