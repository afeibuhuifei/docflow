const { queryAll, queryOne, run } = require('./database');

/**
 * 通知模型
 */
class Notification {
    /**
     * 创建通知
     */
    static create({ userId, documentId, type, message }) {
        const result = run(`
      INSERT INTO notifications (user_id, document_id, type, message)
      VALUES (?, ?, ?, ?)
    `, [userId, documentId, type, message]);

        return result.lastInsertRowid;
    }

    /**
     * 获取用户的通知列表
     */
    static findByUser(userId, limit = 20) {
        return queryAll(`
      SELECT n.*, d.title as document_title
      FROM notifications n
      LEFT JOIN documents d ON n.document_id = d.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [userId, limit]);
    }

    /**
     * 获取用户未读通知数量
     */
    static countUnread(userId) {
        const result = queryOne(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `, [userId]);
        return result ? result.count : 0;
    }

    /**
     * 标记通知为已读
     */
    static markAsRead(id, userId) {
        run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    }

    /**
     * 标记用户所有通知为已读
     */
    static markAllAsRead(userId) {
        run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    }
}

module.exports = Notification;
