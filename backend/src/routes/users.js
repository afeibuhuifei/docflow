const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// 获取所有用户列表
router.get('/', authMiddleware, userController.getAllUsers);

module.exports = router;
