const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

// 数据库实例
let db = null;
let SQL = null;

/**
 * 初始化数据库连接和表结构
 */
async function initialize() {
  SQL = await initSqlJs();

  const dbPath = path.resolve(__dirname, '..', config.database.path);
  const dbDir = path.dirname(dbPath);

  // 确保数据库目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 如果数据库文件存在，加载它
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表结构
  createTables();

  // 初始化测试用户
  initTestUsers();

  // 保存数据库
  saveDatabase();

  console.log('数据库初始化完成');
  return db;
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  if (db) {
    const dbPath = path.resolve(__dirname, '..', config.database.path);
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * 创建数据库表
 */
function createTables() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 文档表
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploader_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'proofreading', 'approving', 'archived', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    )
  `);

  // 工作流节点表
  db.run(`
    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      step_type TEXT NOT NULL CHECK(step_type IN ('proofread', 'approve')),
      assignee_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'approved', 'rejected')),
      comment TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    )
  `);

  // 批注表
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      workflow_node_id INTEGER,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_node_id) REFERENCES workflow_nodes(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 通知表
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      document_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('task_assigned', 'task_completed', 'doc_rejected', 'doc_archived')),
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);
}

/**
 * 初始化测试用户
 */
function initTestUsers() {
  const testUsers = [
    { username: '111', password: '123', display_name: '111' },
    { username: '222', password: '123', display_name: '222' },
    { username: '333', password: '123', display_name: '333' }
  ];

  for (const user of testUsers) {
    // 检查用户是否已存在
    const existing = db.exec(`SELECT id FROM users WHERE username = '${user.username}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      const hash = bcrypt.hashSync(user.password, 10);
      db.run(`INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)`,
        [user.username, hash, user.display_name]);
    }
  }
  saveDatabase();
}

/**
 * 获取数据库实例
 */
function getDb() {
  if (!db) {
    throw new Error('数据库尚未初始化');
  }
  return db;
}

/**
 * 执行查询并返回所有结果
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * 执行查询并返回第一条结果
 */
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * 执行插入/更新/删除操作
 */
function run(sql, params = []) {
  db.run(sql, params);
  // 获取 last_insert_rowid - 必须在 saveDatabase 之前获取
  const result = db.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 0;
  const changes = db.getRowsModified();
  saveDatabase();
  return {
    lastInsertRowid: lastId,
    changes: changes
  };
}

/**
 * 关闭数据库连接
 */
function close() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

module.exports = {
  initialize,
  getDb,
  queryAll,
  queryOne,
  run,
  close,
  saveDatabase
};
