// =============================================
// СЕРВЕР (Node.js + Express)
// =============================================
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// КЛЮЧИ (ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ)
// =============================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Ошибка: переменные SUPABASE_URL и SUPABASE_KEY не установлены!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// PVP-ЛОГИКА (ХРАНИЛИЩЕ В ПАМЯТИ)
// =============================================
const pvpPool = {
    players: [], // { telegram_id, bet, username }
    isActive: false,
    timer: null,
    roundId: null,
    timeoutId: null
};

// =============================================
// =============================================
// API: ПОЛУЧИТЬ ИЛИ СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ (БЕЗ ДУБЛЕЙ)
// =============================================
app.post('/api/user', async (req, res) => {
    const { telegram_id, username } = req.body;

    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id обязателен' });
    }

    try {
        // Приводим к строке и убираем пробелы (на всякий случай)
        const cleanTelegramId = String(telegram_id).trim();

        // 1. Ищем пользователя по telegram_id
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', cleanTelegramId)
            .maybeSingle();

        // Если ошибка не "не найдено" — возвращаем её
        if (error && error.code !== 'PGRST116') {
            console.error('Ошибка поиска пользователя:', error);
            return res.status(500).json({ error: error.message });
        }

        // 2. Если пользователь найден — возвращаем его
        if (user) {
            console.log(`✅ Найден пользователь: ${user.username} (${user.telegram_id})`);
            return res.json(user);
        }

        // 3. Если не найден — создаём нового
        console.log(`🆕 Создаём нового пользователя: ${cleanTelegramId}`);

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{ 
                telegram_id: cleanTelegramId, 
                username: username || 'Игрок', 
                balance: 5,   // Стартовый бонус 5 TON
                wins: 0 
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Ошибка создания пользователя:', insertError);
            return res.status(500).json({ error: insertError.message });
        }

        console.log(`✅ Создан новый пользователь: ${newUser.username} (${newUser.telegram_id})`);
        res.json(newUser);

    } catch (err) {
        console.error('Ошибка в /api/user:', err);
        res.status(500).json({ error: err.message });
    }
});
// =============================================
// API: ОБНОВИТЬ ПОЛЬЗОВАТЕЛЯ
// =============================================
app.post('/api/user/update', async (req, res) => {
    const { telegram_id, ...updates } = req.body;

    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id обязателен' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('telegram_id', telegram_id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// API: СДЕЛАТЬ СТАВКУ В PVP
// =============================================
app.post('/api/pvp/bet', async (req, res) => {
    const { telegram_id, bet } = req.body;

    if (!telegram_id || !bet || bet < 0.1) {
        return res.status(400).json({ error: 'Минимальная ставка 0.1 TON' });
    }

    try {
        // Получаем пользователя
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

        if (error || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем баланс
        if (user.balance < bet) {
            return res.status(400).json({ error: 'Недостаточно TON' });
        }

        // Обновляем баланс (списываем ставку)
        const newBalance = user.balance - bet;
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', telegram_id);

        if (updateError) {
            return res.status(500).json({ error: 'Ошибка обновления баланса' });
        }

        // Добавляем игрока в пул
        pvpPool.players.push({
            telegram_id,
            bet: bet,
            username: user.username || 'Игрок'
        });

        console.log(`✅ ${user.username} сделал ставку ${bet} TON`);

        // Если в пуле 2+ игроков и игра не активна — запускаем
        if (pvpPool.players.length >= 2 && !pvpPool.isActive) {
            startPvpRound();
        }

        res.json({
            success: true,
            message: 'Ставка принята!',
            pool: pvpPool.players,
            totalPool: pvpPool.players.reduce((sum, p) => sum + p.bet, 0)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// API: ПОЛУЧИТЬ СТАТУС PVP-ПУЛА
// =============================================
app.get('/api/pvp/status', (req, res) => {
    const totalPool = pvpPool.players.reduce((sum, p) => sum + p.bet, 0);
    res.json({
        players: pvpPool.players,
        count: pvpPool.players.length,
        totalPool: totalPool,
        isActive: pvpPool.isActive,
        roundId: pvpPool.roundId
    });
});

// =============================================
// ФУНКЦИЯ: ЗАПУСТИТЬ PVP-РАУНД
// =============================================
function startPvpRound() {
    if (pvpPool.isActive) return;

    pvpPool.isActive = true;
    pvpPool.roundId = 'round_' + Date.now();

    console.log(`🎯 Раунд ${pvpPool.roundId} начался! Игроков: ${pvpPool.players.length}`);

    // Таймер 5 секунд
    let countdown = 5;
    console.log(`⏳ Осталось ${countdown} секунд...`);

    pvpPool.timeoutId = setInterval(() => {
        countdown--;
        console.log(`⏳ ${countdown} секунд...`);

        if (countdown === 0) {
            clearInterval(pvpPool.timeoutId);
            finishPvpRound();
        }
    }, 1000);
}

// =============================================
// ФУНКЦИЯ: ЗАВЕРШИТЬ PVP-РАУНД
// =============================================
async function finishPvpRound() {
    if (!pvpPool.isActive) return;

    const players = [...pvpPool.players];
    const totalPool = players.reduce((sum, p) => sum + p.bet, 0);

    console.log(`🎯 Раунд ${pvpPool.roundId} завершён! Общий пул: ${totalPool} TON`);

    // Выбираем победителя (шанс пропорционален ставке)
    const random = Math.random() * totalPool;
    let cumulative = 0;
    let winner = players[0];

    for (const player of players) {
        cumulative += player.bet;
        if (random <= cumulative) {
            winner = player;
            break;
        }
    }

    console.log(`🏆 Победитель: ${winner.username} (ставка ${winner.bet} TON)`);

    // Начисляем выигрыш победителю (полный пул)
    try {
        const { data: winnerData, error: winnerError } = await supabase
            .from('users')
            .select('balance')
            .eq('telegram_id', winner.telegram_id)
            .single();

        if (winnerError) {
            console.error('Ошибка получения победителя:', winnerError);
            pvpPool.players = [];
            pvpPool.isActive = false;
            pvpPool.roundId = null;
            return;
        }

       const currentWins = winnerData.wins || 0;  // ← защита от NULL
const newBalance = winnerData.balance + totalPool;
const { error: updateError } = await supabase
    .from('users')
    .update({ 
        balance: newBalance, 
        wins: currentWins + 1 
    })
    .eq('telegram_id', winner.telegram_id);

        if (updateError) {
            console.error('Ошибка обновления баланса:', updateError);
        } else {
            console.log(`💰 ${winner.username} выиграл ${totalPool} TON! Новый баланс: ${newBalance}`);
        }

    } catch (err) {
        console.error('Ошибка в finishPvpRound:', err);
    }

    // Очищаем пул
    pvpPool.players = [];
    pvpPool.isActive = false;
    pvpPool.roundId = null;
    pvpPool.timeoutId = null;

    // Сохраняем результат в базу (опционально)
    try {
        await supabase
            .from('pvp_history')
            .insert([{
                round_id: pvpPool.roundId,
                players: JSON.stringify(players),
                winner_telegram_id: winner.telegram_id,
                total_pool: totalPool,
                created_at: new Date().toISOString()
            }]);
    } catch (err) {
        console.error('Ошибка сохранения истории:', err);
    }
}

// =============================================
// ЗАПУСК
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log('⚔️ PvP-модуль готов!');
});
