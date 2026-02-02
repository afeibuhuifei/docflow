const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

/**
 * 用户登录
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 查找用户
        const user = User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 验证密码
        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成 JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name
            }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 获取当前用户信息
 */
async function getCurrentUser(req, res) {
    try {
        const user = User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            createdAt: user.created_at
        });
    } catch (err) {
        console.error('获取用户信息错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 用户登出（客户端删除 token 即可）
 */
async function logout(req, res) {
    res.json({ message: '登出成功' });
}

module.exports = {
    login,
    getCurrentUser,
    logout
};
