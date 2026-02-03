<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="sidebar">
      <div class="brand">
        <span class="brand-text">DocFlow</span>
      </div>
      
      <nav class="nav">
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <span v-if="item.badge && item.badge > 0" class="badge">{{ item.badge }}</span>
        </router-link>
      </nav>
    </el-aside>
    
    <el-container class="main-container">
      <!-- 顶部导航 -->
      <el-header class="header" height="56px">
        <h1 class="page-title">{{ pageTitle }}</h1>
        
        <div class="header-actions">
          <!-- 通知 -->
          <el-popover placement="bottom-end" :width="320" trigger="click">
            <template #reference>
              <button class="icon-btn" :class="{ 'has-badge': notificationStore.unreadCount > 0 }">
                <el-icon :size="18"><Bell /></el-icon>
                <span v-if="notificationStore.unreadCount > 0" class="icon-badge">
                  {{ notificationStore.unreadCount }}
                </span>
              </button>
            </template>
            
            <div class="notifications-panel">
              <div class="notifications-header">
                <span>通知</span>
                <button class="text-btn" @click="notificationStore.markAllAsRead">
                  全部已读
                </button>
              </div>
              
              <div v-if="notificationStore.notifications.length === 0" class="notifications-empty">
                暂无通知
              </div>
              <div v-else class="notifications-list">
                <div 
                  v-for="item in notificationStore.notifications" 
                  :key="item.id"
                  class="notification-item"
                  :class="{ unread: !item.isRead }"
                  @click="handleNotificationClick(item)"
                >
                  <p>{{ item.message }}</p>
                  <span class="time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
            </div>
          </el-popover>
          
          <!-- 用户菜单 -->
          <el-dropdown @command="handleCommand">
            <div class="user-menu">
              <div class="avatar">{{ authStore.user?.displayName?.charAt(0) }}</div>
              <span class="username">{{ authStore.user?.displayName }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 主内容区 -->
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, Bell, Document, FolderOpened } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notification'
import api from '../api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const pendingCount = ref(0)

const navItems = computed(() => [
  { path: '/', label: '首页', icon: HomeFilled },
  { path: '/tasks', label: '我的待办', icon: Bell, badge: pendingCount.value },
  { path: '/my-documents', label: '我发起的', icon: Document },
  { path: '/archive', label: '归档查询', icon: FolderOpened }
])

const pageTitle = computed(() => {
  const titles = {
    '/': '首页',
    '/tasks': '我的待办',
    '/my-documents': '我发起的',
    '/archive': '归档查询'
  }
  return titles[route.path] || '文档详情'
})

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

async function handleNotificationClick(item) {
  if (!item.isRead) {
    await notificationStore.markAsRead(item.id)
  }
  if (item.documentId) {
    router.push(`/document/${item.documentId}`)
  }
}

async function handleCommand(command) {
  if (command === 'logout') {
    await authStore.logout()
    notificationStore.disconnectSocket()
    router.push('/login')
  }
}

async function fetchPendingCount() {
  try {
    const tasks = await api.tasks.pending()
    pendingCount.value = tasks.length
  } catch (e) {
    console.error('获取待办数量失败', e)
  }
}

onMounted(async () => {
  if (authStore.user?.id) {
    notificationStore.connectSocket(authStore.user.id)
  }
  
  await Promise.all([
    notificationStore.fetchNotifications(),
    fetchPendingCount()
  ])
})

onUnmounted(() => {
  notificationStore.disconnectSocket()
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

/* 侧边栏 */
.sidebar {
  background: #1e2530;
  display: flex;
  flex-direction: column;
}

.brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-text {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.nav {
  flex: 1;
  padding: 12px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  color: #fff;
  background: var(--color-accent);
}

.nav-item .badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background: var(--color-danger);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 主容器 */
.main-container {
  background: var(--color-bg-primary);
}

/* 顶部 */
.header {
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.icon-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.icon-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--color-danger);
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.user-menu:hover {
  background: var(--color-bg-tertiary);
}

.avatar {
  width: 32px;
  height: 32px;
  background: var(--color-accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 主内容 */
.main {
  padding: 24px;
  overflow-y: auto;
}

/* 通知面板 */
.notifications-panel {
  margin: -12px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  font-weight: 600;
}

.text-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.text-btn:hover {
  text-decoration: underline;
}

.notifications-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
}

.notifications-list {
  max-height: 320px;
  overflow-y: auto;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: var(--transition-fast);
}

.notification-item:hover {
  background: var(--color-bg-tertiary);
}

.notification-item.unread {
  background: var(--color-accent-light);
}

.notification-item p {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--color-text-primary);
}

.notification-item .time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
