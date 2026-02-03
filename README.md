# DocFlow 文档流程协作系统

一个局域网内部署的文档流程协作工具，支持 Word 文档的上传、流转、批注、审批和归档。

## 功能特点

- ✅ 全新现代化 UI 设计（全中文界面）
- ✅ 用户登录认证（预置测试用户：111/222/333，密码：123）
- ✅ Word 文档上传（支持 .doc 和 .docx）
- ✅ 可视化工作流：直观展示上传者 → 校对人员 → 批准人员的节点进度
- ✅ OnlyOffice 深度集成：
    - 支持在线编辑、批注
    - 支持文档快速预览（只读模式）
    - 智能识别文档格式兼容性
- ✅ WebSocket 实时通知与跳转
- ✅ 文档归档与查询

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Element Plus + Pinia |
| 后端 | Node.js + Express + Socket.IO |
| 数据库 | SQLite (sql.js) |
| 文档服务 | OnlyOffice Document Server |
| 部署 | Docker + Docker Compose |

## 快速开始

### 方式一：Docker 部署（推荐）

1. 确保已安装 Docker Desktop
2. 在项目根目录运行：

```bash
docker-compose up -d
```

3. 访问 http://localhost:8080

### 方式二：开发模式

1. 启动 OnlyOffice（需要 Docker）：

```bash
docker run -d -p 9000:80 --name onlyoffice onlyoffice/documentserver
```

2. 启动后端：

```bash
cd backend
npm install
npm run dev
```

3. 启动前端：

```bash
cd frontend
npm install
npm run dev
```

4. 访问 http://localhost:8080

## 测试账号

| 用户名 | 密码 | 说明 |
|--------|------|------|
| 111 | 123 | 测试用户一 |
| 222 | 123 | 测试用户二 |
| 333 | 123 | 测试用户三 |

## 使用流程

1. **上传文档**：用户登录后，在「我发起的」页面上传 Word 文档
2. **选择审批人**：上传时选择校对人员和批准人员
3. **文档流转**：文档自动流转至校对人员
4. **校对/批注**：校对人员可在线编辑、添加批注，然后通过或退回
5. **批准**：校对通过后流转至批准人员
6. **归档**：批准通过后自动归档，所有人可查询和下载

## 项目结构

```
docflow/
├── docker-compose.yml      # Docker 编排配置
├── backend/                # 后端代码
│   ├── src/
│   │   ├── config/        # 配置
│   │   ├── controllers/   # 控制器
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # 路由
│   │   └── middleware/    # 中间件
│   └── package.json
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api/           # API 封装
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # 状态管理
│   │   └── views/         # 页面组件
│   └── package.json
└── data/                   # 数据存储
    ├── documents/         # 上传的文档
    └── database/          # SQLite 数据库
```

## 注意事项

1. OnlyOffice Document Server 需要一定时间启动（约1-2分钟）
2. 首次使用时请确保 9000 端口可访问
3. 文档编辑需要 OnlyOffice 服务正常运行

## License

MIT
