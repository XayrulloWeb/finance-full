const TAGS = [
    { name: 'Soglik', description: 'Servis holatini tekshirish endpointlari' },
    { name: 'Auth', description: 'Autentifikatsiya va foydalanuvchi kirish endpointlari' },
    { name: 'Dashboard', description: 'Asosiy dashboard va bootstrap malumotlari' },
    { name: 'Muntazam', description: 'Muntazam tranzaksiyalar' },
    { name: 'Sozlamalar', description: 'Foydalanuvchi sozlamalari va bildirishnomalar' },
    { name: 'AI', description: 'AI yordamchi endpointlari' },
    { name: 'Tranzaksiyalar', description: 'Daromad, xarajat va otkazmalar' },
    { name: 'Hisoblar', description: 'Hisoblar bilan ishlash' },
    { name: 'Kategoriyalar', description: 'Kategoriyalarni boshqarish' },
    { name: 'Kontragentlar', description: 'Kontragentlarni boshqarish' },
    { name: 'Maqsadlar', description: 'Maqsadlar bilan ishlash' },
    { name: 'Qarzlar', description: 'Qarzlar va tolovlar' },
    { name: 'Budjet', description: 'Budjet endpointlari' },
    { name: 'QarzSorovlari', description: 'Ijtimoiy qarz sorovlari va linked debt faoliyati' },
    { name: 'Admin', description: 'Admin panel endpointlari' },
    { name: 'Push', description: 'Push xabarnoma endpointlari' },
    { name: 'DevTest', description: 'Faqat development rejimida ishlaydigan test endpointlar' }
];

const jsonBody = (schemaRef, required = true) => ({
    required,
    content: {
        'application/json': {
            schema: { $ref: `#/components/schemas/${schemaRef}` }
        }
    }
});

const buildResponses = ({ secured = true, successDescription = 'Muvaffaqiyatli javob' } = {}) => {
    const responses = {
        200: { description: successDescription },
        400: {
            description: 'Xato sorov',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        },
        500: {
            description: 'Server xatosi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        }
    };

    if (secured) {
        responses[401] = {
            description: 'Token yoq yoki notogri',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        };
        responses[403] = {
            description: 'Ruxsat yoq',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        };
    }

    return responses;
};

const buildOperation = ({
    tag,
    summary,
    description,
    secured = true,
    requestSchema,
    parameters,
    successDescription
}) => {
    const operation = {
        tags: [tag],
        summary,
        description,
        responses: buildResponses({ secured, successDescription })
    };

    if (secured) operation.security = [{ bearerAuth: [] }];
    if (requestSchema) operation.requestBody = jsonBody(requestSchema);
    if (parameters?.length) operation.parameters = parameters;

    return operation;
};

const addPath = (paths, method, path, config) => {
    if (!paths[path]) paths[path] = {};
    paths[path][method] = buildOperation(config);
};

const pathParamsFromTemplate = (path) => {
    const matches = [...path.matchAll(/\{([^}]+)\}/g)];
    return matches.map((match) => ({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${match[1]} parametri`
    }));
};

const ROUTES = [
    // Auth
    { method: 'post', path: '/api/auth/register', tag: 'Auth', summary: 'Royxatdan otish', secured: false, requestSchema: 'RegisterRequest' },
    { method: 'post', path: '/api/auth/login', tag: 'Auth', summary: 'Tizimga kirish', secured: false, requestSchema: 'LoginRequest' },
    { method: 'post', path: '/api/auth/verify', tag: 'Auth', summary: 'Kod bilan tasdiqlash', secured: false, requestSchema: 'VerifyRequest' },
    { method: 'post', path: '/api/auth/request-password-reset', tag: 'Auth', summary: 'Parol tiklash sorovi', secured: false, requestSchema: 'PasswordResetRequest' },
    { method: 'post', path: '/api/auth/confirm-password-reset', tag: 'Auth', summary: 'Yangi parol ornatish', secured: false, requestSchema: 'PasswordResetConfirmRequest' },
    { method: 'post', path: '/api/auth/resend-verification', tag: 'Auth', summary: 'Tasdiqlash kodini qayta yuborish', secured: false, requestSchema: 'ResendVerificationRequest' },

    // Data / dashboard
    { method: 'get', path: '/api/dashboard', tag: 'Dashboard', summary: 'Dashboard malumotlari' },
    { method: 'get', path: '/api/categories', tag: 'Kategoriyalar', summary: 'Kategoriyalar royxati' },
    { method: 'get', path: '/api/budgets', tag: 'Budjet', summary: 'Budjetlar royxati' },
    { method: 'get', path: '/api/debts', tag: 'Qarzlar', summary: 'Qarzlar royxati' },
    { method: 'get', path: '/api/goals', tag: 'Maqsadlar', summary: 'Maqsadlar royxati' },
    { method: 'get', path: '/api/recurring', tag: 'Muntazam', summary: 'Muntazam tranzaksiyalar royxati' },
    { method: 'post', path: '/api/recurring', tag: 'Muntazam', summary: 'Muntazam tranzaksiya yaratish', requestSchema: 'RecurringRequest' },
    { method: 'put', path: '/api/recurring/{id}', tag: 'Muntazam', summary: 'Muntazam tranzaksiyani yangilash', requestSchema: 'RecurringRequest' },
    { method: 'delete', path: '/api/recurring/{id}', tag: 'Muntazam', summary: 'Muntazam tranzaksiyani ochirish' },
    { method: 'get', path: '/api/settings', tag: 'Sozlamalar', summary: 'Sozlamalarni olish' },
    { method: 'put', path: '/api/settings', tag: 'Sozlamalar', summary: 'Sozlamalarni yangilash', requestSchema: 'SettingsUpdateRequest' },
    { method: 'post', path: '/api/settings/refresh-rates', tag: 'Sozlamalar', summary: 'Valyuta kurslarini yangilash' },
    {
        method: 'get',
        path: '/api/notifications',
        tag: 'Sozlamalar',
        summary: 'Bildirishnomalar royxati',
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ]
    },
    { method: 'get', path: '/api/notifications/unread-count', tag: 'Sozlamalar', summary: 'Oqilmagan bildirishnomalar soni' },
    { method: 'post', path: '/api/notifications/read-all', tag: 'Sozlamalar', summary: 'Barcha bildirishnomani oqilgan qilish' },
    { method: 'post', path: '/api/notifications/{id}/read', tag: 'Sozlamalar', summary: 'Bitta bildirishnomani oqilgan qilish' },
    { method: 'get', path: '/api/insights', tag: 'Dashboard', summary: 'Moliyaviy insightlar' },
    { method: 'get', path: '/api/insights/smart', tag: 'AI', summary: 'AI smart insight' },
    {
        method: 'get',
        path: '/api/analytics/summary',
        tag: 'Dashboard',
        summary: 'Analitika xulosasi',
        parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }]
    },
    {
        method: 'get',
        path: '/api/calendar/summary',
        tag: 'Dashboard',
        summary: 'Kalendar xulosasi',
        parameters: [
            { name: 'year', in: 'query', schema: { type: 'integer' } },
            { name: 'month', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 } }
        ]
    },
    { method: 'get', path: '/api/data/bootstrap', tag: 'Dashboard', summary: 'Bootstrap malumotlari' },
    { method: 'post', path: '/api/data/import', tag: 'Dashboard', summary: 'Malumot import qilish', requestSchema: 'DataImportRequest' },

    // AI
    { method: 'post', path: '/api/ai/transaction-suggest', tag: 'AI', summary: 'AI tranzaksiya tavsiyasi', requestSchema: 'GenericObject' },
    { method: 'get', path: '/api/ai/alerts', tag: 'AI', summary: 'AI ogohlantirishlar' },
    { method: 'get', path: '/api/ai/forecast', tag: 'AI', summary: 'AI prognoz' },
    { method: 'get', path: '/api/ai/analytics-explain', tag: 'AI', summary: 'AI analitik izoh' },
    { method: 'get', path: '/api/ai/goals-advice', tag: 'AI', summary: 'AI maqsadlar maslahati' },
    { method: 'get', path: '/api/ai/debts-advice', tag: 'AI', summary: 'AI qarzlar maslahati' },
    { method: 'get', path: '/api/ai/categories/suggest', tag: 'AI', summary: 'AI kategoriya taklifi' },

    // Transactions
    {
        method: 'get',
        path: '/api/transactions',
        tag: 'Tranzaksiyalar',
        summary: 'Tranzaksiyalar royxati',
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'type', in: 'query', schema: { type: 'string' } },
            { name: 'account_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'category_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
        ]
    },
    { method: 'post', path: '/api/transactions', tag: 'Tranzaksiyalar', summary: 'Daromad/xarajat yaratish', requestSchema: 'TransactionCreateRequest' },
    { method: 'post', path: '/api/transactions/transfer', tag: 'Tranzaksiyalar', summary: 'Hisoblar orasida otkazma', requestSchema: 'TransferRequest' },
    { method: 'put', path: '/api/transactions/{id}', tag: 'Tranzaksiyalar', summary: 'Tranzaksiyani yangilash', requestSchema: 'GenericObject' },
    { method: 'delete', path: '/api/transactions/{id}', tag: 'Tranzaksiyalar', summary: 'Tranzaksiyani ochirish' },

    // Accounts
    { method: 'post', path: '/api/accounts', tag: 'Hisoblar', summary: 'Hisob yaratish', requestSchema: 'AccountCreateRequest' },
    { method: 'put', path: '/api/accounts/{id}', tag: 'Hisoblar', summary: 'Hisobni yangilash', requestSchema: 'GenericObject' },
    { method: 'delete', path: '/api/accounts/{id}', tag: 'Hisoblar', summary: 'Hisobni ochirish' },

    // Categories
    { method: 'post', path: '/api/categories', tag: 'Kategoriyalar', summary: 'Kategoriya yaratish', requestSchema: 'CategoryCreateRequest' },
    { method: 'delete', path: '/api/categories/{id}', tag: 'Kategoriyalar', summary: 'Kategoriyani ochirish' },

    // Counterparties
    { method: 'get', path: '/api/counterparties', tag: 'Kontragentlar', summary: 'Kontragentlar royxati' },
    { method: 'post', path: '/api/counterparties', tag: 'Kontragentlar', summary: 'Kontragent yaratish', requestSchema: 'CounterpartyCreateRequest' },
    { method: 'put', path: '/api/counterparties/{id}', tag: 'Kontragentlar', summary: 'Kontragentni yangilash', requestSchema: 'GenericObject' },
    { method: 'delete', path: '/api/counterparties/{id}', tag: 'Kontragentlar', summary: 'Kontragentni ochirish' },
    { method: 'post', path: '/api/counterparties/{id}/favorite', tag: 'Kontragentlar', summary: 'Favorite holatini almashtirish' },

    // Goals
    { method: 'post', path: '/api/goals', tag: 'Maqsadlar', summary: 'Maqsad yaratish', requestSchema: 'GoalCreateRequest' },
    { method: 'delete', path: '/api/goals/{id}', tag: 'Maqsadlar', summary: 'Maqsadni ochirish' },
    { method: 'post', path: '/api/goals/{id}/topup', tag: 'Maqsadlar', summary: 'Maqsadni toldirish', requestSchema: 'GoalTopupRequest' },

    // Debts
    { method: 'post', path: '/api/debts', tag: 'Qarzlar', summary: 'Qarz yaratish', requestSchema: 'DebtCreateRequest' },
    { method: 'delete', path: '/api/debts/{id}', tag: 'Qarzlar', summary: 'Qarzni ochirish' },
    { method: 'post', path: '/api/debts/{id}/pay', tag: 'Qarzlar', summary: 'Qarz tolash', requestSchema: 'DebtPayRequest' },

    // Budget
    { method: 'post', path: '/api/budgets', tag: 'Budjet', summary: 'Budjet yaratish yoki yangilash', requestSchema: 'BudgetUpsertRequest' },
    { method: 'delete', path: '/api/budgets/{id}', tag: 'Budjet', summary: 'Budjetni ochirish' },

    // Debt requests
    { method: 'get', path: '/api/debt-requests/incoming', tag: 'QarzSorovlari', summary: 'Kiruvchi qarz sorovlari' },
    { method: 'get', path: '/api/debt-requests/outgoing', tag: 'QarzSorovlari', summary: 'Chiquvchi qarz sorovlari' },
    { method: 'get', path: '/api/debt-requests/stats', tag: 'QarzSorovlari', summary: 'Qarz sorovlari statistikasi' },
    { method: 'post', path: '/api/debt-requests', tag: 'QarzSorovlari', summary: 'Qarz sorovi yaratish', requestSchema: 'DebtRequestCreateRequest' },
    { method: 'post', path: '/api/debt-requests/{id}/accept', tag: 'QarzSorovlari', summary: 'Qarz sorovini qabul qilish' },
    { method: 'post', path: '/api/debt-requests/{id}/reject', tag: 'QarzSorovlari', summary: 'Qarz sorovini rad qilish', requestSchema: 'DebtRequestRejectRequest' },
    { method: 'delete', path: '/api/debt-requests/{id}', tag: 'QarzSorovlari', summary: 'Qarz sorovini bekor qilish yoki ochirish' },
    { method: 'get', path: '/api/linked-debts/{id}/activity', tag: 'QarzSorovlari', summary: 'Linked debt faoliyati' },

    // Admin
    { method: 'get', path: '/api/admin/summary', tag: 'Admin', summary: 'Admin umumiy xulosasi' },
    { method: 'get', path: '/api/admin/users', tag: 'Admin', summary: 'Admin foydalanuvchilar royxati' },
    { method: 'post', path: '/api/admin/users/{id}/ban', tag: 'Admin', summary: 'Foydalanuvchini ban qilish' },
    { method: 'post', path: '/api/admin/users/{id}/unban', tag: 'Admin', summary: 'Foydalanuvchini unban qilish' },
    { method: 'delete', path: '/api/admin/users/{id}', tag: 'Admin', summary: 'Foydalanuvchini ochirish' },
    { method: 'post', path: '/api/admin/users/{id}/reset-password', tag: 'Admin', summary: 'Foydalanuvchi parolini reset qilish' },
    { method: 'get', path: '/api/admin/content', tag: 'Admin', summary: 'Admin content royxati' },
    { method: 'post', path: '/api/admin/content/{type}/{id}/action', tag: 'Admin', summary: 'Admin moderation amali', requestSchema: 'AdminModerationActionRequest' },
    { method: 'get', path: '/api/admin/export', tag: 'Admin', summary: 'Admin export' },

    // Push
    { method: 'get', path: '/api/push/key', tag: 'Push', summary: 'Push public key olish' },
    { method: 'post', path: '/api/push/subscribe', tag: 'Push', summary: 'Push obuna bolish', requestSchema: 'PushSubscriptionRequest' },
    { method: 'post', path: '/api/push/test', tag: 'Push', summary: 'Push test yuborish', requestSchema: 'PushTestRequest' },

    // Dev test routes (NODE_ENV !== production)
    { method: 'post', path: '/api/test/race-condition', tag: 'DevTest', summary: 'Race condition testi', secured: false, requestSchema: 'GenericObject' },
    { method: 'post', path: '/api/test/deadlock', tag: 'DevTest', summary: 'Deadlock testi', secured: false, requestSchema: 'GenericObject' }
];

const buildPaths = () => {
    const paths = {};

    addPath(paths, 'get', '/api/health', {
        tag: 'Soglik',
        summary: 'Backend holatini tekshirish',
        description: 'DB va Redis holatini tekshiradi',
        secured: false,
        successDescription: 'Servis ishlayapti'
    });

    ROUTES.forEach((route) => {
        const parameters = [
            ...pathParamsFromTemplate(route.path),
            ...(route.parameters || [])
        ];

        addPath(paths, route.method, route.path, {
            tag: route.tag,
            summary: route.summary,
            description: `${route.path} endpointi`,
            secured: route.secured !== false,
            requestSchema: route.requestSchema,
            parameters,
            successDescription: 'Muvaffaqiyatli bajarildi'
        });
    });

    return paths;
};

const buildOpenApiSpec = (serverUrl = 'http://localhost:5000') => ({
    openapi: '3.0.3',
    info: {
        title: 'Finance Empire API',
        version: '1.0.0',
        description: 'Finance Empire backend REST API hujjatlari (Uzbek tilida)'
    },
    servers: [{ url: serverUrl, description: 'Joriy backend server' }],
    tags: TAGS,
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'INVALID_TOKEN' },
                    error: { type: 'string', example: 'Token notogri' }
                }
            },
            GenericObject: {
                type: 'object',
                additionalProperties: true
            },
            RegisterRequest: {
                type: 'object',
                required: ['password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    password: { type: 'string', example: 'StrongPass!123' }
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    password: { type: 'string', example: 'StrongPass!123' }
                }
            },
            VerifyRequest: {
                type: 'object',
                required: ['code'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    code: { type: 'string', example: '123456' }
                }
            },
            PasswordResetRequest: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string', format: 'email' }
                }
            },
            PasswordResetConfirmRequest: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                    token: { type: 'string' },
                    newPassword: { type: 'string' }
                }
            },
            ResendVerificationRequest: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' }
                }
            },
            DataImportRequest: {
                type: 'object',
                additionalProperties: true
            },
            SettingsUpdateRequest: {
                type: 'object',
                additionalProperties: true
            },
            RecurringRequest: {
                type: 'object',
                additionalProperties: true
            },
            TransactionCreateRequest: {
                type: 'object',
                required: ['account_id', 'amount', 'type'],
                properties: {
                    account_id: { type: 'string', format: 'uuid' },
                    category_id: { type: 'string', format: 'uuid', nullable: true },
                    counterparty_id: { type: 'string', format: 'uuid', nullable: true },
                    amount: { type: 'number', example: 120000 },
                    type: { type: 'string', enum: ['income', 'expense'] },
                    comment: { type: 'string' },
                    date: { type: 'string', format: 'date-time' }
                }
            },
            TransferRequest: {
                type: 'object',
                required: ['from_account_id', 'to_account_id', 'amount'],
                properties: {
                    from_account_id: { type: 'string', format: 'uuid' },
                    to_account_id: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', example: 50000 },
                    comment: { type: 'string' },
                    date: { type: 'string', format: 'date-time' }
                }
            },
            AccountCreateRequest: {
                type: 'object',
                required: ['name', 'currency', 'color', 'icon'],
                properties: {
                    name: { type: 'string', example: 'Asosiy karta' },
                    currency: { type: 'string', example: 'UZS' },
                    color: { type: 'string', example: '#2563eb' },
                    icon: { type: 'string', example: 'card' },
                    initialBalance: { type: 'number', example: 100000 }
                }
            },
            CategoryCreateRequest: {
                type: 'object',
                required: ['name', 'type', 'icon', 'color'],
                properties: {
                    name: { type: 'string', example: 'Transport' },
                    type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                    icon: { type: 'string', example: 'car' },
                    color: { type: 'string', example: '#64748b' }
                }
            },
            CounterpartyCreateRequest: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', example: 'Ali Valiyev' },
                    type: { type: 'string', enum: ['person', 'company', 'organization'] },
                    phone: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    notes: { type: 'string' }
                }
            },
            GoalCreateRequest: {
                type: 'object',
                required: ['name', 'target_amount'],
                properties: {
                    name: { type: 'string' },
                    target_amount: { type: 'number', example: 5000000 },
                    deadline: { type: 'string', format: 'date-time' },
                    icon: { type: 'string' },
                    color: { type: 'string' }
                }
            },
            GoalTopupRequest: {
                type: 'object',
                required: ['amount', 'accountId'],
                properties: {
                    amount: { type: 'number', example: 250000 },
                    accountId: { type: 'string', format: 'uuid' }
                }
            },
            DebtCreateRequest: {
                type: 'object',
                required: ['name', 'amount', 'type'],
                properties: {
                    name: { type: 'string' },
                    amount: { type: 'number' },
                    type: { type: 'string', enum: ['i_owe', 'owes_me'] },
                    due_date: { type: 'string', format: 'date' },
                    account_id: { type: 'string', format: 'uuid', nullable: true },
                    counterparty_id: { type: 'string', format: 'uuid', nullable: true },
                    notes: { type: 'string' }
                }
            },
            DebtPayRequest: {
                type: 'object',
                required: ['amount', 'accountId'],
                properties: {
                    amount: { type: 'number', example: 100000 },
                    accountId: { type: 'string', format: 'uuid' }
                }
            },
            BudgetUpsertRequest: {
                type: 'object',
                required: ['category_id', 'amount'],
                properties: {
                    category_id: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', example: 1500000 },
                    period: { type: 'string', enum: ['month', 'year'] }
                }
            },
            DebtRequestCreateRequest: {
                type: 'object',
                required: ['receiver_email', 'amount', 'debt_type', 'name'],
                properties: {
                    receiver_email: { type: 'string', format: 'email' },
                    amount: { type: 'number', example: 300000 },
                    debt_type: { type: 'string', enum: ['i_owe', 'owes_me'] },
                    name: { type: 'string' },
                    notes: { type: 'string' },
                    due_date: { type: 'string', format: 'date' }
                }
            },
            DebtRequestRejectRequest: {
                type: 'object',
                properties: {
                    reason: { type: 'string' }
                }
            },
            AdminModerationActionRequest: {
                type: 'object',
                additionalProperties: true
            },
            PushSubscriptionRequest: {
                type: 'object',
                additionalProperties: true
            },
            PushTestRequest: {
                type: 'object',
                additionalProperties: true
            }
        }
    },
    paths: buildPaths()
});

module.exports = { buildOpenApiSpec };
