const prisma = require('../lib/prisma');
const BalanceService = require('../services/balanceService');
const bcrypt = require('bcryptjs');

const MAX_LIMIT = 100;

const toDayKey = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
};

const buildSeries = (startDate, days, rows) => {
    const map = new Map(rows.map(row => [toDayKey(row.day), Number(row.count) || 0]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const key = toDayKey(d);
        series.push({ date: key, count: map.get(key) || 0 });
    }
    return series;
};

const mergeDayCounts = (...rowsGroups) => {
    const map = new Map();
    for (const rows of rowsGroups) {
        for (const row of rows) {
            const key = toDayKey(row.day);
            map.set(key, (map.get(key) || 0) + (Number(row.count) || 0));
        }
    }
    return map;
};

const logAdminAction = async (adminId, action, targetType, targetId, meta) => {
    try {
        await prisma.adminAuditLog.create({
            data: {
                admin_id: adminId,
                action,
                target_type: targetType || null,
                target_id: targetId || null,
                meta: meta || undefined
            }
        });
    } catch (error) {
        console.error('Admin audit log error:', error);
    }
};

exports.getAdminSummary = async (req, res) => {
    try {
        const days = Math.max(7, Math.min(90, Number(req.query.days) || 30));
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const [
            totalUsers,
            newUsers24h,
            newUsers7d,
            totalTransactions,
            totalDebts,
            totalGoals,
            totalAccounts,
            totalCategories,
            totalCounterparties,
            totalBudgets,
            totalRecurring,
            completedGoals,
            goalsTotal
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'user' } }),
            prisma.user.count({ where: { role: 'user', created_at: { gte: start24h } } }),
            prisma.user.count({ where: { role: 'user', created_at: { gte: start7d } } }),
            prisma.transaction.count({ where: { is_removed: false, user: { role: 'user' } } }),
            prisma.debt.count({ where: { is_removed: false, user: { role: 'user' } } }),
            prisma.goal.count({ where: { is_removed: false, user: { role: 'user' } } }),
            prisma.account.count({ where: { user: { role: 'user' } } }),
            prisma.category.count({ where: { user: { role: 'user' } } }),
            prisma.counterparty.count({ where: { user: { role: 'user' } } }),
            prisma.budget.count({ where: { user: { role: 'user' } } }),
            prisma.recurringTransaction.count({ where: { user: { role: 'user' } } }),
            prisma.goal.count({ where: { user: { role: 'user' }, is_removed: false, is_completed: true } }),
            prisma.goal.count({ where: { user: { role: 'user' }, is_removed: false } })
        ]);

        const totalEntities =
            totalTransactions +
            totalDebts +
            totalGoals +
            totalAccounts +
            totalCategories +
            totalCounterparties +
            totalBudgets +
            totalRecurring;

        const activeTodayRows = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT t.user_id)::int AS count
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            WHERE u.role = 'user'
              AND t.is_removed = false
              AND t.created_at >= ${todayStart}
              AND t.created_at <= ${todayEnd}
        `;
        const activeToday = Number(activeTodayRows?.[0]?.count) || 0;

        const registrationsRows = await prisma.$queryRaw`
            SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
            FROM users
            WHERE role = 'user'
              AND created_at >= ${start}
              AND created_at <= ${end}
            GROUP BY day
            ORDER BY day
        `;

        const activityRows = await prisma.$queryRaw`
            SELECT date_trunc('day', t.created_at) AS day, COUNT(*)::int AS count
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            WHERE u.role = 'user'
              AND t.is_removed = false
              AND t.created_at >= ${start}
              AND t.created_at <= ${end}
            GROUP BY day
            ORDER BY day
        `;

        const txContentRows = await prisma.$queryRaw`
            SELECT date_trunc('day', t.created_at) AS day, COUNT(*)::int AS count
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            WHERE u.role = 'user'
              AND t.is_removed = false
              AND t.created_at >= ${start}
              AND t.created_at <= ${end}
            GROUP BY day
        `;

        const debtContentRows = await prisma.$queryRaw`
            SELECT date_trunc('day', d.created_at) AS day, COUNT(*)::int AS count
            FROM debts d
            JOIN users u ON u.id = d.user_id
            WHERE u.role = 'user'
              AND d.is_removed = false
              AND d.created_at >= ${start}
              AND d.created_at <= ${end}
            GROUP BY day
        `;

        const goalContentRows = await prisma.$queryRaw`
            SELECT date_trunc('day', g.created_at) AS day, COUNT(*)::int AS count
            FROM goals g
            JOIN users u ON u.id = g.user_id
            WHERE u.role = 'user'
              AND g.is_removed = false
              AND g.created_at >= ${start}
              AND g.created_at <= ${end}
            GROUP BY day
        `;

        const contentMap = mergeDayCounts(txContentRows, debtContentRows, goalContentRows);
        const contentSeries = [];
        for (let i = 0; i < days; i += 1) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = toDayKey(d);
            contentSeries.push({ date: key, count: contentMap.get(key) || 0 });
        }

        const completionRate = goalsTotal > 0 ? Math.round((completedGoals / goalsTotal) * 100) : 0;

        res.json({
            kpis: {
                total_users: totalUsers,
                new_users_24h: newUsers24h,
                new_users_7d: newUsers7d,
                active_today: activeToday,
                total_entities: totalEntities,
                reports_count: 0,
                goal_completion_pct: completionRate
            },
            charts: {
                registrations: buildSeries(start, days, registrationsRows),
                activity: buildSeries(start, days, activityRows),
                content: contentSeries
            },
            reports_enabled: false
        });
    } catch (error) {
        console.error('Admin Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch admin summary' });
    }
};

const parseDateRange = (from, to) => {
    if (!from && !to) return null;
    const range = {};
    if (from) {
        const parsedFrom = new Date(from);
        if (!Number.isNaN(parsedFrom.getTime())) range.gte = parsedFrom;
    }
    if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) {
            parsedTo.setHours(23, 59, 59, 999);
            range.lte = parsedTo;
        }
    }
    return Object.keys(range).length ? range : null;
};

exports.getAdminUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = req.query.status || 'all';
        const sort = req.query.sort || 'created_at';
        const order = req.query.order === 'asc' ? 'asc' : 'desc';

        const where = { role: 'user' };
        if (status && status !== 'all') {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { id: { equals: search } }
            ];
        }

        const dateRange = parseDateRange(req.query.from, req.query.to);
        if (dateRange) {
            where.created_at = dateRange;
        }

        const sortMap = {
            created_at: 'created_at',
            last_login_at: 'last_login_at',
            email: 'email'
        };
        const orderBy = { [sortMap[sort] || 'created_at']: order };

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                    created_at: true,
                    last_login_at: true
                }
            })
        ]);

        const userIds = users.map(user => user.id);
        const [txAgg, debtAgg, goalAgg] = await Promise.all([
            prisma.transaction.groupBy({
                by: ['user_id'],
                where: { user_id: { in: userIds }, is_removed: false },
                _count: { _all: true },
                _max: { created_at: true }
            }),
            prisma.debt.groupBy({
                by: ['user_id'],
                where: { user_id: { in: userIds }, is_removed: false },
                _count: { _all: true },
                _max: { created_at: true }
            }),
            prisma.goal.groupBy({
                by: ['user_id'],
                where: { user_id: { in: userIds }, is_removed: false },
                _count: { _all: true },
                _max: { created_at: true }
            })
        ]);

        const txMap = new Map(txAgg.map(row => [row.user_id, row]));
        const debtMap = new Map(debtAgg.map(row => [row.user_id, row]));
        const goalMap = new Map(goalAgg.map(row => [row.user_id, row]));

        const userRows = users.map(user => {
            const txRow = txMap.get(user.id);
            const debtRow = debtMap.get(user.id);
            const goalRow = goalMap.get(user.id);

            const txCount = Number(txRow?._count?._all || 0);
            const debtCount = Number(debtRow?._count?._all || 0);
            const goalCount = Number(goalRow?._count?._all || 0);
            const actionsCount = txCount + debtCount + goalCount;

            const lastDates = [txRow?._max?.created_at, debtRow?._max?.created_at, goalRow?._max?.created_at]
                .filter(Boolean)
                .map(value => new Date(value));
            const lastActivity = lastDates.length
                ? new Date(Math.max(...lastDates.map(date => date.getTime())))
                : null;

            return {
                id: user.id,
                email: user.email,
                status: user.status,
                role: user.role,
                created_at: user.created_at,
                last_login_at: user.last_login_at,
                last_activity_at: lastActivity,
                metrics: {
                    transactionsCount: txCount,
                    debtsCount: debtCount,
                    goalsCount: goalCount,
                    actionsCount
                }
            };
        });

        res.json({
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            users: userRows
        });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const ensureTargetUser = async (targetId, adminId, res) => {
    if (targetId === adminId) {
        res.status(400).json({ error: 'Cannot modify own account' });
        return null;
    }
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
        res.status(404).json({ error: 'User not found' });
        return null;
    }
    if (target.role === 'admin') {
        res.status(403).json({ error: 'Cannot modify admin accounts' });
        return null;
    }
    return target;
};

exports.banUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const target = await ensureTargetUser(targetId, req.user.id, res);
        if (!target) return;

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { status: 'banned' }
        });
        await logAdminAction(req.user.id, 'user.ban', 'user', targetId, { prev_status: target.status });
        res.json({ success: true, user: { id: updated.id, status: updated.status } });
    } catch (error) {
        console.error('Admin Ban Error:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
};

exports.unbanUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const target = await ensureTargetUser(targetId, req.user.id, res);
        if (!target) return;

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { status: 'active' }
        });
        await logAdminAction(req.user.id, 'user.unban', 'user', targetId, { prev_status: target.status });
        res.json({ success: true, user: { id: updated.id, status: updated.status } });
    } catch (error) {
        console.error('Admin Unban Error:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const target = await ensureTargetUser(targetId, req.user.id, res);
        if (!target) return;

        await prisma.user.delete({ where: { id: targetId } });
        await logAdminAction(req.user.id, 'user.delete', 'user', targetId, { prev_status: target.status });
        res.json({ success: true });
    } catch (error) {
        console.error('Admin Delete Error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.resetUserPassword = async (req, res) => {
    try {
        const targetId = req.params.id;
        const target = await ensureTargetUser(targetId, req.user.id, res);
        if (!target) return;

        const tempPassword = require('crypto').randomBytes(6).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(tempPassword, salt);

        await prisma.user.update({
            where: { id: targetId },
            data: { password_hash: hash }
        });

        await logAdminAction(req.user.id, 'user.reset_password', 'user', targetId);
        res.json({ success: true, temp_password: tempPassword });
    } catch (error) {
        console.error('Admin Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

exports.getAdminContent = async (req, res) => {
    try {
        const type = (req.query.type || 'transactions').toLowerCase();
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const status = req.query.status || 'all';
        const search = (req.query.search || '').trim();
        const userId = req.query.user_id;

        const dateRange = parseDateRange(req.query.from, req.query.to);

        const baseWhere = {
            user: { role: 'user' }
        };
        if (userId) {
            baseWhere.user_id = userId;
        }
        if (status && status !== 'all') {
            baseWhere.is_removed = status === 'removed';
        }
        if (dateRange) {
            baseWhere.created_at = dateRange;
        }

        let total = 0;
        let items = [];

        if (type === 'debts') {
            const where = { ...baseWhere };
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }
            const [count, rows] = await Promise.all([
                prisma.debt.count({ where }),
                prisma.debt.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: { user: { select: { email: true } } }
                })
            ]);
            total = count;
            items = rows.map(row => ({
                id: row.id,
                entity_type: 'debts',
                title: row.name,
                status: row.is_removed ? 'removed' : 'published',
                created_at: row.created_at,
                user: { id: row.user_id, email: row.user?.email || '' },
                meta: {
                    amount: Number(row.amount),
                    paid_amount: Number(row.paid_amount),
                    type: row.type,
                    due_date: row.due_date,
                    is_closed: row.is_closed
                },
                actions: row.is_removed ? ['restore'] : ['remove']
            }));
        } else if (type === 'goals') {
            const where = { ...baseWhere };
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }
            const [count, rows] = await Promise.all([
                prisma.goal.count({ where }),
                prisma.goal.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: { user: { select: { email: true } } }
                })
            ]);
            total = count;
            items = rows.map(row => ({
                id: row.id,
                entity_type: 'goals',
                title: row.name,
                status: row.is_removed ? 'removed' : 'published',
                created_at: row.created_at,
                user: { id: row.user_id, email: row.user?.email || '' },
                meta: {
                    target_amount: Number(row.target_amount),
                    current_amount: Number(row.current_amount),
                    deadline: row.deadline,
                    is_completed: row.is_completed
                },
                actions: row.is_removed ? ['restore'] : ['remove']
            }));
        } else {
            const where = { ...baseWhere };
            if (search) {
                where.comment = { contains: search, mode: 'insensitive' };
            }
            const [count, rows] = await Promise.all([
                prisma.transaction.count({ where }),
                prisma.transaction.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: { user: { select: { email: true } } }
                })
            ]);
            total = count;
            items = rows.map(row => ({
                id: row.id,
                entity_type: 'transactions',
                title: row.comment || row.type,
                status: row.is_removed ? 'removed' : 'published',
                created_at: row.created_at,
                user: { id: row.user_id, email: row.user?.email || '' },
                meta: {
                    amount: Number(row.amount),
                    type: row.type,
                    date: row.date
                },
                actions: row.is_removed ? ['restore'] : ['remove']
            }));
        }

        res.json({
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            items
        });
    } catch (error) {
        console.error('Admin Content Error:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
};

const normalizeAction = (action) => {
    if (!action) return null;
    const value = action.toLowerCase();
    if (['remove', 'reject'].includes(value)) return 'remove';
    if (['restore', 'approve'].includes(value)) return 'restore';
    return null;
};

exports.moderateContent = async (req, res) => {
    try {
        const type = (req.params.type || '').toLowerCase();
        const id = req.params.id;
        const action = normalizeAction(req.body?.action);

        if (!action) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        if (type === 'debts') {
            const debt = await prisma.debt.findUnique({ where: { id }, include: { user: { select: { role: true } } } });
            if (!debt || debt.user?.role !== 'user') {
                return res.status(404).json({ error: 'Content not found' });
            }
            if (action === 'remove' && debt.is_removed) {
                return res.status(400).json({ error: 'Already removed' });
            }
            if (action === 'restore' && !debt.is_removed) {
                return res.status(400).json({ error: 'Already active' });
            }
            const updated = await prisma.debt.update({
                where: { id },
                data: action === 'remove'
                    ? { is_removed: true, removed_at: new Date() }
                    : { is_removed: false, removed_at: null }
            });
            await logAdminAction(req.user.id, `content.${action}`, 'debt', id);
            return res.json({ success: true, item: { id: updated.id, status: updated.is_removed ? 'removed' : 'published' } });
        }

        if (type === 'goals') {
            const goal = await prisma.goal.findUnique({ where: { id }, include: { user: { select: { role: true } } } });
            if (!goal || goal.user?.role !== 'user') {
                return res.status(404).json({ error: 'Content not found' });
            }
            if (action === 'remove' && goal.is_removed) {
                return res.status(400).json({ error: 'Already removed' });
            }
            if (action === 'restore' && !goal.is_removed) {
                return res.status(400).json({ error: 'Already active' });
            }
            const updated = await prisma.goal.update({
                where: { id },
                data: action === 'remove'
                    ? { is_removed: true, removed_at: new Date() }
                    : { is_removed: false, removed_at: null }
            });
            await logAdminAction(req.user.id, `content.${action}`, 'goal', id);
            return res.json({ success: true, item: { id: updated.id, status: updated.is_removed ? 'removed' : 'published' } });
        }

        if (type !== 'transactions') {
            return res.status(400).json({ error: 'Invalid content type' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { user: { select: { role: true } } }
        });
        if (!transaction || transaction.user?.role !== 'user') {
            return res.status(404).json({ error: 'Content not found' });
        }
        if (action === 'remove' && transaction.is_removed) {
            return res.status(400).json({ error: 'Already removed' });
        }
        if (action === 'restore' && !transaction.is_removed) {
            return res.status(400).json({ error: 'Already active' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const fresh = await tx.transaction.findUnique({ where: { id } });
            if (!fresh) {
                const err = new Error('Not found');
                err.code = 'NOT_FOUND';
                throw err;
            }

            if (action === 'remove') {
                const rollbackIncrement = -BalanceService.calculateIncrement(Number(fresh.amount), fresh.type);
                if (rollbackIncrement !== 0) {
                    await tx.account.update({
                        where: { id: fresh.account_id },
                        data: { balance: { increment: rollbackIncrement } }
                    });
                }
                return tx.transaction.update({
                    where: { id },
                    data: { is_removed: true, removed_at: new Date() }
                });
            }

            const increment = BalanceService.calculateIncrement(Number(fresh.amount), fresh.type);
            if (increment >= 0) {
                await BalanceService.updateBalance(tx, fresh.account_id, Number(fresh.amount), fresh.type);
            } else {
                await BalanceService.updateBalanceChecked(tx, fresh.account_id, Number(fresh.amount), fresh.type);
            }
            return tx.transaction.update({
                where: { id },
                data: { is_removed: false, removed_at: null }
            });
        });

        await logAdminAction(req.user.id, `content.${action}`, 'transaction', id);
        return res.json({ success: true, item: { id: updated.id, status: updated.is_removed ? 'removed' : 'published' } });
    } catch (error) {
        console.error('Admin Moderate Error:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ error: 'Insufficient balance to restore transaction' });
        }
        res.status(500).json({ error: 'Failed to moderate content' });
    }
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

exports.exportUsers = async (req, res) => {
    try {
        const format = (req.query.format || 'csv').toLowerCase();
        const users = await prisma.user.findMany({
            where: { role: 'user' },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                email: true,
                status: true,
                created_at: true,
                last_login_at: true
            }
        });

        await logAdminAction(req.user.id, 'users.export', 'user', null, { format });

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="users.json"');
            return res.send(JSON.stringify(users, null, 2));
        }

        const headers = ['id', 'email', 'status', 'created_at', 'last_login_at'];
        const rows = users.map(user => [
            user.id,
            user.email,
            user.status,
            user.created_at ? user.created_at.toISOString() : '',
            user.last_login_at ? user.last_login_at.toISOString() : ''
        ]);

        const csv = [headers.join(',')]
            .concat(rows.map(row => row.map(csvEscape).join(',')))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        return res.send(csv);
    } catch (error) {
        console.error('Admin Export Error:', error);
        res.status(500).json({ error: 'Failed to export users' });
    }
};
