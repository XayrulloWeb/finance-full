const prisma = require('./prisma');

const notFoundError = (message) => {
    const error = new Error(message);
    error.code = 'NOT_FOUND';
    return error;
};

const ensureOwnedRecord = async (tx, model, userId, id, options = {}) => {
    const { allowNull = false, notFoundMessage = 'Resource not found' } = options;

    if (!id) {
        if (allowNull) return null;
        throw notFoundError(notFoundMessage);
    }

    const record = await tx[model].findFirst({
        where: { id, user_id: userId },
        select: { id: true }
    });

    if (!record) {
        throw notFoundError(notFoundMessage);
    }

    return record;
};

const ensureAccountOwnership = (userId, accountId, tx = prisma) =>
    ensureOwnedRecord(tx, 'account', userId, accountId, { notFoundMessage: 'Account not found' });

const ensureOptionalAccountOwnership = (userId, accountId, tx = prisma) =>
    ensureOwnedRecord(tx, 'account', userId, accountId, { allowNull: true, notFoundMessage: 'Account not found' });

const ensureCategoryOwnership = (userId, categoryId, tx = prisma) =>
    ensureOwnedRecord(tx, 'category', userId, categoryId, { notFoundMessage: 'Category not found' });

const ensureOptionalCategoryOwnership = (userId, categoryId, tx = prisma) =>
    ensureOwnedRecord(tx, 'category', userId, categoryId, { allowNull: true, notFoundMessage: 'Category not found' });

const ensureOptionalCounterpartyOwnership = (userId, counterpartyId, tx = prisma) =>
    ensureOwnedRecord(tx, 'counterparty', userId, counterpartyId, { allowNull: true, notFoundMessage: 'Counterparty not found' });

module.exports = {
    ensureAccountOwnership,
    ensureOptionalAccountOwnership,
    ensureCategoryOwnership,
    ensureOptionalCategoryOwnership,
    ensureOptionalCounterpartyOwnership
};
