<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  try {
    await authStore.login(username.value, password.value)
  } catch (err) {
    errorMsg.value = 'Błąd logowania. Sprawdź login i hasło.'
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-4">
        <div class="card shadow">
          <div class="card-body">
            <h2 class="text-center mb-4">Logowanie</h2>
            
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label class="form-label">Nazwa użytkownika</label>
                <input v-model="username" type="text" class="form-control" required>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Hasło</label>
                <input v-model="password" type="password" class="form-control" required>
              </div>

              <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

              <button type="submit" class="btn btn-primary w-100 mb-3">Zaloguj się</button>
              
              <div class="text-center">
                Nie masz konta? <router-link to="/register">Zarejestruj się</router-link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>