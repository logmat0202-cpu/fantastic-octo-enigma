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
        
        // Если открыли PVP — обновляем статус
        if (tab.dataset.page === 'page-pvp') {
            updatePvpStatus();
        }
    });
});

// =============================================
// 3. СЕРВЕР
// =============================================
const SERVER_URL = 'https://fantastic-octo-enigma.onrender.com';

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
// 4. БАЛАНС (ПРАВЫЙ ВЕРХНИЙ УГОЛ)
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
// 5. КОЛЕСО
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
    ctx.fillStyle = '#97f962';
    ctx.fill();
}

function updateWheel(players) {
    wheelPlayers = players.map(p => ({
        username: p.username || 'Игрок',
        bet: p.bet || 0
    }));
    drawWheel();
}

// =============================================
// 6. СТАВКА
// =============================================
async function placeBet() {
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        tg.showAlert('Ошибка: не удалось получить данные пользователя');
        return;
    }

    const input = document.getElementById('betInput');
    const amount = parseFloat(input?.value || 0);

    if (isNaN(amount) || amount < 0.1) {
        tg.showAlert('❌ Минимальная ставка 0.1 TON');
        return;
    }

    try {
        const statusRes = await fetch(`${SERVER_URL}/api/pvp/status`);
        const statusData = await statusRes.json();

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
// 7. СТАТУС PVP
// =============================================
async function updatePvpStatus() {
    try {
        const response = await fetch(`${SERVER_URL}/api/pvp/status`);
        const data = await response.json();

        const statusDisplay = document.getElementById('pvpStatus');
        const playersList = document.getElementById('pvpPlayers');
        const betSection = document.getElementById('betSection');

        updateWheel(data.players || []);

        if (!statusDisplay) return;
               // =============================================
        // ЗАПУСК ТАЙМЕРА ПРИ 2+ ИГРОКАХ
        // =============================================
     
            // =============================================
        // НОВЫЙ БЛОК (ВСТАВЬ ЭТО ВМЕСТО СТАРОГО)
        // =============================================
        if (data.count >= 2 && !isSpinning && !data.isActive && !window.timerActive) {
            window.timerActive = true;

            const statusDisplay = document.getElementById('pvpStatus');
            const betSection = document.getElementById('betSection');

            if (betSection) betSection.style.display = 'none';

            let seconds = 10;
            statusDisplay.innerHTML = `
                <p style="color: #f39c12; font-weight: 600;">⏳ Игра начнётся через ${seconds} секунд...</p>
                <p>Игроков: ${data.count}</p>
                <p>Общий пул: ${data.totalPool.toFixed(2)} TON</p>
                <p id="timerDisplay" style="font-size: 32px; font-weight: 700; color: #e74c3c;">${seconds}</p>
            `;

            const timerInterval = setInterval(() => {
                seconds--;
                const timerEl = document.getElementById('timerDisplay');
                if (timerEl) timerEl.textContent = seconds;

                const textEl = statusDisplay?.querySelector('p:first-child');
                if (textEl) textEl.textContent = `⏳ Игра начнётся через ${seconds} секунд...`;

                if (seconds <= 0) {
                    clearInterval(timerInterval);
                    window.timerActive = false;

                    if (data.players && data.players.length >= 2) {
                        statusDisplay.innerHTML = `
                            <p style="color: #2ecc71; font-weight: 600;">⚔️ Колесо вращается!</p>
                            <p>Игроков: ${data.players.length}</p>
                        `;
                        spinWheel(data.players, (winner) => {
                            console.log('🏆 Победитель:', winner);
                            setTimeout(() => {
                                updateGlobalBalance();
                                updatePvpStatus();
                            }, 2000);
                        });
                    }
                }
            }, 1000);
        }
   
        // =============================================
        // ЕСЛИ ИГРА АКТИВНА — ЗАПУСКАЕМ ВРАЩЕНИЕ
        // =============================================
        if (data.isActive && !isSpinning && data.players && data.players.length >= 2) {
            console.log('🔄 Запускаем вращение колеса!');
            spinWheel(data.players, (winner) => {
                console.log('🏆 Победитель:', winner);
                setTimeout(() => {
                    updateGlobalBalance();
                    updatePvpStatus();
                }, 2000);
            });
        }

        // =============================================
        // ОБНОВЛЯЕМ ИНТЕРФЕЙС
        // =============================================
        if (data.isActive) {
            statusDisplay.innerHTML = `
                <p style="color: #2ecc71; font-weight: 600;">⚔️ Колесо вращается!</p>
                <p>Игроков: ${data.count}</p>
                <p>Общий пул: ${data.totalPool.toFixed(2)} TON</p>
            `;
            if (betSection) betSection.style.display = 'none';
        } else if (data.count >= 2) {
            statusDisplay.innerHTML = `
                <p style="color: #f39c12; font-weight: 600;">⏳ Идёт поиск...</p>
                <p>Игроков: ${data.count}</p>
                <p>Общий пул: ${data.totalPool.toFixed(2)} TON</p>
            `;
            if (betSection) betSection.style.display = 'none';
        } else {
            statusDisplay.innerHTML = `
                <p style="color: var(--hint, #999999);">Ожидание игроков...</p>
                <p>Игроков: ${data.count} / 2+</p>
            `;
            if (betSection) betSection.style.display = 'block';
        }

        if (playersList && data.players && data.players.length > 0) {
            playersList.innerHTML = data.players.map(p =>
                `<div class="pvp-player">${p.username} — ${p.bet.toFixed(2)} TON</div>`
            ).join('');
        } else if (playersList) {
            playersList.innerHTML = '<div style="color: var(--hint, #999999);">Пока никого нет</div>';
        }

        updateBalanceDisplay();

    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
    }
}
// =============================================
// 8. ЗАПУСК
// =============================================
loadProfile();
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initWheel, 500);
    setTimeout(updatePvpStatus, 1000);
});

setInterval(updatePvpStatus, 3000);
// =============================================
// БАЛАНС В ПРАВОМ ВЕРХНЕМ УГЛУ (НА ВСЕХ СТРАНИЦАХ)
// =============================================

async function updateGlobalBalance() {
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        document.getElementById('balanceFloatText').textContent = 'Ошибка';
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
            document.getElementById('balanceFloatText').textContent = 'Ошибка';
            return;
        }

        document.getElementById('balanceFloatText').textContent = `${data.balance.toFixed(2)} TON`;
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
        document.getElementById('balanceFloatText').textContent = 'Ошибка';
    }
}

// Вызываем при загрузке и каждые 10 секунд
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateGlobalBalance, 500);
});

setInterval(updateGlobalBalance, 10000);
// =============================================
// ВРАЩЕНИЕ КОЛЕСА
// =============================================

// =============================================
// ВРАЩЕНИЕ КОЛЕСА (ГАРАНТИРОВАННО РАБОТАЕТ)
function spinWheel(players, onComplete) {
    if (isSpinning) return;
    if (!players || players.length < 2) {
        console.warn('Нужно минимум 2 игрока');
        return;
    }

    isSpinning = true;
    wheelPlayers = players;

    const resultDiv = document.getElementById('wheelResult');
    if (resultDiv) resultDiv.textContent = '🌀 Колесо вращается...';

    // 1. Вычисляем победителя
    const totalBet = players.reduce((sum, p) => sum + p.bet, 0);
    const random = Math.random() * totalBet;
    let cumulative = 0;
    let winnerIndex = 0;
    for (let i = 0; i < players.length; i++) {
        cumulative += players[i].bet;
        if (random <= cumulative) {
            winnerIndex = i;
            break;
        }
    }

    // 2. Рассчитываем угол остановки для победителя
    // Суммируем углы секторов до победителя
    let angleToWinner = 0;
    for (let i = 0; i < winnerIndex; i++) {
        const sliceAngle = (players[i].bet / totalBet) * 2 * Math.PI;
        angleToWinner += sliceAngle;
    }
    // Добавляем половину сектора победителя (чтобы стрелка указывала в центр)
    const winnerSliceAngle = (players[winnerIndex].bet / totalBet) * 2 * Math.PI;
    angleToWinner += winnerSliceAngle / 2;

    // 3. Вычисляем финальный угол (минимум 8 оборотов + доворот)
    const extraSpins = 8 + Math.random() * 2;
    const targetRotation = extraSpins * 2 * Math.PI + (2 * Math.PI - angleToWinner);
    const startRotation = wheelRotation;
    const duration = 5000 + Math.random() * 1000;
    const startTime = Date.now();

    function animateSpin() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        wheelRotation = startRotation + (targetRotation - startRotation) * easeOut;

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            wheelRotation = startRotation + targetRotation;
            isSpinning = false;

            const winner = players[winnerIndex];
            if (resultDiv) {
                resultDiv.innerHTML = `
                    🎉 <span style="color: #f1c40f; font-weight: 700;">${winner.username}</span>
                    выиграл <span style="color: #2ecc71;">${totalBet.toFixed(2)} TON</span>!
                `;
            }

            drawWheel();
            if (onComplete) onComplete(winner);
        }
    }

    animateSpin();
}
// =============================================
// ТАЙМЕР ПЕРЕД ВРАЩЕНИЕМ (ПРОСТОЙ И НАДЁЖНЫЙ)
// =============================================
let timerInterval = null;

function startGameTimer(players) {
    // Если таймер уже запущен — не запускаем новый
    if (timerInterval) return;

    const statusDisplay = document.getElementById('pvpStatus');
    const betSection = document.getElementById('betSection');

    // Скрываем кнопки ставок
    if (betSection) betSection.style.display = 'none';

    let seconds = 10;
    statusDisplay.innerHTML = `
        <p style="color: #f39c12; font-weight: 600;">⏳ Игра начнётся через ${seconds} секунд...</p>
        <p>Игроков: ${players.length}</p>
        <p id="timerDisplay" style="font-size: 32px; font-weight: 700; color: #e74c3c;">${seconds}</p>
    `;

    timerInterval = setInterval(() => {
        seconds--;
        const timerEl = document.getElementById('timerDisplay');
        if (timerEl) timerEl.textContent = seconds;

        // Обновляем текст
        if (statusDisplay) {
            const textEl = statusDisplay.querySelector('p:first-child');
            if (textEl) textEl.textContent = `⏳ Игра начнётся через ${seconds} секунд...`;
        }

        if (seconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            // Запускаем вращение
            statusDisplay.innerHTML = `
                <p style="color: #2ecc71; font-weight: 600;">⚔️ Колесо вращается!</p>
                <p>Игроков: ${players.length}</p>
            `;

            spinWheel(players, (winner) => {
                console.log('🏆 Победитель:', winner);
                setTimeout(() => {
                    updateGlobalBalance();
                    updatePvpStatus();
                }, 2000);
            });
        }
    }, 1000);
}

