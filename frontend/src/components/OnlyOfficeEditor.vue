<template>
  <div class="onlyoffice-editor-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="editor-loading">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <p>正在加载编辑器...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="editor-error">
      <el-result icon="error" :title="error">
        <template #extra>
          <el-button type="primary" @click="initEditor">重试</el-button>
        </template>
      </el-result>
    </div>
    
    <!-- 编辑器容器 -->
    <div 
      ref="editorContainer" 
      :id="editorId" 
      class="editor-frame"
      v-show="!loading && !error"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps({
  docId: {
    type: [String, Number],
    required: true
  },
  mode: {
    type: String,
    default: 'edit',
    validator: (value) => ['edit', 'view'].includes(value)
  },
  height: {
    type: String,
    default: '700px'
  }
})

const emit = defineEmits(['ready', 'save', 'error', 'documentReady'])

const editorContainer = ref(null)
const loading = ref(true)
const error = ref('')
const editorId = `onlyoffice-editor-${props.docId}`
let docEditor = null

// 检查 OnlyOffice API 是否可用
function checkOnlyOfficeAPI() {
  return typeof window.DocsAPI !== 'undefined'
}

// 初始化编辑器
async function initEditor() {
  loading.value = true
  error.value = ''
  
  try {
    // 检查 OnlyOffice API
    if (!checkOnlyOfficeAPI()) {
      throw new Error('OnlyOffice API 未加载，请确保 OnlyOffice Document Server 已启动（端口 9000）')
    }
    
    // 获取编辑器配置
    const response = await api.onlyoffice.getConfig(props.docId, props.mode)
    const { config, documentServerUrl } = response
    
    // 销毁已存在的编辑器实例
    if (docEditor) {
      docEditor.destroyEditor()
      docEditor = null
    }
    
    // 添加事件处理
    config.events = {
      onDocumentReady: () => {
        loading.value = false
        emit('ready')
        emit('documentReady')
      },
      onError: (event) => {
        console.error('OnlyOffice 错误:', event)
        error.value = event.data?.message || '编辑器加载失败'
        emit('error', event)
      },
      onSave: () => {
        emit('save')
      },
      onDocumentStateChange: (event) => {
        // event.data 为 true 表示文档被修改
        if (event.data) {
          console.log('文档已修改')
        }
      }
    }
    
    // 创建编辑器实例
    docEditor = new window.DocsAPI.DocEditor(editorId, config)
    
  } catch (e) {
    console.error('初始化 OnlyOffice 编辑器失败:', e)
    error.value = e.message || '初始化编辑器失败'
    loading.value = false
    emit('error', e)
  }
}

// 强制保存文档
async function forceSave() {
  try {
    if (docEditor) {
      // 调用编辑器的保存方法
      docEditor.triggerForceSave()
    }
    // 同时调用后端 API 确保保存
    await api.onlyoffice.forceSave(props.docId)
    return true
  } catch (e) {
    console.error('强制保存失败:', e)
    return false
  }
}

// 下载文档
function downloadAs(format = 'docx') {
  if (docEditor) {
    docEditor.downloadAs(format)
  }
}

// 暴露方法给父组件
defineExpose({
  forceSave,
  downloadAs,
  initEditor
})

// 监听 docId 变化
watch(() => props.docId, (newId, oldId) => {
  if (newId !== oldId) {
    initEditor()
  }
})

onMounted(() => {
  // 等待 DOM 渲染完成后初始化
  setTimeout(() => {
    initEditor()
  }, 100)
})

onBeforeUnmount(() => {
  if (docEditor) {
    try {
      docEditor.destroyEditor()
    } catch (e) {
      console.error('销毁编辑器失败:', e)
    }
    docEditor = null
  }
})
</script>

<style scoped>
.onlyoffice-editor-container {
  width: 100%;
  height: v-bind(height);
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.editor-frame {
  width: 100%;
  height: 100%;
}

.editor-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.editor-loading p {
  margin-top: 16px;
  font-size: 14px;
}

.editor-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
