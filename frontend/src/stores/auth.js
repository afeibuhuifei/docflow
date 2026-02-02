import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

    const isLoggedIn = computed(() => !!token.value)

    async function login(username, password) {
        const response = await api.auth.login(username, password)
        token.value = response.token
        user.value = response.user
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return response
    }

    async function logout() {
        try {
            await api.auth.logout()
        } catch (e) {
            // 忽略登出错误
        }
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    async function fetchCurrentUser() {
        if (!token.value) return null
        try {
            const userData = await api.auth.me()
            user.value = userData
            localStorage.setItem('user', JSON.stringify(userData))
            return userData
        } catch (e) {
            logout()
            return null
        }
    }

    return {
        token,
        user,
        isLoggedIn,
        login,
        logout,
        fetchCurrentUser
    }
})
