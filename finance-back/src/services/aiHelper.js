const { GoogleGenerativeAI } = require('@google/generative-ai');

const LANGUAGE_MAP = {
    ru: 'Russian',
    uz: 'Uzbek',
    en: 'English'
};

const DEFAULT_LANG = 'ru';

const getApiKey = () => process.env.GEMINI_API_KEY;
const getBytezKey = () => process.env.BYTEZ_API_KEY;
const getProvider = () => String(process.env.AI_PROVIDER || '').toLowerCase();
const getBytezModel = () => process.env.BYTEZ_MODEL || 'openai/gpt-4o-mini';
const getBytezMaxTokens = () => {
    const raw = Number.parseInt(process.env.BYTEZ_MAX_TOKENS || '512', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 512;
};
const getModelCandidates = () => {
    const preferred = process.env.GEMINI_MODEL;
    const baseModels = [
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-2.5-pro',
        'gemini-pro-latest',
        'gemini-2.0-flash-001',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite'
    ];
    const candidates = baseModels.flatMap((name) => [name, `models/${name}`]);
    return [preferred, ...candidates].filter(Boolean);
};

const createModel = (modelName) => {
    const genAI = new GoogleGenerativeAI(getApiKey());
    return genAI.getGenerativeModel({ model: modelName });
};

let bytezClient;
const getBytezClient = () => {
    if (!bytezClient) {
        const Bytez = require('bytez.js');
        bytezClient = new Bytez(getBytezKey());
    }
    return bytezClient;
};

const extractBytezText = (output) => {
    if (!output) return null;
    if (typeof output === 'string') return output;
    if (typeof output.content === 'string') return output.content;
    if (output?.choices?.[0]?.message?.content) return output.choices[0].message.content;
    if (Array.isArray(output)) {
        const first = output[0];
        if (typeof first === 'string') return first;
        if (first?.content) return first.content;
        if (first?.message?.content) return first.message.content;
    }
    return null;
};

const generateTextWithBytez = async (prompt) => {
    if (!getBytezKey()) return null;
    const client = getBytezClient();
    const model = client.model(getBytezModel());
    const modelId = getBytezModel().toLowerCase();
    const maxTokens = getBytezMaxTokens();
    const params = modelId.includes('openai') || modelId.includes('gpt')
        ? { max_tokens: maxTokens }
        : { max_new_tokens: maxTokens };
    const { error, output } = await model.run([
        { role: 'user', content: prompt }
    ], params);
    if (error) {
        throw error;
    }
    return extractBytezText(output);
};

const normalizeLang = (value) => {
    const raw = String(value || '').toLowerCase();
    if (raw.startsWith('uz')) return 'uz';
    if (raw.startsWith('en')) return 'en';
    if (raw.startsWith('ru')) return 'ru';
    return DEFAULT_LANG;
};

const getLanguageLabel = (lang) => LANGUAGE_MAP[lang] || LANGUAGE_MAP[DEFAULT_LANG];

const buildLanguagePrefix = (lang) => {
    const label = getLanguageLabel(lang);
    return `Language: ${label}. Respond ONLY in ${label}.`;
};

const safeJsonParse = (text, fallback) => {
    if (!text) return fallback;
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (error) {
        return fallback;
    }
};

const generateText = async (prompt) => {
    const provider = getProvider();
    let lastError;

    if (getBytezKey() && provider !== 'gemini') {
        try {
            const text = await generateTextWithBytez(prompt);
            if (text) return text;
        } catch (error) {
            lastError = error;
            if (provider === 'bytez') {
                throw error;
            }
        }
    }

    if (getApiKey()) {
        const candidates = getModelCandidates();
        for (const modelName of candidates) {
            try {
                const model = createModel(modelName);
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                lastError = error;
            }
        }
    }

    if (lastError) {
        throw lastError;
    }
    return null;
};

const generateJson = async (prompt, fallback = null) => {
    const text = await generateText(prompt);
    return text ? safeJsonParse(text, fallback) : fallback;
};

const hasApiKey = () => Boolean(getApiKey() || getBytezKey());

module.exports = {
    normalizeLang,
    getLanguageLabel,
    buildLanguagePrefix,
    safeJsonParse,
    generateJson,
    generateText,
    hasApiKey
};
