const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { database } = require('./models');
const {
    authRoutes,
    usersRoutes,
    documentsRoutes,
    tasksRoutes,
    archiveRoutes,
    notificationsRoutes,
    onlyofficeRoutes
} = require('./routes');

// 注入 WebSocket 到控制器
const documentController = require('./controllers/documentController');
const workflowController = require('./controllers/workflowController');

// 初始化 Express 应用
const app = express();
const server = http.createServer(app);

// 初始化 Socket.IO
const io = new Server(server, {
    cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// 设置 WebSocket 实例到控制器
documentController.setSocketIO(io);
workflowController.setSocketIO(io);

// WebSocket 连接处理
io.on('connection', (socket) => {
    console.log('WebSocket 客户端已连接:', socket.id);

    // 用户加入自己的房间
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`用户 ${userId} 加入房间`);
    });

    socket.on('disconnect', () => {
        console.log('WebSocket 客户端已断开:', socket.id);
    });
});

// 中间件
app.use(cors({
    origin: config.cors.origin,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保临时上传目录存在
const tempUploadDir = path.resolve(__dirname, '../uploads/temp');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/onlyoffice', onlyofficeRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);

    if (err.message === '只支持 .doc 和 .docx 文件') {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: '服务器内部错误' });
});

// 初始化数据库并启动服务器
try {
    database.initialize();

    server.listen(config.port, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     DocFlow 文档流程协作系统 - 后端服务已启动            ║
║                                                           ║
║     API 地址: http://localhost:${config.port}                   ║
║     WebSocket: ws://localhost:${config.port}                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
    });
} catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    database.close();
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

module.exports = { app, server, io };
