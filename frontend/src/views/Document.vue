<template>
  <div class="document-page" v-loading="loading">
    <div v-if="document" class="document-container">
      <!-- 文档信息卡片 -->
      <el-card class="info-card">
        <div class="doc-header">
          <div class="doc-info">
            <h2>{{ document.title }}</h2>
            <div class="doc-meta">
              <span>上传者: {{ document.uploaderName }}</span>
              <span>创建时间: {{ formatTime(document.createdAt) }}</span>
              <el-tag :type="getStatusType(document.status)">
                {{ getStatusText(document.status) }}
              </el-tag>
            </div>
          </div>
          
          <div class="doc-actions">
            <el-button type="info" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <template v-if="currentTask">
              <el-button type="success" @click="handleApprove">
                <el-icon><Check /></el-icon>
                通过
              </el-button>
              <el-button type="danger" @click="showRejectDialog = true">
                <el-icon><Close /></el-icon>
                退回
              </el-button>
            </template>
          </div>
        </div>
        
        <!-- 工作流进度 -->
        <div class="workflow-progress">
          <el-steps :active="activeStep" finish-status="success">
            <el-step title="上传" :description="document.uploaderName" />
            <el-step 
              v-for="node in document.workflow" 
              :key="node.id"
              :title="node.stepType === 'proofread' ? '校对' : '批准'"
              :description="node.assigneeName"
              :status="getStepStatus(node)"
            />
          </el-steps>
        </div>
        
        <!-- 历史批注 -->
        <div v-if="rejectionHistory.length > 0" class="rejection-history">
          <h4>历史批注</h4>
          <div v-for="(item, index) in rejectionHistory" :key="index" class="rejection-item">
            <el-tag type="danger" size="small">{{ item.stepType === 'proofread' ? '校对' : '批准' }}</el-tag>
            <span class="rejection-user">{{ item.assigneeName }}:</span>
            <span class="rejection-comment">{{ item.comment }}</span>
          </div>
        </div>
      </el-card>
      
      <!-- 文档预览 -->
      <el-card class="preview-card">
        <template #header>
          <div class="preview-header">
            <span>文档预览</span>
            <el-alert 
              v-if="previewError" 
              :title="previewError" 
              type="warning" 
              show-icon 
              :closable="false"
              style="margin-left: 20px;"
            />
          </div>
        </template>
        <div ref="previewContainer" class="preview-container"></div>
      </el-card>
    </div>
    
    <!-- 退回对话框 -->
    <el-dialog v-model="showRejectDialog" title="退回文档" width="400px">
      <el-form>
        <el-form-item label="退回原因">
          <el-input 
            v-model="rejectComment" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入退回原因（必填）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" :loading="rejecting" @click="handleReject">
          确认退回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, Close, Download } from '@element-plus/icons-vue'
import { renderAsync } from 'docx-preview'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const document = ref(null)
const loading = ref(true)
const previewContainer = ref(null)
const previewError = ref('')
const showRejectDialog = ref(false)
const rejectComment = ref('')
const rejecting = ref(false)

const currentTask = computed(() => {
  if (!document.value?.workflow) return null
  return document.value.workflow.find(
    node => node.status === 'in_progress' && node.assigneeName === authStore.user?.username
  )
})

const activeStep = computed(() => {
  if (!document.value?.workflow) return 0
  const inProgressIndex = document.value.workflow.findIndex(n => n.status === 'in_progress')
  if (inProgressIndex >= 0) return inProgressIndex + 1
  const allApproved = document.value.workflow.every(n => n.status === 'approved')
  if (allApproved) return document.value.workflow.length + 1
  return 1
})

const rejectionHistory = computed(() => {
  if (!document.value?.workflow) return []
  return document.value.workflow.filter(n => n.comment)
})

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

function getStepStatus(node) {
  if (node.status === 'approved') return 'success'
  if (node.status === 'rejected') return 'error'
  if (node.status === 'in_progress') return 'process'
  return 'wait'
}

async function loadDocumentPreview() {
  try {
    previewError.value = ''
    const token = localStorage.getItem('token')
    
    // 获取文档文件
    const response = await fetch(`http://localhost:3000/api/documents/${route.params.id}/file`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('无法加载文档')
    }
    
    const blob = await response.blob()
    
    // 检查是否为 .doc 格式
    if (document.value.originalFilename?.endsWith('.doc')) {
      previewError.value = '.doc 格式暂不支持在线预览，请下载后使用 Word 打开'
      return
    }
    
    // 使用 docx-preview 渲染
    if (previewContainer.value) {
      await renderAsync(blob, previewContainer.value, null, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      })
    }
  } catch (e) {
    console.error('文档预览加载失败', e)
    previewError.value = '文档预览加载失败，请尝试下载查看'
  }
}

function handleDownload() {
  const token = localStorage.getItem('token')
  const url = `http://localhost:3000/api/documents/${route.params.id}/download`
  
  // 创建一个临时链接下载
  fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.value.originalFilename
      a.click()
      window.URL.revokeObjectURL(url)
    })
    .catch(e => {
      ElMessage.error('下载失败')
    })
}

async function handleApprove() {
  if (!currentTask.value) return
  
  try {
    await api.tasks.approve(currentTask.value.id)
    ElMessage.success('已通过')
    router.push('/tasks')
  } catch (e) {
    ElMessage.error(e.error || '操作失败')
  }
}

async function handleReject() {
  if (!currentTask.value) return
  
  if (!rejectComment.value.trim()) {
    ElMessage.warning('请输入退回原因')
    return
  }
  
  rejecting.value = true
  try {
    await api.tasks.reject(currentTask.value.id, rejectComment.value)
    ElMessage.success('已退回')
    showRejectDialog.value = false
    router.push('/tasks')
  } catch (e) {
    ElMessage.error(e.error || '操作失败')
  } finally {
    rejecting.value = false
  }
}

onMounted(async () => {
  try {
    document.value = await api.documents.get(route.params.id)
    await loadDocumentPreview()
  } catch (e) {
    console.error('获取文档失败', e)
    ElMessage.error('文档不存在或无权访问')
    router.push('/')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.document-page {
  min-height: calc(100vh - 140px);
}

.document-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  flex-shrink: 0;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.doc-info h2 {
  margin: 0 0 10px;
  font-size: 20px;
}

.doc-meta {
  display: flex;
  gap: 20px;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.doc-actions {
  display: flex;
  gap: 10px;
}

.workflow-progress {
  margin-top: 20px;
}

.rejection-history {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.rejection-history h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #666;
}

.rejection-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #fef0f0;
  border-radius: 4px;
  margin-bottom: 8px;
}

.rejection-user {
  font-weight: 500;
}

.rejection-comment {
  color: #666;
}

.preview-card {
  flex: 1;
}

.preview-header {
  display: flex;
  align-items: center;
}

.preview-container {
  min-height: 600px;
  max-height: calc(100vh - 400px);
  overflow: auto;
  background: #f5f5f5;
  padding: 20px;
}

.preview-container :deep(.docx-preview) {
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}

.preview-container :deep(.docx-wrapper) {
  background: white;
  padding: 20px;
}
</style>
