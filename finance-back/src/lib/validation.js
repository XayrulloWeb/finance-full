const { z } = require('zod');

// Auth schemas
const registerSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: "Password must contain at least one letter and one number"
    })
}).refine(data => data.email || data.phone, {
    message: "Either email or phone is required"
});

const loginSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    password: z.string().min(1)
}).refine(data => data.email || data.phone, {
    message: "Either email or phone is required"
});

const verifySchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    code: z.string().length(6, { message: "Verification code must be 6 digits" })
}).refine(data => data.email || data.phone, {
    message: "Either email or phone is required"
});

// Transaction schemas
const transactionSchema = z.object({
    account_id: z.string().uuid(),
    category_id: z.string().uuid().optional().nullable(),
    counterparty_id: z.string().uuid().optional().nullable(),
    amount: z.number().positive().max(1e10),
    type: z.enum(['income', 'expense']),
    comment: z.string().max(500).optional(),
    date: z.string().datetime().optional()
});

const transferSchema = z.object({
    from_account_id: z.string().uuid(),
    to_account_id: z.string().uuid(),
    amount: z.number().positive().max(1e10),
    comment: z.string().max(500).optional(),
    date: z.string().datetime().optional()
}).refine(data => data.from_account_id !== data.to_account_id, {
    message: "Cannot transfer to the same account"
});

// Account schemas
const accountSchema = z.object({
    name: z.string().min(1).max(50),
    currency: z.string().length(3),
    color: z.string().regex(/^#[0-9A-F]{6}$/i),
    icon: z.string().max(10),
    balance: z.number().optional()
});

const updateAccountSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    currency: z.string().length(3).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    icon: z.string().max(10).optional(),
    is_hidden: z.boolean().optional()
});

// Category schemas
const categorySchema = z.object({
    name: z.string().min(1).max(50),
    type: z.enum(['income', 'expense', 'transfer']),
    icon: z.string().max(10),
    color: z.string().regex(/^#[0-9A-F]{6}$/i)
});

// Counterparty schemas
const counterpartySchema = z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['person', 'company', 'organization']).optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional(),
    notes: z.string().max(1000).optional()
});

const updateCounterpartySchema = counterpartySchema.partial();

// Goal schemas
const goalSchema = z.object({
    name: z.string().min(1).max(100),
    target_amount: z.number().positive().max(1e10),
    deadline: z.string().datetime().optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
});

// Debt schemas
const debtSchema = z.object({
    counterparty_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(100),
    amount: z.number().positive().max(1e10),
    type: z.enum(['i_owe', 'owes_me']),
    due_date: z.string().date().optional(),
    notes: z.string().max(1000).optional()
});

// Budget schemas
const budgetSchema = z.object({
    category_id: z.string().uuid(),
    amount: z.number().positive().max(1e10),
    period: z.enum(['month', 'year']).optional()
});

// Debt Request schemas (Social Debts)
const debtRequestSchema = z.object({
    receiver_email: z.string().email().min(1, { message: "Receiver email is required" }),
    amount: z.number().positive().max(999999999, { message: "Amount is too large" }),
    debt_type: z.enum(['i_owe', 'owes_me'], {
        message: "Debt type must be 'i_owe' or 'owes_me'"
    }),
    name: z.string().min(1).max(200, { message: "Name is too long" }),
    notes: z.string().max(1000).optional(),
    due_date: z.string().date().optional()
});

const rejectDebtSchema = z.object({
    reason: z.string().max(500).optional()
});

const payLinkedDebtSchema = z.object({
    amount: z.number().positive()
});

module.exports = {
    registerSchema,
    loginSchema,
    verifySchema,
    transactionSchema,
    transferSchema,
    accountSchema,
    updateAccountSchema,
    categorySchema,
    counterpartySchema,
    updateCounterpartySchema,
    goalSchema,
    debtSchema,
    budgetSchema,
    debtRequestSchema,
    rejectDebtSchema,
    payLinkedDebtSchema
};
