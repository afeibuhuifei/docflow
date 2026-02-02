import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        component: () => import('../views/Layout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'Dashboard',
                component: () => import('../views/Dashboard.vue')
            },
            {
                path: 'tasks',
                name: 'Tasks',
                component: () => import('../views/Tasks.vue')
            },
            {
                path: 'my-documents',
                name: 'MyDocuments',
                component: () => import('../views/MyDocuments.vue')
            },
            {
                path: 'archive',
                name: 'Archive',
                component: () => import('../views/Archive.vue')
            },
            {
                path: 'document/:id',
                name: 'Document',
                component: () => import('../views/Document.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
        next('/login')
    } else if (to.path === '/login' && authStore.isLoggedIn) {
        next('/')
    } else {
        next()
    }
})

export default router
