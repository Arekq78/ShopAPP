<script setup>
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView,useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useCartStore } from './stores/cart'

const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()

onMounted(() => {
  cartStore.loadCart()
})

watch(() => authStore.user, () => {
  cartStore.loadCart()
})

const handleLogout = async () => {
  await authStore.logout()
  cartStore.loadCart()
  router.push('/login')
}
</script>

<template>
  <header>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm py-3">
      <div class="container">
        <RouterLink to="/" class="navbar-brand fw-bold fs-4 d-flex align-items-center">
          <i class="bi bi-bag-heart-fill text-warning me-2"></i>
          Mój Sklep
        </RouterLink>

        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <RouterLink to="/" class="nav-link px-3" active-class="active">
                <i class="bi bi-shop me-1"></i> Produkty
              </RouterLink>
            </li>
            
            <li class="nav-item" v-if="!authStore.isEmployee">
              <RouterLink to="/cart" class="nav-link px-3 position-relative" active-class="active">
                <i class="bi bi-cart3 me-1"></i> Koszyk
                <span v-if="cartStore.itemCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style="font-size: 0.6em;">
                  {{ cartStore.itemCount }}
                </span>
              </RouterLink>
            </li>
            
            <li class="nav-item" v-if="!authStore.isEmployee">
              <RouterLink to="/orders" class="nav-link px-3" active-class="active">
                <i class="bi bi-receipt me-1"></i> Moje Zamówienia
              </RouterLink>
            </li>
          </ul>
          
          <ul class="navbar-nav align-items-center gap-2">
             <li class="nav-item dropdown" v-if="authStore.isEmployee">
              <a class="nav-link dropdown-toggle fw-bold text-warning" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-shield-lock-fill me-1"></i> Admin
              </a>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><RouterLink to="/admin/orders" class="dropdown-item"><i class="bi bi-list-check me-2"></i>Panel Zamówień</RouterLink></li>
                <li><hr class="dropdown-divider"></li>
                <li><RouterLink to="/admin/init" class="dropdown-item text-danger"><i class="bi bi-database-fill-gear me-2"></i>Inicjalizacja Bazy</RouterLink></li>
              </ul>
            </li>

            <li class="nav-item" v-if="!authStore.isAuthenticated">
              <RouterLink to="/login" class="btn btn-outline-light btn-sm px-4 rounded-pill">
                Logowanie
              </RouterLink>
            </li>
             <li class="nav-item" v-if="!authStore.isAuthenticated">
              <RouterLink to="/register" class="btn btn-warning btn-sm px-4 rounded-pill fw-bold text-dark">
                Rejestracja
              </RouterLink>
            </li>

            <li class="nav-item dropdown" v-if="authStore.isAuthenticated">
              <a class="nav-link dropdown-toggle fw-bold" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-person me-1"></i>
                Witaj, {{ authStore.user?.username }}
              </a>
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li>
                  <a class="dropdown-item text-danger d-flex align-items-center" href="#" @click.prevent="handleLogout">
                    <i class="bi bi-box-arrow-right me-2"></i> Wyloguj się
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.navbar-nav .nav-link.active {
  color: #ffc107 !important;
  font-weight: 600;
}

.nav-link {
  transition: color 0.2s ease-in-out;
}

.nav-link:hover {
  color: #e0e0e0;
}
</style>