const { queryAll, queryOne } = require('./database');

/**
 * 用户模型
 */
class User {
    /**
     * 根据用户名查找用户
     */
    static findByUsername(username) {
        return queryOne('SELECT * FROM users WHERE username = ?', [username]);
    }

    /**
     * 根据ID查找用户
     */
    static findById(id) {
        return queryOne('SELECT id, username, display_name, created_at FROM users WHERE id = ?', [id]);
    }

    /**
     * 获取所有用户列表（不含密码）
     */
    static findAll() {
        return queryAll('SELECT id, username, display_name, created_at FROM users');
    }
}

module.exports = User;
