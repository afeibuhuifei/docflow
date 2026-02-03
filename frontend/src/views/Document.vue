<template>
  <div class="document-page" v-loading="loading">
    <div v-if="document" class="document-layout">
      <!-- 编辑器区域 -->
      <div class="editor-section">
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <h2 class="doc-title">{{ document.title }}</h2>
            <span class="status-badge" :class="document.status">
              {{ getStatusText(document.status) }}
            </span>
          </div>
          <div class="toolbar-right">
            <!-- 预览/编辑切换 -->
            <div class="view-toggle" v-if="canEdit">
              <button 
                class="toggle-btn" 
                :class="{ active: viewMode === 'preview' }"
                @click="viewMode = 'preview'"
              >
                预览
              </button>
              <button 
                class="toggle-btn" 
                :class="{ active: viewMode === 'edit' }"
                @click="viewMode = 'edit'"
              >
                编辑
              </button>
            </div>
            
            <button v-if="canEdit && viewMode === 'edit'" class="btn btn-primary" @click="handleSave" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button class="btn btn-secondary" @click="handleDownload">
              下载
            </button>
          </div>
        </div>
        
        <div class="editor-container">
          <!-- OnlyOffice 编辑器 - 预览模式用 view，编辑模式用 edit -->
          <OnlyOfficeEditor 
            ref="editorRef"
            :docId="document.id"
            :mode="viewMode === 'edit' ? 'edit' : 'view'"
            :key="viewMode"
            height="100%"
            @ready="onEditorReady"
            @save="onEditorSave"
            @error="onEditorError"
          />
        </div>
      </div>
      
      <!-- 右侧信息面板 -->
      <aside class="info-panel">
        <!-- 文档信息 -->
        <section class="panel-section">
          <h3 class="section-title">文档信息</h3>
          <dl class="info-list">
            <div class="info-row">
              <dt>上传人</dt>
              <dd>{{ document.uploaderName }}</dd>
            </div>
            <div class="info-row">
              <dt>创建时间</dt>
              <dd>{{ formatTime(document.createdAt) }}</dd>
            </div>
            <div class="info-row">
              <dt>文件名</dt>
              <dd>{{ document.originalFilename }}</dd>
            </div>
          </dl>
        </section>
        
        <!-- 工作流 -->
        <section class="panel-section">
          <h3 class="section-title">审批流程</h3>
          <div class="workflow-steps">
            <div class="step" :class="{ completed: true }">
              <div class="step-indicator completed"></div>
              <div class="step-content">
                <span class="step-title">上传</span>
                <span class="step-user">{{ document.uploaderName }}</span>
                <span class="step-time">{{ formatTime(document.createdAt) }}</span>
              </div>
            </div>
            <div 
              v-for="node in document.workflow" 
              :key="node.id"
              class="step"
              :class="{ 
                completed: node.status === 'approved', 
                active: node.status === 'in_progress',
                rejected: node.status === 'rejected'
              }"
            >
              <div class="step-indicator" :class="getStepClass(node)"></div>
              <div class="step-content">
                <div class="step-header">
                  <span class="step-title">{{ node.stepType === 'proofread' ? '校对' : '批准' }}</span>
                  <span class="step-status" :class="node.status">{{ getNodeStatusText(node.status) }}</span>
                </div>
                <span class="step-user">{{ node.assigneeName }}</span>
                <span v-if="node.completedAt" class="step-time">{{ formatTime(node.completedAt) }}</span>
                <span v-else-if="node.startedAt" class="step-time">开始于 {{ formatTime(node.startedAt) }}</span>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 操作按钮 -->
        <section v-if="currentTask" class="panel-section actions-section">
          <h3 class="section-title">操作</h3>
          <div class="action-buttons">
            <button class="btn btn-success btn-full" @click="handleApprove" :disabled="approving">
              {{ approving ? '处理中...' : '通过' }}
            </button>
            <button class="btn btn-danger btn-full" @click="showRejectDialog = true">
              退回
            </button>
          </div>
        </section>
        
        <!-- 批注历史 -->
        <section v-if="rejectionHistory.length > 0" class="panel-section">
          <h3 class="section-title">批注记录</h3>
          <div class="comments-list">
            <div v-for="(item, index) in rejectionHistory" :key="index" class="comment-item">
              <div class="comment-header">
                <span class="comment-user">{{ item.assigneeName }}</span>
                <span class="comment-badge">{{ item.stepType === 'proofread' ? '校对' : '批准' }}</span>
              </div>
              <p class="comment-text">{{ item.comment }}</p>
            </div>
          </div>
        </section>
      </aside>
    </div>
    
    <!-- 退回对话框 -->
    <el-dialog v-model="showRejectDialog" title="退回文档" width="400px">
      <el-form>
        <el-form-item label="退回原因（可选）">
          <el-input 
            v-model="rejectComment" 
            type="textarea" 
            :rows="4" 
            placeholder="可选：填写退回原因"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <button class="btn btn-secondary" @click="showRejectDialog = false">取消</button>
        <button class="btn btn-danger" :disabled="rejecting" @click="handleReject">
          {{ rejecting ? '处理中...' : '确认退回' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import OnlyOfficeEditor from '../components/OnlyOfficeEditor.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const document = ref(null)
const loading = ref(true)
const showRejectDialog = ref(false)
const rejectComment = ref('')
const rejecting = ref(false)
const saving = ref(false)
const approving = ref(false)
const editorRef = ref(null)
const viewMode = ref('preview') // 'preview' or 'edit'
const editorMode = ref('view')

// 预览 URL - 直接使用后端文件下载接口
const previewUrl = computed(() => {
  if (!document.value) return ''
  const token = localStorage.getItem('token')
  // 使用 Google Docs Viewer 或 Office Online Viewer 进行预览
  // 由于这是本地开发，我们使用 OnlyOffice 的 view 模式替代
  return ''
})

const canEdit = computed(() => {
  if (!document.value) return false
  if (document.value.status === 'draft' && document.value.uploaderId === authStore.user?.id) {
    return true
  }
  if (currentTask.value) {
    return true
  }
  return false
})

const currentTask = computed(() => {
  if (!document.value?.workflow) return null
  return document.value.workflow.find(
    node => node.status === 'in_progress' && node.assigneeName === authStore.user?.username
  )
})

const rejectionHistory = computed(() => {
  if (!document.value?.workflow) return []
  return document.value.workflow.filter(n => n.comment)
})

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleDateString('zh-CN')
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

function getStepClass(node) {
  if (node.status === 'approved') return 'completed'
  if (node.status === 'rejected') return 'rejected'
  if (node.status === 'in_progress') return 'active'
  return 'pending'
}

function getNodeStatusText(status) {
  const texts = {
    pending: '等待中',
    in_progress: '处理中',
    approved: '已完成',
    rejected: '已退回'
  }
  return texts[status] || status
}

function onEditorReady() {
  editorMode.value = canEdit.value ? 'edit' : 'view'
}

function onEditorSave() {
  ElMessage.success('文档已保存')
}

function onEditorError(error) {
  console.error('编辑器错误:', error)
}

async function handleSave() {
  if (!editorRef.value) return
  
  saving.value = true
  try {
    const success = await editorRef.value.forceSave()
    if (success) {
      ElMessage.success('文档保存成功')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleDownload() {
  const token = localStorage.getItem('token')
  const url = `http://localhost:3000/api/documents/${route.params.id}/download`
  
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
    .catch(() => {
      ElMessage.error('下载失败')
    })
}

async function handleApprove() {
  if (!currentTask.value) return
  
  if (editorRef.value && viewMode.value === 'edit') {
    try {
      await ElMessageBox.confirm('保存当前编辑并通过？', '确认通过', {
        confirmButtonText: '通过',
        cancelButtonText: '取消',
        type: 'info'
      })
      
      saving.value = true
      await editorRef.value.forceSave()
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (e) {
      if (e === 'cancel') return
    } finally {
      saving.value = false
    }
  }
  
  approving.value = true
  try {
    await api.tasks.approve(currentTask.value.id)
    ElMessage.success('已通过')
    router.push('/tasks')
  } catch (e) {
    ElMessage.error(e.error || '操作失败')
  } finally {
    approving.value = false
  }
}

async function handleReject() {
  if (!currentTask.value) return
  
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
    // 如果用户有编辑权限，可以选择预览或编辑
    // 如果没有编辑权限，直接进入编辑器的查看模式
    if (!canEdit.value) {
      viewMode.value = 'edit' // 使用 OnlyOffice 的 view 模式
    }
  } catch (e) {
    ElMessage.error('文档不存在或无权访问')
    router.push('/')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.document-page {
  height: calc(100vh - 104px);
  overflow: hidden;
}

.document-layout {
  display: flex;
  height: 100%;
  gap: 20px;
}

/* 编辑器区域 */
.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.draft { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.status-badge.proofreading { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.approving { background: var(--color-accent-light); color: var(--color-accent); }
.status-badge.archived { background: var(--color-success-light); color: var(--color-success); }
.status-badge.rejected { background: var(--color-danger-light); color: var(--color-danger); }

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 预览/编辑切换 */
.view-toggle {
  display: flex;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 2px;
  margin-right: 8px;
}

.toggle-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.toggle-btn:hover {
  color: var(--color-text-primary);
}

.toggle-btn.active {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

.editor-container {
  flex: 1;
  min-height: 0;
}

/* 预览容器 */
.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-placeholder {
  text-align: center;
  color: var(--color-text-tertiary);
}

.preview-placeholder p {
  margin-bottom: 16px;
}

/* 信息面板 */
.info-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.panel-section {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  padding: 16px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 信息列表 */
.info-list {
  margin: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.info-row dt {
  color: var(--color-text-tertiary);
}

.info-row dd {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 工作流步骤 */
.workflow-steps {
  display: flex;
  flex-direction: column;
}

.step {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.step.completed:not(:last-child)::after {
  background: var(--color-success);
}

.step-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-bg-secondary);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.step-indicator.completed {
  background: var(--color-success);
  border-color: var(--color-success);
}

.step-indicator.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.step-indicator.rejected {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.step-content {
  flex: 1;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.step-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.step-status.pending { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.step-status.in_progress { background: var(--color-accent-light); color: var(--color-accent); }
.step-status.approved { background: var(--color-success-light); color: var(--color-success); }
.step-status.rejected { background: var(--color-danger-light); color: var(--color-danger); }

.step-user {
  display: block;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.step-time {
  display: block;
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 批注列表 */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-item {
  padding: 10px;
  background: var(--color-danger-light);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comment-user {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.comment-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-danger);
  color: #fff;
  border-radius: 3px;
}

.comment-text {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.btn-success {
  background: var(--color-success);
  color: #fff;
}

.btn-success:hover:not(:disabled) {
  filter: brightness(0.9);
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(0.9);
}

.btn-full {
  width: 100%;
}
</style>
