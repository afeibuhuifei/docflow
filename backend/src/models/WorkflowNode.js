const { queryAll, queryOne, run, getDb, saveDatabase } = require('./database');

/**
 * 工作流节点模型
 */
class WorkflowNode {
  /**
   * 批量创建工作流节点
   */
  static createNodes(documentId, nodes) {
    const db = getDb();
    for (const node of nodes) {
      db.run(`
        INSERT INTO workflow_nodes (document_id, step_order, step_type, assignee_id)
        VALUES (?, ?, ?, ?)
      `, [documentId, node.stepOrder, node.stepType, node.assigneeId]);
    }
    saveDatabase();
  }

  /**
   * 获取文档的工作流节点
   */
  static findByDocument(documentId) {
    return queryAll(`
      SELECT wn.*, u.display_name as assignee_name, u.username as assignee_username
      FROM workflow_nodes wn
      LEFT JOIN users u ON wn.assignee_id = u.id
      WHERE wn.document_id = ?
      ORDER BY wn.step_order
    `, [documentId]);
  }

  /**
   * 获取用户的待办任务
   */
  static findPendingTasks(userId) {
    return queryAll(`
      SELECT wn.*, d.title as document_title, d.status as document_status,
             u.display_name as uploader_name
      FROM workflow_nodes wn
      JOIN documents d ON wn.document_id = d.id
      JOIN users u ON d.uploader_id = u.id
      WHERE wn.assignee_id = ? AND wn.status = 'in_progress'
      ORDER BY wn.started_at DESC
    `, [userId]);
  }

  /**
   * 根据ID获取节点
   */
  static findById(id) {
    return queryOne(`
      SELECT wn.*, d.status as document_status, d.uploader_id
      FROM workflow_nodes wn
      JOIN documents d ON wn.document_id = d.id
      WHERE wn.id = ?
    `, [id]);
  }

  /**
   * 获取文档当前活跃的节点
   */
  static findCurrentNode(documentId) {
    return queryOne(`
      SELECT * FROM workflow_nodes 
      WHERE document_id = ? AND status = 'in_progress'
    `, [documentId]);
  }

  /**
   * 获取文档的下一个待处理节点
   */
  static findNextPendingNode(documentId) {
    return queryOne(`
      SELECT * FROM workflow_nodes 
      WHERE document_id = ? AND status = 'pending'
      ORDER BY step_order ASC
      LIMIT 1
    `, [documentId]);
  }

  /**
   * 更新节点状态
   */
  static updateStatus(id, status, comment = null) {
    if (status === 'in_progress') {
      run(`
        UPDATE workflow_nodes SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, id]);
    } else {
      run(`
        UPDATE workflow_nodes SET status = ?, comment = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, comment, id]);
    }
  }

  /**
   * 重置文档的所有工作流节点（用于退回）
   */
  static resetNodes(documentId) {
    run(`
      UPDATE workflow_nodes SET status = 'pending', started_at = NULL, completed_at = NULL, comment = NULL
      WHERE document_id = ?
    `, [documentId]);
  }
}

module.exports = WorkflowNode;
