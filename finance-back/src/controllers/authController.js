// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// Базовые категории (создаются только ПОСЛЕ подтверждения кода)
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

// --- ШАГ 1: РЕГИСТРАЦИЯ И ОТПРАВКА КОДА ---
exports.register = async (req, res) => {
    try {
        const { email, password, phone } = req.body; // Phone теперь принимаем
        const cleanEmail = email ? email.trim() : '';
        const cleanPhone = phone ? phone.trim() : '';

        if (!cleanEmail && !cleanPhone) {
            return res.status(400).json({ error: 'Email or phone required' });
        }

        const usePhone = Boolean(cleanPhone && !cleanEmail);

        // 1. Проверяем, есть ли такой юзер
        const orFilters = [];
        if (cleanEmail) orFilters.push({ email: cleanEmail });
        if (cleanPhone) orFilters.push({ phone: cleanPhone });

        const existingUser = await prisma.user.findFirst({
            where: { OR: orFilters }
        });

        // Если юзер есть И он уже подтвержден — ошибка
        if (existingUser && existingUser.is_verified) {
            return res.status(400).json({ error: 'Пользователь с таким Email или телефоном уже существует' });
        }

        // 2. Генерируем данные
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        // Генерируем 6-значный код (100000 - 999999)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Срок действия 10 минут
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); 

        // 3. Сохраняем (или обновляем) в БД
        if (existingUser && !existingUser.is_verified) {
            // Если юзер пытался регаться, но не подтвердил — обновляем ему код и пароль
            const updateData = {
                password_hash: hash,
                verification_code: code,
                code_expires_at: codeExpiry
            };
            if (cleanPhone) updateData.phone = cleanPhone;
            if (cleanEmail) updateData.email = cleanEmail;

            await prisma.user.update({
                where: { id: existingUser.id },
                data: updateData
            });
        } else {
            // Создаем нового "ожидающего" юзера
            await prisma.user.create({
                data: {
                    email: cleanEmail || null,
                    phone: cleanPhone || null,
                    password_hash: hash,
                    verification_code: code,
                    code_expires_at: codeExpiry,
                    role: 'user',
                    status: 'pending',     // Важно: статус "ожидает"
                    is_verified: false,    // Важно: не верифицирован
                    settings: { create: {} }
                }
            });
        }

        // 4. Отправляем код на Email
        // (Для SMS тут нужно добавить вызов SMS-сервиса, если есть API ключ)
        if (usePhone) {
            await smsService.sendVerificationCode(cleanPhone, code);
        } else {
            await emailService.sendVerificationCode(cleanEmail, code);
        }

        res.status(200).json({ 
            message: 'Код подтверждения отправлен', 
            email: cleanEmail || null,
            phone: cleanPhone || null,
            redirect: 'verify' // Флаг для фронтенда, чтобы переключить экран
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
};

// --- ШАГ 2: ПОДТВЕРЖДЕНИЕ КОДА ---
exports.verifyEmail = async (req, res) => {
    try {
        const { email, phone, code } = req.body;
        const cleanEmail = email ? email.trim() : '';
        const cleanPhone = phone ? phone.trim() : '';

        if (!cleanEmail && !cleanPhone) {
            return res.status(400).json({ error: 'Email or phone required' });
        }

        const orFilters = [];
        if (cleanEmail) orFilters.push({ email: cleanEmail });
        if (cleanPhone) orFilters.push({ phone: cleanPhone });

        const user = await prisma.user.findFirst({ where: { OR: orFilters } });

        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.is_verified) return res.status(400).json({ error: 'Аккаунт уже подтвержден' });

        // Проверка кода
        if (user.verification_code !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }

        // Проверка времени
        if (new Date() > user.code_expires_at) {
            return res.status(400).json({ error: 'Срок действия кода истек. Зарегистрируйтесь заново.' });
        }

        // АКТИВАЦИЯ: Транзакция
        const result = await prisma.$transaction(async (tx) => {
            // 1. Активируем юзера
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    is_verified: true,
                    status: 'active',
                    verification_code: null, // Стираем код
                    code_expires_at: null
                }
            });

            // 2. Создаем категории (только сейчас, чтобы не мусорить в БД)
            const categoriesData = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }));
            await tx.category.createMany({ data: categoriesData });

            return updatedUser;
        });

        // Выдаем токен сразу после подтверждения
        const token = jwt.sign({ userId: result.id, role: result.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: result.id, email: result.email, role: result.role, status: 'active' }
        });

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ error: 'Ошибка подтверждения' });
    }
};

// --- ЛОГИН ---
exports.login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const cleanEmail = email ? email.trim() : '';
        const cleanPhone = phone ? phone.trim() : '';

        if (!cleanEmail && !cleanPhone) {
            return res.status(400).json({ error: 'Email or phone required' });
        }

        const orFilters = [];
        if (cleanEmail) orFilters.push({ email: cleanEmail });
        if (cleanPhone) orFilters.push({ phone: cleanPhone });

        const user = await prisma.user.findFirst({ where: { OR: orFilters } });
        
        // Задержка от брутфорса
        if (!user) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        // ПРОВЕРКИ СТАТУСА
        if (!user.is_verified) {
             // Если пароль верный, но аккаунт не подтвержден
            return res.status(403).json({ 
                error: 'Аккаунт не подтвержден', 
                needVerification: true,
                email: user.email,
                phone: user.phone
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Аккаунт заблокирован' });
        }

        // Обновляем время входа
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
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
