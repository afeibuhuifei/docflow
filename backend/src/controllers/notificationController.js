const { Notification } = require('../models');

/**
 * 获取用户通知列表
 */
async function getNotifications(req, res) {
    try {
        const notifications = Notification.findByUser(req.user.id);
        const unreadCount = Notification.countUnread(req.user.id);

        res.json({
            notifications: notifications.map(n => ({
                id: n.id,
                type: n.type,
                message: n.message,
                documentId: n.document_id,
                documentTitle: n.document_title,
                isRead: n.is_read === 1,
                createdAt: n.created_at
            })),
            unreadCount
        });
    } catch (err) {
        console.error('获取通知错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 标记单个通知为已读
 */
async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        Notification.markAsRead(id, req.user.id);
        res.json({ message: '已标记为已读' });
    } catch (err) {
        console.error('标记通知已读错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 标记所有通知为已读
 */
async function markAllAsRead(req, res) {
    try {
        Notification.markAllAsRead(req.user.id);
        res.json({ message: '已全部标记为已读' });
    } catch (err) {
        console.error('标记所有通知已读错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
