const { queryAll, queryOne, run } = require('./database');

/**
 * 文档模型
 */
class Document {
  /**
   * 创建文档
   */
  static create({ title, originalFilename, storedFilename, filePath, uploaderId }) {
    const result = run(`
      INSERT INTO documents (title, original_filename, stored_filename, file_path, uploader_id)
      VALUES (?, ?, ?, ?, ?)
    `, [title, originalFilename, storedFilename, filePath, uploaderId]);

    return result.lastInsertRowid;
  }

  /**
   * 根据ID查找文档
   */
  static findById(id) {
    return queryOne(`
      SELECT d.*, u.username as uploader_username, u.display_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      WHERE d.id = ?
    `, [id]);
  }

  /**
   * 获取用户上传的文档列表
   */
  static findByUploader(uploaderId) {
    return queryAll(`
      SELECT d.*, u.display_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      WHERE d.uploader_id = ?
      ORDER BY d.created_at DESC
    `, [uploaderId]);
  }

  /**
   * 获取归档文档列表
   */
  static findArchived(searchParams = {}) {
    let sql = `
      SELECT d.*, u.display_name as uploader_name
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      WHERE d.status = 'archived'
    `;
    const params = [];

    if (searchParams.title) {
      sql += ' AND d.title LIKE ?';
      params.push(`%${searchParams.title}%`);
    }

    if (searchParams.uploaderId) {
      sql += ' AND d.uploader_id = ?';
      params.push(searchParams.uploaderId);
    }

    sql += ' ORDER BY d.archived_at DESC';

    return queryAll(sql, params);
  }

  /**
   * 更新文档状态
   */
  static updateStatus(id, status) {
    if (status === 'archived') {
      run(`
        UPDATE documents SET status = ?, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, id]);
    } else {
      run(`
        UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, id]);
    }
  }

  /**
   * 删除文档
   */
  static delete(id) {
    return run('DELETE FROM documents WHERE id = ?', [id]);
  }
}

module.exports = Document;
