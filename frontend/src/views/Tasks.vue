<template>
  <div class="tasks-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的待办任务</span>
          <el-button type="primary" :icon="Refresh" @click="fetchTasks">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="tasks" v-loading="loading" empty-text="暂无待办任务">
        <el-table-column prop="documentTitle" label="文档标题" min-width="200" />
        <el-table-column prop="uploaderName" label="发起人" width="120" />
        <el-table-column label="任务类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stepType === 'proofread' ? 'warning' : 'success'">
              {{ row.stepType === 'proofread' ? '校对' : '批准' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.startedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/document/${row.documentId}`)">
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'

const tasks = ref([])
const loading = ref(false)

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

async function fetchTasks() {
  loading.value = true
  try {
    tasks.value = await api.tasks.pending()
  } catch (e) {
    console.error('获取待办任务失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTasks)
</script>

<style scoped>
.tasks-page {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
