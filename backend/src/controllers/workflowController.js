const { Document, WorkflowNode, Notification } = require('../models');

// WebSocket 实例
let io = null;

function setSocketIO(socketIO) {
    io = socketIO;
}

/**
 * 获取当前用户待办任务
 */
async function getPendingTasks(req, res) {
    try {
        const tasks = WorkflowNode.findPendingTasks(req.user.id);
        res.json(tasks.map(t => ({
            id: t.id,
            documentId: t.document_id,
            documentTitle: t.document_title,
            stepType: t.step_type,
            uploaderName: t.uploader_name,
            startedAt: t.started_at
        })));
    } catch (err) {
        console.error('获取待办任务错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 通过任务节点
 */
async function approveTask(req, res) {
    try {
        const { nodeId } = req.params;
        const { comment } = req.body;

        const node = WorkflowNode.findById(nodeId);

        if (!node) {
            return res.status(404).json({ error: '任务不存在' });
        }

        if (node.assignee_id !== req.user.id) {
            return res.status(403).json({ error: '无权操作此任务' });
        }

        if (node.status !== 'in_progress') {
            return res.status(400).json({ error: '任务状态无效' });
        }

        // 更新当前节点状态
        WorkflowNode.updateStatus(nodeId, 'approved', comment || null);

        // 获取文档信息
        const doc = Document.findById(node.document_id);

        // 查找下一个节点
        const nextNode = WorkflowNode.findNextPendingNode(node.document_id);

        if (nextNode) {
            // 激活下一个节点
            WorkflowNode.updateStatus(nextNode.id, 'in_progress');

            // 更新文档状态
            const nextStatus = nextNode.step_type === 'approve' ? 'approving' : 'proofreading';
            Document.updateStatus(node.document_id, nextStatus);

            // 发送通知给下一个处理人
            const notificationId = Notification.create({
                userId: nextNode.assignee_id,
                documentId: node.document_id,
                type: 'task_assigned',
                message: `您有新的${nextNode.step_type === 'approve' ? '批准' : '校对'}任务: ${doc.title}`
            });

            if (io) {
                io.to(`user_${nextNode.assignee_id}`).emit('notification', {
                    id: notificationId,
                    type: 'task_assigned',
                    message: `您有新的${nextNode.step_type === 'approve' ? '批准' : '校对'}任务: ${doc.title}`,
                    documentId: node.document_id
                });
            }
        } else {
            // 流程已完成，归档文档
            Document.updateStatus(node.document_id, 'archived');

            // 通知上传者
            const notificationId = Notification.create({
                userId: doc.uploader_id,
                documentId: node.document_id,
                type: 'doc_archived',
                message: `您的文档已完成审批并归档: ${doc.title}`
            });

            if (io) {
                io.to(`user_${doc.uploader_id}`).emit('notification', {
                    id: notificationId,
                    type: 'doc_archived',
                    message: `您的文档已完成审批并归档: ${doc.title}`,
                    documentId: node.document_id
                });
            }
        }

        res.json({ message: '已通过' });
    } catch (err) {
        console.error('通过任务错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 退回任务
 */
async function rejectTask(req, res) {
    try {
        const { nodeId } = req.params;
        const { comment } = req.body;

        const node = WorkflowNode.findById(nodeId);

        if (!node) {
            return res.status(404).json({ error: '任务不存在' });
        }

        if (node.assignee_id !== req.user.id) {
            return res.status(403).json({ error: '无权操作此任务' });
        }

        if (node.status !== 'in_progress') {
            return res.status(400).json({ error: '任务状态无效' });
        }

        // 更新当前节点状态
        WorkflowNode.updateStatus(nodeId, 'rejected', comment);

        // 重置所有节点
        WorkflowNode.resetNodes(node.document_id);

        // 更新文档状态为草稿
        Document.updateStatus(node.document_id, 'draft');

        // 获取文档信息
        const doc = Document.findById(node.document_id);

        // 通知上传者
        const messageText = comment
            ? `您的文档被退回: ${doc.title}，原因: ${comment}`
            : `您的文档被退回: ${doc.title}`;
        const notificationId = Notification.create({
            userId: doc.uploader_id,
            documentId: node.document_id,
            type: 'doc_rejected',
            message: messageText
        });

        if (io) {
            io.to(`user_${doc.uploader_id}`).emit('notification', {
                id: notificationId,
                type: 'doc_rejected',
                message: `您的文档被退回: ${doc.title}`,
                documentId: node.document_id
            });
        }

        res.json({ message: '已退回' });
    } catch (err) {
        console.error('退回任务错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

module.exports = {
    getPendingTasks,
    approveTask,
    rejectTask,
    setSocketIO
};
