import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { io } from 'socket.io-client'

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([])
    const unreadCount = ref(0)
    let socket = null

    async function fetchNotifications() {
        const data = await api.notifications.list()
        notifications.value = data.notifications
        unreadCount.value = data.unreadCount
    }

    async function markAsRead(id) {
        await api.notifications.markRead(id)
        const notification = notifications.value.find(n => n.id === id)
        if (notification) {
            notification.isRead = true
            unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
    }

    async function markAllAsRead() {
        await api.notifications.markAllRead()
        notifications.value.forEach(n => n.isRead = true)
        unreadCount.value = 0
    }

    function connectSocket(userId) {
        if (socket) {
            socket.disconnect()
        }

        socket = io('http://localhost:3000', {
            transports: ['websocket']
        })

        socket.on('connect', () => {
            console.log('WebSocket 已连接')
            socket.emit('join', userId)
        })

        socket.on('notification', (data) => {
            notifications.value.unshift(data)
            unreadCount.value++

            // 显示桌面通知
            if (Notification.permission === 'granted') {
                new Notification('DocFlow 通知', { body: data.message })
            }
        })

        socket.on('disconnect', () => {
            console.log('WebSocket 已断开')
        })
    }

    function disconnectSocket() {
        if (socket) {
            socket.disconnect()
            socket = null
        }
    }

    return {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        connectSocket,
        disconnectSocket
    }
})
