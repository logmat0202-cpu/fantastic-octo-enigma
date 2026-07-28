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
// 5. ПОДКЛЮЧЕНИЕ TON КОШЕЛЬКА
// =============================================

// Настройки TON Connect
const TON_MANIFEST_URL = 'https://' + window.location.hostname + '/tonconnect-manifest.json';

// Инициализируем TON Connect
let tonConnector = null;

async function initTonConnect() {
    try {
        // Создаём экземпляр TON Connect
        tonConnector = new TonConnectUI({
            manifestUrl: TON_MANIFEST_URL,
            buttonRootId: 'ton-connect-button'
        });

        // Подписываемся на изменения статуса
        tonConnector.onStatusChange((wallet) => {
            if (wallet) {
                // Кошелек подключен
                document.getElementById('walletStatus').innerHTML = `
                    ✅ Кошелек: ${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}
                `;
                document.getElementById('walletBalance').textContent = 'Загрузка...';
                document.getElementById('connectWalletBtn').style.display = 'none';
                document.getElementById('walletInfo').style.display = 'block';
                
                // Загружаем баланс
                loadBalance(wallet.account.address);
            } else {
                // Кошелек отключен
                document.getElementById('walletStatus').innerHTML = '❌ Кошелек не подключен';
                document.getElementById('walletBalance').textContent = '—';
                document.getElementById('connectWalletBtn').style.display = 'block';
                document.getElementById('walletInfo').style.display = 'none';
            }
        });

        // Обработчик кнопки "Подключить кошелек"
        document.getElementById('connectWalletBtn').addEventListener('click', () => {
            tonConnector.openModal();
        });

        // Обработчик кнопки "Отключить"
        document.getElementById('disconnectWalletBtn').addEventListener('click', () => {
            tonConnector.disconnect();
        });

        // Обработчик кнопки "Купить гифт"
        document.getElementById('buyGiftBtn').addEventListener('click', () => {
            buyGift(1.5); // цена 1.5 TON
        });

    } catch (error) {
        console.error('Ошибка инициализации TON Connect:', error);
    }
}

// Загрузка баланса через public API TON
async function loadBalance(address) {
    try {
        const response = await fetch(`https://tonapi.io/v2/accounts/${address}`);
        const data = await response.json();
        const balance = data.balance / 1e9; // конвертируем нанотоны в TON
        document.getElementById('walletBalance').textContent = `${balance.toFixed(2)} TON`;
    } catch (error) {
        document.getElementById('walletBalance').textContent = 'Ошибка';
        console.error('Ошибка загрузки баланса:', error);
    }
}

// Функция покупки гифта
async function buyGift(priceTON) {
    if (!tonConnector || !tonConnector.wallet) {
        tg.showAlert('Сначала подключите кошелек!');
        return;
    }

    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60 * 5, // 5 минут
        messages: [
            {
                address: 'EQD...ваш_адрес_получателя', // ⚠️ ЗАМЕНИТЕ НА СВОЙ АДРЕС!
                amount: (priceTON * 1e9).toString() // переводим в нанотоны
            }
        ]
    };

    try {
        tg.showAlert('Подтвердите транзакцию в кошельке...');
        const result = await tonConnector.sendTransaction(transaction);
        tg.showAlert('✅ Оплата прошла успешно!');
        console.log('Транзакция:', result);
        
        // Здесь будет обновление баланса пользователя через сервер
        // await updateUserBalance(priceTON);
        
    } catch (error) {
        tg.showAlert('❌ Ошибка: ' + error.message);
        console.error('Ошибка транзакции:', error);
    }
}

// Запускаем инициализацию после загрузки
document.addEventListener('DOMContentLoaded', () => {
    initTonConnect();
});

console.log('✅ Приложение запущено!');
