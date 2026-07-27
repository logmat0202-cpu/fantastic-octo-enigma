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
// КЛЮЧИ (БЕРУТСЯ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ)
// =============================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Ошибка: переменные SUPABASE_URL и SUPABASE_KEY не установлены!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// API: ПОЛУЧИТЬ ИЛИ СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ
// =============================================
app.post('/api/user', async (req, res) => {
    const { telegram_id, username } = req.body;

    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id обязателен' });
    }

    try {
        // Ищем пользователя
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({ error: error.message });
        }

        // Если нет — создаём
        if (!user) {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ telegram_id, username: username || 'Игрок', balance: 0, wins: 0, losses: 0 }])
                .select()
                .single();

            if (insertError) {
                return res.status(500).json({ error: insertError.message });
            }
            user = newUser;
        }

        res.json(user);
    } catch (err) {
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
// ЗАПУСК
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});