const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const authMiddleware = require('../middleware/auth');

// 获取待办任务
router.get('/pending', authMiddleware, workflowController.getPendingTasks);

// 通过任务
router.post('/:nodeId/approve', authMiddleware, workflowController.approveTask);

// 退回任务
router.post('/:nodeId/reject', authMiddleware, workflowController.rejectTask);

module.exports = router;
