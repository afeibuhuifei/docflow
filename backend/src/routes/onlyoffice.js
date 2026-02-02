const express = require('express');
const router = express.Router();
const onlyofficeController = require('../controllers/onlyofficeController');
const authMiddleware = require('../middleware/auth');

// 获取编辑器配置
router.get('/config/:docId', authMiddleware, onlyofficeController.getEditorConfig);

// OnlyOffice 保存回调（不需要认证，由 OnlyOffice 服务调用）
router.post('/callback', onlyofficeController.handleCallback);

module.exports = router;
