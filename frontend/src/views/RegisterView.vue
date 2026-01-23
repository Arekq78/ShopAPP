<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')

const handleRegister = async () => {
  errorMsg.value = ''
  
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Hasła nie są identyczne.'
    return
  }

  try {
    await authStore.register(username.value, password.value)
    alert('Konto utworzone! Możesz się teraz zalogować.')
  } catch (err) {
    errorMsg.value = err.response?.data?.details || 'Wystąpił błąd podczas rejestracji.'
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-4">
        <div class="card shadow">
          <div class="card-body">
            <h2 class="text-center mb-4">Rejestracja</h2>
            
            <form @submit.prevent="handleRegister">
              <div class="mb-3">
                <label class="form-label">Nazwa użytkownika</label>
                <input v-model="username" type="text" class="form-control" required>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Hasło</label>
                <input v-model="password" type="password" class="form-control" required>
              </div>

              <div class="mb-3">
                <label class="form-label">Powtórz hasło</label>
                <input v-model="confirmPassword" type="password" class="form-control" required>
              </div>

              <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

              <button type="submit" class="btn btn-success w-100 mb-3">Załóż konto</button>
              
              <div class="text-center">
                Masz już konto? <router-link to="/login">Zaloguj się</router-link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>