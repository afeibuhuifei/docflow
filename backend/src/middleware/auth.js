const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
    // 获取 Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: '未提供认证令牌',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.substring(7);

    try {
        // 验证 token
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: '认证令牌已过期',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            error: '无效的认证令牌',
            code: 'INVALID_TOKEN'
        });
    }
}

module.exports = authMiddleware;
