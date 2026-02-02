<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon pending">
            <el-icon :size="32"><Bell /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pendingTasks }}</div>
            <div class="stat-label">待办任务</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon processing">
            <el-icon :size="32"><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.processingDocs }}</div>
            <div class="stat-label">流转中文档</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon archived">
            <el-icon :size="32"><FolderChecked /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.archivedDocs }}</div>
            <div class="stat-label">已归档文档</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>我的待办</span>
              <el-button type="primary" link @click="$router.push('/tasks')">查看全部</el-button>
            </div>
          </template>
          
          <div v-if="pendingTasks.length === 0" class="empty-tip">暂无待办任务</div>
          
          <div v-for="task in pendingTasks.slice(0, 5)" :key="task.id" class="task-item" @click="$router.push(`/document/${task.documentId}`)">
            <div class="task-info">
              <span class="task-title">{{ task.documentTitle }}</span>
              <el-tag size="small" :type="task.stepType === 'proofread' ? 'warning' : 'success'">
                {{ task.stepType === 'proofread' ? '待校对' : '待批准' }}
              </el-tag>
            </div>
            <span class="task-time">{{ formatTime(task.startedAt) }}</span>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>我发起的文档</span>
              <el-button type="primary" link @click="$router.push('/my-documents')">查看全部</el-button>
            </div>
          </template>
          
          <div v-if="myDocuments.length === 0" class="empty-tip">暂无文档</div>
          
          <div v-for="doc in myDocuments.slice(0, 5)" :key="doc.id" class="doc-item" @click="$router.push(`/document/${doc.id}`)">
            <div class="doc-info">
              <span class="doc-title">{{ doc.title }}</span>
              <el-tag size="small" :type="getStatusType(doc.status)">
                {{ getStatusText(doc.status) }}
              </el-tag>
            </div>
            <span class="doc-time">{{ formatTime(doc.createdAt) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
  return new Date(time).toLocaleString('zh-CN')
}

function getStatusType(status) {
  const types = {
    draft: 'info',
    proofreading: 'warning',
    approving: '',
    archived: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
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
.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.processing { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.archived { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.stat-content {
  margin-left: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.task-item, .doc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.task-item:hover, .doc-item:hover {
  background-color: #fafafa;
  margin: 0 -20px;
  padding: 12px 20px;
}

.task-item:last-child, .doc-item:last-child {
  border-bottom: none;
}

.task-info, .doc-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-title, .doc-title {
  font-size: 14px;
  color: #333;
}

.task-time, .doc-time {
  font-size: 12px;
  color: #999;
}
</style>
