const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// 获取通知列表
router.get('/', authMiddleware, notificationController.getNotifications);

// 标记单个通知为已读
router.post('/:id/read', authMiddleware, notificationController.markAsRead);

// 标记所有通知为已读
router.post('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;
