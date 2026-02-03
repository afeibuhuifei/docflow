const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { Document, WorkflowNode, Notification } = require('../models');

// 修复 multer 中文文件名编码问题
function decodeFilename(filename) {
    try {
        // multer 将文件名按 Latin-1 解码，需要转回 UTF-8
        return Buffer.from(filename, 'latin1').toString('utf8');
    } catch (e) {
        return filename;
    }
}

// WebSocket 实例 (将在 index.js 中设置)
let io = null;

function setSocketIO(socketIO) {
    io = socketIO;
}

/**
 * 上传文档并创建工作流
 */
async function uploadDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传文件' });
        }

        const { title, proofreader_id, approver_id } = req.body;

        if (!title) {
            return res.status(400).json({ error: '请输入文档标题' });
        }

        if (!proofreader_id || !approver_id) {
            return res.status(400).json({ error: '请选择校对人员和批准人员' });
        }

        // 修复中文文件名编码
        const originalFilename = decodeFilename(req.file.originalname);

        // 生成存储文件名
        const ext = path.extname(originalFilename);
        const storedFilename = `${uuidv4()}${ext}`;
        const filePath = path.join(config.storage.documentsPath, storedFilename);

        // 确保目录存在
        const absoluteStoragePath = path.resolve(__dirname, '..', config.storage.documentsPath);
        if (!fs.existsSync(absoluteStoragePath)) {
            fs.mkdirSync(absoluteStoragePath, { recursive: true });
        }

        // 移动文件
        const absoluteFilePath = path.resolve(__dirname, '..', filePath);
        fs.renameSync(req.file.path, absoluteFilePath);

        // 创建文档记录
        const documentId = Document.create({
            title,
            originalFilename: originalFilename,
            storedFilename,
            filePath,
            uploaderId: req.user.id
        });

        // 创建工作流节点
        WorkflowNode.createNodes(documentId, [
            { stepOrder: 1, stepType: 'proofread', assigneeId: parseInt(proofreader_id) },
            { stepOrder: 2, stepType: 'approve', assigneeId: parseInt(approver_id) }
        ]);

        res.json({
            id: documentId,
            message: '文档上传成功'
        });
    } catch (err) {
        console.error('上传文档错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 提交文档开始流转
 */
async function submitDocument(req, res) {
    try {
        const { id } = req.params;
        const doc = Document.findById(id);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        if (doc.uploader_id !== req.user.id) {
            return res.status(403).json({ error: '无权操作此文档' });
        }

        if (doc.status !== 'draft') {
            return res.status(400).json({ error: '只能提交草稿状态的文档' });
        }

        // 更新文档状态
        Document.updateStatus(id, 'proofreading');

        // 激活第一个工作流节点
        const firstNode = WorkflowNode.findNextPendingNode(id);
        if (firstNode) {
            WorkflowNode.updateStatus(firstNode.id, 'in_progress');

            // 发送通知
            const notificationId = Notification.create({
                userId: firstNode.assignee_id,
                documentId: id,
                type: 'task_assigned',
                message: `您有新的校对任务: ${doc.title}`
            });

            // WebSocket 实时推送
            if (io) {
                io.to(`user_${firstNode.assignee_id}`).emit('notification', {
                    id: notificationId,
                    type: 'task_assigned',
                    message: `您有新的校对任务: ${doc.title}`,
                    documentId: id
                });
            }
        }

        res.json({ message: '文档已提交' });
    } catch (err) {
        console.error('提交文档错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 获取用户上传的文档列表
 */
async function getMyDocuments(req, res) {
    try {
        const documents = Document.findByUploader(req.user.id);
        const result = documents.map(d => {
            // 获取该文档的工作流节点
            const nodes = WorkflowNode.findByDocument(d.id);
            return {
                id: d.id,
                title: d.title,
                originalFilename: d.original_filename,
                status: d.status,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
                workflow: nodes.map(n => ({
                    id: n.id,
                    stepType: n.step_type,
                    assigneeName: n.assignee_name,
                    status: n.status
                }))
            };
        });
        res.json(result);
    } catch (err) {
        console.error('获取文档列表错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 获取文档详情
 */
async function getDocument(req, res) {
    try {
        const { id } = req.params;
        const doc = Document.findById(id);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        // 获取工作流节点
        const nodes = WorkflowNode.findByDocument(id);

        res.json({
            id: doc.id,
            title: doc.title,
            originalFilename: doc.original_filename,
            status: doc.status,
            uploaderName: doc.uploader_name,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            archivedAt: doc.archived_at,
            workflow: nodes.map(n => ({
                id: n.id,
                stepOrder: n.step_order,
                stepType: n.step_type,
                assigneeName: n.assignee_name,
                status: n.status,
                comment: n.comment,
                startedAt: n.started_at,
                completedAt: n.completed_at
            }))
        });
    } catch (err) {
        console.error('获取文档详情错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 下载文档
 */
async function downloadDocument(req, res) {
    try {
        const { id } = req.params;
        const doc = Document.findById(id);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        const absoluteFilePath = path.resolve(__dirname, '..', doc.file_path);

        if (!fs.existsSync(absoluteFilePath)) {
            return res.status(404).json({ error: '文件不存在' });
        }

        res.download(absoluteFilePath, doc.original_filename);
    } catch (err) {
        console.error('下载文档错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 删除文档
 */
async function deleteDocument(req, res) {
    try {
        const { id } = req.params;
        const doc = Document.findById(id);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        if (doc.uploader_id !== req.user.id) {
            return res.status(403).json({ error: '无权删除此文档' });
        }

        if (doc.status !== 'draft') {
            return res.status(400).json({ error: '只能删除草稿状态的文档' });
        }

        // 删除文件
        const absoluteFilePath = path.resolve(__dirname, '..', doc.file_path);
        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
        }

        // 删除数据库记录
        Document.delete(id);

        res.json({ message: '文档已删除' });
    } catch (err) {
        console.error('删除文档错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

module.exports = {
    uploadDocument,
    submitDocument,
    getMyDocuments,
    getDocument,
    downloadDocument,
    deleteDocument,
    setSocketIO
};
