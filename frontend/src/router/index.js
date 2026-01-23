import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CartView from '../views/CartView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- STREFA PUBLICZNA ---
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },

    // --- STREFA KLIENTA
    {
      path: '/cart',
      name: 'cart',
      component: CartView,
      meta: { blockEmployee: true }
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrderHistoryView.vue'),
      meta: { blockEmployee: true, requiresAuth: true }
    },

    // --- STREFA PRACOWNIKA
    {
      path: '/admin/orders',
      name: 'admin-orders',
      component: () => import('../views/AdminDashboard.vue'),
      meta: { blockUser: true, requiresAuth: true }
    },
    {
      path: '/admin/product/edit/:id',
      name: 'product-edit',
      component: () => import('../views/ProductEditView.vue'),
      meta: { blockUser: true, requiresAuth: true }
    },
    {
      path: '/admin/init',
      name: 'db-init',
      component: () => import('../views/AdminInitDB.vue'),
      meta: { blockUser: true, requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.accessToken) {
    alert('Musisz się zalogować, aby zobaczyć swoje zamówienia.')
    return next('/login')
  }

  if (to.meta.blockEmployee && authStore.isEmployee) {
      alert('Jako pracownik nie masz dostępu do tej sekcji.')
      return next('/') 
  }
  else if (to.meta.blockUser && !authStore.isEmployee) {
      alert('Brak uprawnień. Ta sekcja jest tylko dla pracowników.')
      return next('/')
  } 
  else {
      next()
  }
})

export default router
