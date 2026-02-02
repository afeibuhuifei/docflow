<template>
  <div class="my-documents-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我发起的文档</span>
          <el-button type="primary" :icon="Upload" @click="showUploadDialog = true">
            上传文档
          </el-button>
        </div>
      </template>
      
      <el-table :data="documents" v-loading="loading" empty-text="暂无文档">
        <el-table-column prop="title" label="文档标题" min-width="300" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/document/${row.id}`)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'draft'" 
              type="success" 
              link 
              @click="handleSubmit(row)"
            >
              提交
            </el-button>
            <el-button 
              v-if="row.status === 'draft'" 
              type="danger" 
              link 
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
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
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传并提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Upload } from '@element-plus/icons-vue'
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

function handleFileChange(file) {
  form.value.file = file.raw
  // 自动填写文件名作为标题（去除扩展名）
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
    
    // 立即提交
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
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
