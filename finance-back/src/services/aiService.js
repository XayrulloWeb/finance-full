const prisma = require('../lib/prisma');
const { generateText } = require('./aiHelper');

// Инициализация Gemini
const LANGUAGE_MAP = {
    ru: 'Russian',
    uz: 'Uzbek',
    en: 'English'
};

class AiService {
    
    // Сбор данных для отправки в AI
    static async getUserFinancialContext(userId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // 1. Текущие расходы
        const thisMonthTxs = await prisma.transaction.findMany({
            where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: startOfMonth } }
        });

        // 2. Расходы прошлого месяца
        const lastMonthTxs = await prisma.transaction.findMany({
            where: { user_id: userId, type: 'expense', is_removed: false, date: { gte: startOfLastMonth, lte: endOfLastMonth } }
        });

        // 3. Бюджеты
        const budgets = await prisma.budget.findMany({
            where: { user_id: userId },
            include: { category: true }
        });

        const currentTotal = thisMonthTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        const lastMonthTotal = lastMonthTxs.reduce((sum, t) => sum + Number(t.amount), 0);

        // Топ категории
        const catMap = {};
        thisMonthTxs.forEach(t => {
            // Для безопасности отправляем только ID или общие названия, если есть join
            // Но пока агрегируем по ID
            catMap[t.category_id] = (catMap[t.category_id] || 0) + Number(t.amount);
        });
        
        // Получаем имена категорий для топ-3 трат
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topExpenses = [];
        
        for (const [catId, amount] of sortedCats) {
            if(!catId) continue;
            const cat = await prisma.category.findUnique({ where: { id: catId } });
            if (cat) topExpenses.push({ name: cat.name, amount });
        }

        return {
            date: now.toLocaleDateString(),
            currentExpense: currentTotal,
            lastMonthTotal: lastMonthTotal,
            daysPassed: now.getDate(),
            topCategories: topExpenses,
            // Прогресс месяца (например 0.5 = половина месяца)
            monthProgress: now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        };
    }

    static async getDailyInsight(userId, lang = 'ru') {
        try {
            // 1. Собираем данные
            const data = await this.getUserFinancialContext(userId);

            // 2. Выбираем модель
            const normalizedLang = String(lang || 'ru').toLowerCase();
            const languageLabel = LANGUAGE_MAP[normalizedLang] || LANGUAGE_MAP.ru;

            // 3. Промпт (Инструкция для AI)
            const prompt = `
            Language: ${languageLabel}. Respond ONLY in ${languageLabel}.
            Ты — дерзкий, но заботливый финансовый помощник. Твоя цель — проанализировать финансы пользователя и дать ОДИН краткий, меткий совет или комментарий.
            
            ВВОДНЫЕ ДАННЫЕ (JSON):
            ${JSON.stringify(data)}

            ПРАВИЛА:
            1. Если расходы (currentExpense) растут слишком быстро по сравнению с прошлым месяцем — предупреди (строго или с юмором).
            2. Если расходы ниже обычного — обязательно похвали.
            3. Если одна категория (topCategories) съела слишком много — укажи на это.
            4. Не используй сложные термины. Общайся как "старший брат".
            5. Язык: Русский.

            ФОРМАТ ОТВЕТА (строго JSON без markdown):
            {
                "mood": "neutral" | "warning" | "danger" | "success", 
                "title": "Заголовок (2-3 слова)",
                "message": "Текст сообщения (максимум 2 предложения)",
                "icon": "Подходящий эмодзи"
            }
            
            Пример настроения:
            - success: если экономит.
            - danger: если тратит намного быстрее, чем в прошлом месяце.
            - warning: если есть перекос в одной категории.
            - neutral: обычный совет.
            `;

            // 4. Запрос к AI
            let text = await generateText(prompt);
            if (!text) {
                throw new Error('AI returned empty response');
            }

            // Очистка от Markdown (иногда Gemini шлет \`\`\`json)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('Gemini Error:', error);
            // Фолбэк (запасной вариант), если AI недоступен
            return {
                mood: 'neutral',
                icon: '🤖',
                title: 'Анализирую...',
                message: 'Я пока учусь считать твои деньги. Загляни позже!'
            };
        }
    }
}

module.exports = AiService;