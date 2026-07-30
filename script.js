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
// ====================================
// =============================================
// PVP-ИНТЕРФЕЙС (КОЛЕСО И СТАВКИ)
// =============================================

let pvpTimer = null;
let pvpCountdown = 0;

// =============================================
// ПОКАЗАТЬ БАЛАНС В ПРАВОМ ВЕРХНЕМ УГЛУ
// =============================================
async function updateBalanceDisplay() {
    const user = tg.initDataUnsafe?.user;
    if (!user) return;

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
        if (!data.error) {
            const balanceDisplay = document.getElementById('balanceDisplay');
            if (balanceDisplay) {
                balanceDisplay.textContent = `💰 ${data.balance.toFixed(2)} TON`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
}

// =============================================
// СДЕЛАТЬ СТАВКУ
// =============================================
async function placeBet(amount) {
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        tg.showAlert('Ошибка: не удалось получить данные пользователя');
        return;
    }

    try {
        // Проверяем статус пула
        const statusRes = await fetch(`${SERVER_URL}/api/pvp/status`);
        const statusData = await statusRes.json();
        
        // Запрет на ставку, если пользователь уже в пуле
        if (statusData.players && statusData.players.some(p => p.telegram_id === user.id.toString())) {
            tg.showAlert('❌ Вы уже сделали ставку! Дождитесь окончания раунда.');
            return;
        }

        const response = await fetch(`${SERVER_URL}/api/pvp/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.id.toString(),
                bet: amount
            })
        });

        const data = await response.json();

        if (data.error) {
            tg.showAlert('❌ ' + data.error);
            return;
        }

        tg.showAlert(`✅ Ставка ${amount} TON принята!`);
        updateBalanceDisplay();
        updatePvpStatus();

    } catch (error) {
        console.error('Ошибка ставки:', error);
        tg.showAlert('❌ Ошибка подключения к серверу');
    }
}

// =============================================
// ОБНОВИТЬ СТАТУС PVP
// =============================================
async function updatePvpStatus() {
    try {
        const response = await fetch(`${SERVER_URL}/api/pvp/status`);
        const data = await response.json();

        const statusDisplay = document.getElementById('pvpStatus');
        const playersList = document.getElementById('pvpPlayers');
        const betButtons = document.getElementById('betButtons');

        // =============================================
        // ОБНОВЛЯЕМ КОЛЕСО (ПРЯМО ЗДЕСЬ)
        // =============================================
        if (data.players && data.players.length > 0) {
            wheelPlayers = data.players.map(p => ({
                username: p.username || 'Игрок',
                bet: p.bet || 0
            }));
        } else {
            wheelPlayers = [];
        }
        drawWheel();

        // =============================================
        // СТАТУС ИГРЫ
        // =============================================
        if (!statusDisplay) return;

        if (data.isActive) {
            statusDisplay.innerHTML = `
                <p style="color: #2ecc71; font-weight: 600;">⚔️ Колесо вращается!</p>
                <p>Игроков: ${data.count}</p>
                <p>Общий пул: ${data.totalPool.toFixed(2)} TON</p>
            `;
            if (betButtons) betButtons.style.display = 'none';
            
            // Запускаем вращение, если ещё не крутится
            if (!isSpinning && data.players && data.players.length >= 2) {
                spinWheel(data.players, (winner) => {
                    console.log('🏆 Победитель:', winner);
                    setTimeout(() => {
                        updateBalanceDisplay();
                        updatePvpStatus();
                    }, 2000);
                });
            }
        } else if (data.count >= 2) {
            statusDisplay.innerHTML = `
                <p style="color: #f39c12; font-weight: 600;">⏳ Идёт поиск...</p>
                <p>Игроков: ${data.count}</p>
                <p>Общий пул: ${data.totalPool.toFixed(2)} TON</p>
            `;
            if (betButtons) betButtons.style.display = 'none';
        } else {
            statusDisplay.innerHTML = `
                <p style="color: var(--hint, #999999);">Ожидание игроков...</p>
                <p>Игроков: ${data.count} / 2+</p>
            `;
            if (betButtons) betButtons.style.display = 'block';
        }

        // =============================================
        // СПИСОК ИГРОКОВ
        // =============================================
        if (playersList && data.players && data.players.length > 0) {
            playersList.innerHTML = data.players.map(p => 
                `<div class="pvp-player">${p.username} — ${p.bet.toFixed(2)} TON</div>`
            ).join('');
        } else if (playersList) {
            playersList.innerHTML = '<div style="color: var(--hint, #999999);">Пока никого нет</div>';
        }

        // =============================================
        // ОБНОВЛЯЕМ БАЛАНС
        // =============================================
        updateBalanceDisplay();

    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
    }
}
// =============================================
// PVP-СТРАНИЦА: HTML-КОНТЕНТ
// =============================================
function renderPvpPage() {
    const pvpPage = document.getElementById('page-pvp');
    if (!pvpPage) return;

    pvpPage.innerHTML = `
        <h2>⚔️ ПВП Колесо</h2>
        
        <div id="balanceDisplay" style="
            background: var(--tg-theme-secondary-bg-color, #f0f0f0);
            border-radius: 12px;
            padding: 12px;
            margin: 8px 0 16px;
            font-weight: 600;
            text-align: center;
            font-size: 18px;
        ">
            💰 Загрузка...
        </div>
        
        <div id="pvpStatus" style="
            background: var(--tg-theme-secondary-bg-color, #f0f0f0);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            text-align: center;
        ">
            <p style="color: var(--hint, #999999);">Загрузка статуса...</p>
        </div>
        
        <div id="pvpPlayers" style="
            background: var(--tg-theme-secondary-bg-color, #f0f0f0);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 16px;
            min-height: 60px;
        ">
            <div style="color: var(--hint, #999999);">Загрузка...</div>
        </div>
        
        <div id="betButtons" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
            <button onclick="placeBet(0.1)" class="bet-btn" style="
                background: var(--tg-theme-button-color, #2481cc);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                min-width: 60px;
            ">
                0.1 TON
            </button>
            <button onclick="placeBet(0.5)" class="bet-btn" style="
                background: var(--tg-theme-button-color, #2481cc);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                min-width: 60px;
            ">
                0.5 TON
            </button>
            <button onclick="placeBet(1.0)" class="bet-btn" style="
                background: var(--tg-theme-button-color, #2481cc);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                min-width: 60px;
            ">
                1.0 TON
            </button>
            <button onclick="placeBet(2.0)" class="bet-btn" style="
                background: var(--tg-theme-button-color, #2481cc);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                min-width: 60px;
            ">
                2.0 TON
            </button>
            <button onclick="placeBet(5.0)" class="bet-btn" style="
                background: var(--tg-theme-button-color, #2481cc);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                min-width: 60px;
            ">
                5.0 TON
            </button>
        </div>
        
        <div style="text-align: center; margin-top: 12px; font-size: 12px; color: var(--hint, #999999);">
            Минимальная ставка: 0.1 TON
        </div>
    `;
}

// =============================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК С ОБНОВЛЕНИЕМ PVP
// =============================================
// Сохраняем оригинальную функцию переключения
const originalTabHandler = tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.page).classList.add('active');
        
        // Если открыли PVP — обновляем статус
        if (tab.dataset.page === 'page-pvp') {
            updatePvpStatus();
        }
    });
});

// =============================================
// ЗАПУСК PVP-ИНТЕРФЕЙСА
// =============================================
// Рендерим PVP-страницу
renderPvpPage();

// Обновляем статус каждые 3 секунды
setInterval(updatePvpStatus, 3000);

// Запускаем первое обновление
setTimeout(() => {
    updatePvpStatus();
    updateBalanceDisplay();
}, 1000);

console.log('⚔️ PvP-интерфейс загружен!');
// =============================================
// КОЛЕСО (ИНИЦИАЛИЗАЦИЯ И ОТРИСОВКА)
// =============================================
// =============================================
// КОЛЕСО (ВИЗУАЛИЗАЦИЯ)
// =============================================

let wheelPlayers = [];
let wheelRotation = 0;
let isSpinning = false;
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e84393'];

function initWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) {
        console.warn('⚠️ Canvas #wheelCanvas не найден');
        return;
    }
    drawWheel();
    console.log('✅ Колесо инициализировано');
}

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!wheelPlayers || wheelPlayers.length === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0e0e0';
        ctx.fill();
        ctx.fillStyle = '#999';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ждём игроков', centerX, centerY);
        return;
    }

    const totalBet = wheelPlayers.reduce((sum, p) => sum + p.bet, 0);
    if (totalBet === 0) return;

    let startAngle = wheelRotation;
    wheelPlayers.forEach((player, index) => {
        const sliceAngle = (player.bet / totalBet) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = COLORS[index % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midAngle = startAngle + sliceAngle / 2;
        const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
        const textY = centerY + Math.sin(midAngle) * (radius * 0.65);

        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(midAngle + (midAngle > Math.PI / 2 ? Math.PI : 0));
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${player.username} ${player.bet.toFixed(1)}T`, 0, 0);
        ctx.restore();

        startAngle = endAngle;
    });

    // Стрелка сверху
    ctx.beginPath();
    ctx.moveTo(centerX, 8);
    ctx.lineTo(centerX - 14, 28);
    ctx.lineTo(centerX + 14, 28);
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
}

function updateWheel(players) {
    wheelPlayers = players.map(p => ({
        username: p.username || 'Игрок',
        bet: p.bet || 0
    }));
    drawWheel();
}
