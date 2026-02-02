<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <h1>DocFlow</h1>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="layout-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        
        <el-menu-item index="/tasks">
          <el-icon><Bell /></el-icon>
          <template #title>
            <span>我的待办</span>
            <el-badge v-if="pendingCount > 0" :value="pendingCount" class="menu-badge" />
          </template>
        </el-menu-item>
        
        <el-menu-item index="/my-documents">
          <el-icon><Document /></el-icon>
          <span>我发起的</span>
        </el-menu-item>
        
        <el-menu-item index="/archive">
          <el-icon><FolderOpened /></el-icon>
          <span>归档查询</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        
        <div class="header-right">
          <!-- 通知 -->
          <el-popover placement="bottom" :width="300" trigger="click">
            <template #reference>
              <el-badge :value="notificationStore.unreadCount" :hidden="notificationStore.unreadCount === 0">
                <el-button :icon="Bell" circle />
              </el-badge>
            </template>
            
            <div class="notification-header">
              <span>通知</span>
              <el-button type="primary" link @click="notificationStore.markAllAsRead">
                全部已读
              </el-button>
            </div>
            
            <el-scrollbar max-height="300px">
              <div v-if="notificationStore.notifications.length === 0" class="notification-empty">
                暂无通知
              </div>
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
            </el-scrollbar>
          </el-popover>
          
          <!-- 用户信息 -->
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32">{{ authStore.user?.displayName?.charAt(0) }}</el-avatar>
              <span>{{ authStore.user?.displayName }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 主内容区 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notification'
import api from '../api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const pendingCount = ref(0)

const activeMenu = computed(() => route.path)

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
  return date.toLocaleString('zh-CN')
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
  // 请求通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  
  // 连接 WebSocket
  if (authStore.user?.id) {
    notificationStore.connectSocket(authStore.user.id)
  }
  
  // 获取通知和待办数量
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
.layout-container {
  min-height: 100vh;
}

.layout-aside {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #263445;
}

.logo h1 {
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.layout-menu {
  border-right: none;
}

.menu-badge {
  margin-left: 8px;
}

.layout-header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.layout-main {
  background-color: #f0f2f5;
  padding: 20px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
}

.notification-empty {
  text-align: center;
  color: #999;
  padding: 20px;
}

.notification-item {
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #ecf5ff;
}

.notification-item p {
  margin: 0 0 4px;
  font-size: 14px;
}

.notification-item .time {
  font-size: 12px;
  color: #999;
}
</style>
