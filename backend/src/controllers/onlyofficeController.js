const path = require('path');
const config = require('../config');
const { Document } = require('../models');

/**
 * 获取 OnlyOffice 编辑器配置
 */
async function getEditorConfig(req, res) {
    try {
        const { docId } = req.params;
        const doc = Document.findById(docId);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        // 判断当前用户是否可编辑
        // 只有草稿状态的文档上传者，或当前正在处理的审批人可以编辑
        let canEdit = false;
        let mode = 'view';

        if (doc.status === 'draft' && doc.uploader_id === req.user.id) {
            canEdit = true;
            mode = 'edit';
        }

        // 检查是否是当前处理人
        const { WorkflowNode } = require('../models');
        const currentNode = WorkflowNode.findCurrentNode(docId);
        if (currentNode && currentNode.assignee_id === req.user.id) {
            canEdit = true;
            mode = 'edit';
        }

        // 生成文档 key（用于标识文档版本）
        const documentKey = `${doc.stored_filename}_${Date.now()}`;

        // 确定文档类型
        const ext = path.extname(doc.original_filename).toLowerCase();
        const documentType = 'word'; // .doc 和 .docx 都是 word 类型

        // 获取前端可访问的文件 URL
        const fileUrl = `${req.protocol}://${req.get('host')}/api/documents/${docId}/file`;

        const editorConfig = {
            document: {
                fileType: ext.substring(1), // 去掉点号
                key: documentKey,
                title: doc.original_filename,
                url: fileUrl
            },
            documentType: documentType,
            editorConfig: {
                mode: mode,
                callbackUrl: `${req.protocol}://${req.get('host')}/api/onlyoffice/callback?docId=${docId}`,
                user: {
                    id: String(req.user.id),
                    name: req.user.username
                },
                customization: {
                    autosave: true,
                    chat: false,
                    comments: true,
                    compactHeader: false,
                    compactToolbar: false,
                    feedback: false,
                    forcesave: true,
                    help: false,
                    hideRightMenu: false,
                    showReviewChanges: true,
                    trackChanges: true
                },
                lang: 'zh-CN'
            },
            width: '100%',
            height: '100%'
        };

        res.json({
            config: editorConfig,
            documentServerUrl: config.onlyoffice.documentServerUrl
        });
    } catch (err) {
        console.error('获取编辑器配置错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * 获取文档文件（供 OnlyOffice 访问）
 */
async function getDocumentFile(req, res) {
    try {
        const { docId } = req.params;
        const doc = Document.findById(docId);

        if (!doc) {
            return res.status(404).json({ error: '文档不存在' });
        }

        const absoluteFilePath = path.resolve(__dirname, '..', doc.file_path);
        res.sendFile(absoluteFilePath);
    } catch (err) {
        console.error('获取文档文件错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

/**
 * OnlyOffice 保存回调
 */
async function handleCallback(req, res) {
    try {
        const { docId } = req.query;
        const { status, url } = req.body;

        console.log('OnlyOffice 回调:', { docId, status, url });

        // status = 2 表示文档已保存并关闭
        // status = 6 表示文档正在编辑中保存
        if (status === 2 || status === 6) {
            if (url) {
                const doc = Document.findById(docId);
                if (doc) {
                    // 从 OnlyOffice 下载最新文档并保存
                    const https = require('https');
                    const http = require('http');
                    const fs = require('fs');

                    const absoluteFilePath = path.resolve(__dirname, '..', doc.file_path);
                    const file = fs.createWriteStream(absoluteFilePath);

                    const protocol = url.startsWith('https') ? https : http;
                    protocol.get(url, (response) => {
                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            console.log('文档已保存:', docId);
                        });
                    }).on('error', (err) => {
                        console.error('下载文档错误:', err);
                    });
                }
            }
        }

        // OnlyOffice 期望的响应格式
        res.json({ error: 0 });
    } catch (err) {
        console.error('处理回调错误:', err);
        res.json({ error: 0 }); // 即使出错也返回成功，避免 OnlyOffice 重试
    }
}

module.exports = {
    getEditorConfig,
    getDocumentFile,
    handleCallback
};
