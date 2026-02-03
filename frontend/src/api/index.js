import axios from 'axios'

const BASE_URL = 'http://localhost:3000/api'

// 创建 axios 实例
const http = axios.create({
    baseURL: BASE_URL,
    timeout: 30000
})

// 请求拦截器
http.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => Promise.reject(error)
)

// 响应拦截器
http.interceptors.response.use(
    response => response.data,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error)
    }
)

// API 模块
const api = {
    auth: {
        login: (username, password) => http.post('/auth/login', { username, password }),
        logout: () => http.post('/auth/logout'),
        me: () => http.get('/auth/me')
    },

    users: {
        list: () => http.get('/users')
    },

    documents: {
        upload: (formData) => http.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        list: () => http.get('/documents/my'),
        get: (id) => http.get(`/documents/${id}`),
        submit: (id) => http.post(`/documents/${id}/submit`),
        download: (id) => `${BASE_URL}/documents/${id}/download`,
        delete: (id) => http.delete(`/documents/${id}`)
    },

    tasks: {
        pending: () => http.get('/tasks/pending'),
        approve: (nodeId, comment) => http.post(`/tasks/${nodeId}/approve`, { comment }),
        reject: (nodeId, comment) => http.post(`/tasks/${nodeId}/reject`, { comment })
    },

    archive: {
        list: (params) => http.get('/archive', { params })
    },

    notifications: {
        list: () => http.get('/notifications'),
        markRead: (id) => http.post(`/notifications/${id}/read`),
        markAllRead: () => http.post('/notifications/read-all')
    },

    onlyoffice: {
        getConfig: (docId, mode = 'edit') => http.get(`/onlyoffice/config/${docId}`, { params: { mode } }),
        forceSave: (docId) => http.post(`/onlyoffice/forcesave/${docId}`)
    }
}

export default api
