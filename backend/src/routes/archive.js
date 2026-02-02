const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const authMiddleware = require('../middleware/auth');

// 查询归档文档列表
router.get('/', authMiddleware, archiveController.getArchivedDocuments);

module.exports = router;
