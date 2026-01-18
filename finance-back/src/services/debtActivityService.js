const { PrismaClient } = require('@prisma/client');
const logger = require('../lib/logger');

const prisma = new PrismaClient();

/**
 * Создать запись активности
 * @param {string} linkedDebtId - ID связанного долга
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия: 'created' | 'payment' | 'settled' | 'edited' | 'note_added'
 * @param {object} data - Дополнительные данные
 */
exports.logActivity = async (linkedDebtId, userId, actionType, data = {}) => {
    try {
        const activity = await prisma.debtActivity.create({
            data: {
                linked_debt_id: linkedDebtId,
                user_id: userId,
                action_type: actionType,
                amount: data.amount || null,
                note: data.note || null,
                metadata: data.metadata || null
            },
            include: {
                user: {
                    select: { id: true, email: true }
                }
            }
        });

        logger.info('Debt activity logged', {
            linkedDebtId,
            actionType,
            userId
        });

        return activity;
    } catch (error) {
        logger.error('Log activity error', { error: error.message });
        throw error;
    }
};

/**
 * Получить историю активности связанного долга
 * @param {string} linkedDebtId - ID связанного долга
 * @returns {Promise<Array>} - Массив активностей
 */
exports.getActivityTimeline = async (linkedDebtId) => {
    try {
        const activities = await prisma.debtActivity.findMany({
            where: { linked_debt_id: linkedDebtId },
            include: {
                user: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return activities;
    } catch (error) {
        logger.error('Get activity timeline error', { error: error.message });
        throw error;
    }
};
