const { User } = require('../models');

/**
 * 获取所有用户列表
 */
async function getAllUsers(req, res) {
    try {
        const users = User.findAll();
        res.json(users.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name
        })));
    } catch (err) {
        console.error('获取用户列表错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

module.exports = {
    getAllUsers
};
