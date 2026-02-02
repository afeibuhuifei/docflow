<template>
  <div class="archive-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>归档文档查询</span>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input 
          v-model="searchTitle" 
          placeholder="搜索文档标题" 
          clearable
          style="width: 300px"
          @keyup.enter="fetchArchive"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="fetchArchive">搜索</el-button>
      </div>
      
      <el-table :data="documents" v-loading="loading" empty-text="暂无归档文档">
        <el-table-column prop="title" label="文档标题" min-width="300" />
        <el-table-column prop="uploaderName" label="上传者" width="120" />
        <el-table-column label="归档时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.archivedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/document/${row.id}`)">
              预览
            </el-button>
            <el-button type="success" link @click="handleDownload(row)">
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import api from '../api'

const documents = ref([])
const loading = ref(false)
const searchTitle = ref('')

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

function handleDownload(doc) {
  const token = localStorage.getItem('token')
  const url = `${api.documents.download(doc.id)}?token=${token}`
  window.open(url, '_blank')
}

async function fetchArchive() {
  loading.value = true
  try {
    documents.value = await api.archive.list({ title: searchTitle.value || undefined })
  } catch (e) {
    console.error('获取归档文档失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchArchive)
</script>

<style scoped>
.archive-page {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
</style>
