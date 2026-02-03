<template>
  <div class="my-documents-page">
    <div class="page-card">
      <div class="card-header">
        <h2>我发起的文档</h2>
        <button class="btn btn-primary" @click="showUploadDialog = true">
          上传文档
        </button>
      </div>
      
      <el-table :data="documents" v-loading="loading" empty-text="暂无文档">
        <el-table-column prop="title" label="文档标题" min-width="200" />
        
        <!-- 工作流进度列 -->
        <el-table-column label="审批流程" min-width="280">
          <template #default="{ row }">
            <div class="workflow-progress" v-if="row.workflow && row.workflow.length > 0">
              <div 
                v-for="(node, index) in row.workflow" 
                :key="node.id"
                class="workflow-node"
              >
                <div class="node-indicator" :class="getNodeClass(node)">
                  {{ index + 1 }}
                </div>
                <div class="node-info">
                  <span class="node-type">{{ node.stepType === 'proofread' ? '校对' : '批准' }}</span>
                  <span class="node-user">{{ node.assigneeName }}</span>
                </div>
                <span v-if="index < row.workflow.length - 1" class="node-arrow"></span>
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <span class="status-badge" :class="row.status">
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <button class="btn-link" @click="$router.push(`/document/${row.id}`)">
              查看
            </button>
            <button 
              v-if="row.status === 'draft'" 
              class="btn-link success"
              @click="handleSubmit(row)"
            >
              提交
            </button>
            <button 
              v-if="row.status === 'draft'" 
              class="btn-link danger"
              @click="handleDelete(row)"
            >
              删除
            </button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 上传对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传文档" width="500px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文档标题" />
        </el-form-item>
        
        <el-form-item label="文件" prop="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".doc,.docx"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">只支持 .doc 和 .docx 文件，不超过 50MB</div>
            </template>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="校对人员" prop="proofreaderId">
          <el-select v-model="form.proofreaderId" placeholder="选择校对人员" style="width: 100%">
            <el-option 
              v-for="user in availableUsers" 
              :key="user.id" 
              :label="user.username" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="批准人员" prop="approverId">
          <el-select v-model="form.approverId" placeholder="选择批准人员" style="width: 100%">
            <el-option 
              v-for="user in availableUsers" 
              :key="user.id" 
              :label="user.username" 
              :value="user.id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <button class="btn btn-secondary" @click="showUploadDialog = false">取消</button>
        <button class="btn btn-primary" :disabled="uploading" @click="handleUpload">
          {{ uploading ? '上传中...' : '上传并提交' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const authStore = useAuthStore()

const documents = ref([])
const users = ref([])
const loading = ref(false)
const showUploadDialog = ref(false)
const uploading = ref(false)

const formRef = ref(null)
const uploadRef = ref(null)
const form = ref({
  title: '',
  file: null,
  proofreaderId: null,
  approverId: null
})

const rules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
  proofreaderId: [{ required: true, message: '请选择校对人员', trigger: 'change' }],
  approverId: [{ required: true, message: '请选择批准人员', trigger: 'change' }]
}

const availableUsers = computed(() => 
  users.value.filter(u => u.id !== authStore.user?.id)
)

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
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

function getNodeClass(node) {
  if (node.status === 'approved') return 'completed'
  if (node.status === 'in_progress') return 'active'
  if (node.status === 'rejected') return 'rejected'
  return 'pending'
}

function handleFileChange(file) {
  form.value.file = file.raw
  if (!form.value.title && file.name) {
    const nameWithoutExt = file.name.replace(/\.(doc|docx)$/i, '')
    form.value.title = nameWithoutExt
  }
}

function handleFileRemove() {
  form.value.file = null
}

function resetForm() {
  form.value = {
    title: '',
    file: null,
    proofreaderId: null,
    approverId: null
  }
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

async function handleUpload() {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  if (!form.value.file) {
    ElMessage.warning('请选择文件')
    return
  }
  
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.value.title)
    formData.append('file', form.value.file)
    formData.append('proofreader_id', form.value.proofreaderId)
    formData.append('approver_id', form.value.approverId)
    
    const result = await api.documents.upload(formData)
    await api.documents.submit(result.id)
    
    ElMessage.success('文档上传并提交成功')
    showUploadDialog.value = false
    await fetchDocuments()
  } catch (e) {
    ElMessage.error(e.error || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleSubmit(doc) {
  try {
    await api.documents.submit(doc.id)
    ElMessage.success('文档已提交')
    await fetchDocuments()
  } catch (e) {
    ElMessage.error(e.error || '提交失败')
  }
}

async function handleDelete(doc) {
  try {
    await ElMessageBox.confirm('确定要删除此文档吗？', '提示', {
      type: 'warning'
    })
    await api.documents.delete(doc.id)
    ElMessage.success('文档已删除')
    await fetchDocuments()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.error || '删除失败')
    }
  }
}

async function fetchDocuments() {
  loading.value = true
  try {
    documents.value = await api.documents.list()
  } catch (e) {
    console.error('获取文档列表失败', e)
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  try {
    users.value = await api.users.list()
  } catch (e) {
    console.error('获取用户列表失败', e)
  }
}

onMounted(async () => {
  await Promise.all([fetchDocuments(), fetchUsers()])
})
</script>

<style scoped>
.my-documents-page {
  max-width: 1400px;
}

.page-card {
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

.card-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

/* Workflow Progress */
.workflow-progress {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-node {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.node-indicator.pending {
  background: var(--color-border);
  color: var(--color-text-tertiary);
}

.node-indicator.active {
  background: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.node-indicator.completed {
  background: var(--color-success);
}

.node-indicator.rejected {
  background: var(--color-danger);
}

.node-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.node-type {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.node-user {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.node-arrow {
  width: 16px;
  height: 2px;
  background: var(--color-border);
  margin: 0 4px;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.draft { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.status-badge.proofreading { background: var(--color-warning-light); color: var(--color-warning); }
.status-badge.approving { background: var(--color-accent-light); color: var(--color-accent); }
.status-badge.archived { background: var(--color-success-light); color: var(--color-success); }
.status-badge.rejected { background: var(--color-danger-light); color: var(--color-danger); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
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
  margin-right: 8px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-link.success { color: var(--color-success); }
.btn-link.danger { color: var(--color-danger); }

.text-muted {
  color: var(--color-text-tertiary);
}
</style>
