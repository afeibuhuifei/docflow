<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon pending">
          <el-icon :size="20"><Bell /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.pendingTasks }}</span>
          <span class="stat-label">待办任务</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon processing">
          <el-icon :size="20"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.processingDocs }}</span>
          <span class="stat-label">流转中</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon archived">
          <el-icon :size="20"><FolderChecked /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.archivedDocs }}</span>
          <span class="stat-label">已归档</span>
        </div>
      </div>
    </div>
    
    <!-- 内容区 -->
    <div class="content-row">
      <!-- 待办任务 -->
      <div class="content-card">
        <div class="card-header">
          <h3>我的待办</h3>
          <button class="link-btn" @click="$router.push('/tasks')">查看全部</button>
        </div>
        
        <div v-if="pendingTasks.length === 0" class="empty-state">
          暂无待办任务
        </div>
        
        <div class="list">
          <div 
            v-for="task in pendingTasks.slice(0, 5)" 
            :key="task.id" 
            class="list-item"
            @click="$router.push(`/document/${task.documentId}`)"
          >
            <div class="item-main">
              <span class="item-title">{{ task.documentTitle }}</span>
              <span class="item-badge" :class="task.stepType">
                {{ task.stepType === 'proofread' ? '待校对' : '待批准' }}
              </span>
            </div>
            <span class="item-time">{{ formatTime(task.startedAt) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 我发起的 -->
      <div class="content-card">
        <div class="card-header">
          <h3>我发起的</h3>
          <button class="link-btn" @click="$router.push('/my-documents')">查看全部</button>
        </div>
        
        <div v-if="myDocuments.length === 0" class="empty-state">
          暂无文档
        </div>
        
        <div class="list">
          <div 
            v-for="doc in myDocuments.slice(0, 5)" 
            :key="doc.id" 
            class="list-item"
            @click="$router.push(`/document/${doc.id}`)"
          >
            <div class="item-main">
              <span class="item-title">{{ doc.title }}</span>
              <span class="item-badge" :class="doc.status">
                {{ getStatusText(doc.status) }}
              </span>
            </div>
            <span class="item-time">{{ formatTime(doc.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Bell, Document, FolderChecked } from '@element-plus/icons-vue'
import api from '../api'

const stats = ref({
  pendingTasks: 0,
  processingDocs: 0,
  archivedDocs: 0
})

const pendingTasks = ref([])
const myDocuments = ref([])

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN')
}

function getStatusText(status) {
  const texts = {
    draft: '草稿',
    proofreading: '校对中',
    approving: '批准中',
    archived: '已归档',
    rejected: '已退回'
  }
  return texts[status] || status
}

onMounted(async () => {
  try {
    const [tasks, docs, archived] = await Promise.all([
      api.tasks.pending(),
      api.documents.list(),
      api.archive.list()
    ])
    
    pendingTasks.value = tasks
    myDocuments.value = docs
    
    stats.value.pendingTasks = tasks.length
    stats.value.processingDocs = docs.filter(d => ['proofreading', 'approving'].includes(d.status)).length
    stats.value.archivedDocs = archived.length
  } catch (e) {
    console.error('加载数据失败', e)
  }
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.pending { background: var(--color-warning); }
.stat-icon.processing { background: var(--color-accent); }
.stat-icon.archived { background: var(--color-success); }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}

/* 内容区 */
.content-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.content-card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.card-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.list {
  padding: 0;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: var(--transition-fast);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--color-bg-tertiary);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.item-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.item-badge.proofread, .item-badge.proofreading { 
  background: var(--color-warning-light); 
  color: var(--color-warning); 
}
.item-badge.approve, .item-badge.approving { 
  background: var(--color-accent-light); 
  color: var(--color-accent); 
}
.item-badge.draft { 
  background: var(--color-bg-tertiary); 
  color: var(--color-text-secondary); 
}
.item-badge.archived { 
  background: var(--color-success-light); 
  color: var(--color-success); 
}
.item-badge.rejected { 
  background: var(--color-danger-light); 
  color: var(--color-danger); 
}

.item-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
