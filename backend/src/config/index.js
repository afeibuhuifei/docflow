// 应用配置
module.exports = {
    // 服务器端口
    port: process.env.PORT || 3000,

    // JWT 配置
    jwt: {
        secret: process.env.JWT_SECRET || 'docflow_secret_key_2024',
        expiresIn: '24h'
    },

    // 数据库路径
    database: {
        path: process.env.DB_PATH || '../data/database/docflow.db'
    },

    // 文档存储路径
    storage: {
        documentsPath: process.env.DOCUMENTS_PATH || '../data/documents'
    },

    // OnlyOffice 配置
    onlyoffice: {
        documentServerUrl: process.env.ONLYOFFICE_URL || 'http://localhost:9000',
        callbackUrl: process.env.CALLBACK_URL || 'http://localhost:3000/api/onlyoffice/callback'
    },

    // CORS 配置
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
        credentials: true
    }
};
