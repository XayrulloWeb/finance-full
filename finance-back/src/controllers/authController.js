const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Генерация базовых категорий для нового юзера
const DEFAULT_CATEGORIES = [
    { name: 'Зарплата', type: 'income', icon: '💰', color: '#10b981' },
    { name: 'Фриланс', type: 'income', icon: '💻', color: '#3b82f6' },
    { name: 'Продукты', type: 'expense', icon: '🛒', color: '#ef4444' },
    { name: 'Транспорт', type: 'expense', icon: '🚕', color: '#f59e0b' },
    { name: 'Кафе', type: 'expense', icon: '☕', color: '#8b5cf6' },
    { name: 'Дом', type: 'expense', icon: '🏠', color: '#0ea5e9' },
    { name: 'Связь', type: 'expense', icon: '📱', color: '#3b82f6' },
    { name: 'Развлечения', type: 'expense', icon: '🎬', color: '#ec4899' },
    { name: 'Здоровье', type: 'expense', icon: '💊', color: '#14b8a6' },
    { name: 'Перевод', type: 'transfer', icon: '🔄', color: '#64748b' }
];

exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Проверка существования
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 2. Хэширование
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 3. Транзакция создания Юзера + Настроек + Категорий
        const result = await prisma.$transaction(async (tx) => {
            // Создаем юзера
            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: hash,
                    // Сразу создаем настройки
                    settings: { create: {} }
                }
            });

            // Создаем дефолтные категории
            const categoriesData = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }));
            await tx.category.createMany({ data: categoriesData });

            return user;
        });

        // 4. Токен
        const token = jwt.sign({ userId: result.id, role: result.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id: result.id, email: result.email, role: result.role }
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Constant time delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            // Constant time delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.status && user.status !== 'active') {
            return res.status(403).json({ error: 'User is not active' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date() }
        });

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
