const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const onlyofficeController = require('../controllers/onlyofficeController');
const authMiddleware = require('../middleware/auth');

// 配置文件上传
const upload = multer({
    dest: path.resolve(__dirname, '../../uploads/temp'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.doc' || ext === '.docx') {
            cb(null, true);
        } else {
            cb(new Error('只支持 .doc 和 .docx 文件'));
        }
    }
});

// 上传文档
router.post('/upload', authMiddleware, upload.single('file'), documentController.uploadDocument);

// 获取我的文档列表
router.get('/my', authMiddleware, documentController.getMyDocuments);

// 获取文档详情
router.get('/:id', authMiddleware, documentController.getDocument);

// 提交文档
router.post('/:id/submit', authMiddleware, documentController.submitDocument);

// 下载文档
router.get('/:id/download', authMiddleware, documentController.downloadDocument);

// 获取文档文件（供 OnlyOffice 访问）
router.get('/:docId/file', onlyofficeController.getDocumentFile);

// 删除文档
router.delete('/:id', authMiddleware, documentController.deleteDocument);

module.exports = router;
