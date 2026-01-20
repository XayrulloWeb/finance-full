/**
 * Currency Service - Finance Empire
 * Fetches exchange rates from CBU (Central Bank of Uzbekistan)
 * API: https://cbu.uz/ru/arkhiv-kursov-valyut/json/
 */

const axios = require('axios');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const cacheService = require('./cacheService');

const CBU_API_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/';

// Currency codes we care about
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP', 'JPY', 'CNY', 'KRW', 'TRY'];

/**
 * Fetch current exchange rates from CBU API
 * @returns {Promise<Object>} Map of currency code to rate (how many UZS for 1 unit)
 */
async function fetchRatesFromCBU() {
    try {
        const response = await axios.get(CBU_API_URL, { timeout: 10000 });
        const data = response.data;

        if (!Array.isArray(data)) {
            throw new Error('Invalid CBU API response format');
        }

        const rates = { UZS: 1 }; // Base currency

        for (const item of data) {
            const code = item.Ccy; // Currency code (USD, EUR, etc.)
            const rate = parseFloat(item.Rate); // Rate to UZS
            const nominal = parseInt(item.Nominal) || 1; // How many units (e.g., 1 USD, 100 JPY)

            if (SUPPORTED_CURRENCIES.includes(code) && rate > 0) {
                // Normalize to 1 unit of currency
                rates[code] = rate / nominal;
            }
        }

        logger.info('CBU rates fetched successfully', { currencies: Object.keys(rates).length });
        return rates;
    } catch (error) {
        logger.error('Failed to fetch CBU rates', { error: error.message });
        throw error;
    }
}

/**
 * Update currency rates for a specific user
 * @param {string} userId 
 * @param {Object} rates - Map of currency code to rate
 */
async function updateUserRates(userId, rates) {
    try {
        await prisma.userSettings.update({
            where: { user_id: userId },
            data: {
                currency_rates: rates,
                updated_at: new Date()
            }
        });

        // Invalidate cache for this user
        await cacheService.invalidateAfterDataChange(userId);

        logger.info('User currency rates updated', { userId });
    } catch (error) {
        logger.error('Failed to update user rates', { userId, error: error.message });
        throw error;
    }
}

/**
 * Update currency rates for ALL users (used by cron)
 */
async function updateAllUsersRates() {
    try {
        const rates = await fetchRatesFromCBU();

        // Update all user settings at once
        const result = await prisma.userSettings.updateMany({
            data: {
                currency_rates: rates,
                updated_at: new Date()
            }
        });

        logger.info('All users currency rates updated', {
            usersUpdated: result.count,
            rates: Object.keys(rates)
        });

        return { success: true, usersUpdated: result.count, rates };
    } catch (error) {
        logger.error('Failed to update all users rates', { error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Refresh rates for a single user (manual refresh)
 */
async function refreshUserRates(userId) {
    const rates = await fetchRatesFromCBU();
    await updateUserRates(userId, rates);
    return rates;
}

module.exports = {
    fetchRatesFromCBU,
    updateUserRates,
    updateAllUsersRates,
    refreshUserRates,
    SUPPORTED_CURRENCIES
};
