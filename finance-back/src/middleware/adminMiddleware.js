const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    return next();
};

module.exports = adminMiddleware;
