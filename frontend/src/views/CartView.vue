<script setup>
import { ref } from 'vue'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'
import { useRouter } from 'vue-router'

const cartStore = useCartStore()
const authStore = useAuthStore()
const router = useRouter()

const formatPrice = (value) => {
  const num = parseFloat(value)
  if (isNaN(num)) return "0.00"
  return num.toFixed(2)
}

const formData = ref({
  userName: '', 
  email: '',
  phone: '' 
})

const isSubmitting = ref(false)
const submitError = ref('')

const submitOrder = async () => {
  submitError.value = ''
  
  if (!formData.value.userName || !formData.value.email || !formData.value.phone) {
    submitError.value = 'Wypełnij wszystkie pola formularza!'
    return
  }

  const nameRegex = /^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+$/;
  if (!nameRegex.test(formData.value.userName)) {
    submitError.value = 'Podaj pełne imię i nazwisko. Oba muszą zaczynać się wielką literą i zawierać tylko litery (np. Jan Kowalski).'
    return
  }

  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  if (!phoneRegex.test(formData.value.phone)) {
    submitError.value = 'Numer telefonu musi zaczynać się od "+" i mieć od 7 do 14 cyfr (np. +48123456789).'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.value.email)) {
     submitError.value = 'Podaj poprawny adres email.'
     return
  }

  if (cartStore.items.length === 0) {
    submitError.value = 'Twój koszyk jest pusty.'
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      customer_name: formData.value.userName,
      email: formData.value.email,
      phone: formData.value.phone,
      products: cartStore.items.map(item => ({ 
        product_id: item.product_id,
        quantity: item.quantity
      }))
    }

    await axios.post('http://localhost:3000/api/orders', payload, {
      headers: authStore.authHeader
    })

    alert('Zamówienie zostało złożone pomyślnie!')
    cartStore.clearCart() // Clear cart after success
    router.push('/') // Redirect to home (or /orders if implemented)

  } catch (error) {
    console.error(error)
    const problemDetails = error.response?.data
    if (problemDetails && problemDetails.details) {
         submitError.value = `Błąd serwera: ${problemDetails.title} - ${problemDetails.details}`
    } else {
         submitError.value = 'Wystąpił nieoczekiwany błąd podczas składania zamówienia.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="container mt-5">
    
    <div class="d-flex align-items-center mb-4">
      <h2 class="fw-bold mb-0">
        <i class="bi bi-cart3 me-2 text-primary"></i>Twój Koszyk
      </h2>
      <span v-if="cartStore.items.length > 0" class="badge bg-light text-dark border ms-3">
        {{ cartStore.itemCount }} szt.
      </span>
    </div>

    <div v-if="cartStore.items.length === 0" class="text-center py-5 bg-light rounded-3 border border-dashed">
      <i class="bi bi-basket3 display-1 text-muted mb-3 d-block opacity-50"></i>
      <h4 class="text-muted fw-normal">Twój koszyk jest pusty.</h4>
      <p class="mb-4 text-secondary">Wygląda na to, że nie dodałeś jeszcze żadnych produktów.</p>
      <router-link to="/" class="btn btn-primary px-4 rounded-pill fw-bold">
        <i class="bi bi-arrow-left me-2"></i>Wróć do sklepu
      </router-link>
    </div>

    <div v-else class="row g-4">
      
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="bg-light border-bottom">
                  <tr>
                    <th class="ps-4 py-3 text-uppercase small fw-bold text-secondary">Produkt</th>
                    <th class="text-uppercase small fw-bold text-secondary">Cena</th>
                    <th class="text-uppercase small fw-bold text-secondary" style="width: 150px;">Ilość</th>
                    <th class="text-uppercase small fw-bold text-secondary">Suma</th>
                    <th class="text-end pe-4 text-uppercase small fw-bold text-secondary">Usuń</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in cartStore.items" :key="item.product_id">
                    
                    <td class="ps-4">
                      <div class="fw-bold text-dark">{{ item.product_name }}</div>
                    </td>
                    
                    <td class="text-muted">
                      {{ formatPrice(item.price) }} zł
                    </td>
                    
                    <td>
                      <div class="input-group input-group-sm" style="max-width: 120px;">
                        <button 
                          class="btn btn-outline-secondary fw-bold" 
                          type="button"
                          @click="cartStore.updateQuantity(item.product_id, item.quantity - 1)"
                          style="width: 30px;"
                          :disabled="item.quantity <= 1"
                        >
                          -
                        </button>
                        
                        <input 
                          type="text" 
                          class="form-control text-center bg-white border-secondary border-opacity-25" 
                          :value="item.quantity" 
                          readonly
                        >
                        
                        <button 
                          class="btn btn-outline-secondary fw-bold" 
                          type="button"
                          @click="cartStore.updateQuantity(item.product_id, item.quantity + 1)"
                          style="width: 30px;"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    
                    <td class="fw-bold text-primary">
                      {{ formatPrice(item.price * item.quantity) }} zł
                    </td>
                    
                    <td class="text-end pe-4">
                      <button 
                        class="btn btn-outline-danger btn-sm d-inline-flex align-items-center transition-button" 
                        @click="cartStore.removeFromCart(item.product_id)"
                        title="Usuń produkt"
                      >
                        <i class="bi bi-trash3-fill"></i> 
                        <span>Usuń</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="card-footer bg-white border-top py-3 pe-4 text-end">
             <div class="text-muted small text-uppercase fw-bold">Łącznie do zapłaty</div>
             <div class="fs-4 fw-bold text-dark">{{ cartStore.totalPrice }} zł</div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-sm border-0 sticky-top" style="top: 20px; z-index: 1;">
          <div class="card-header bg-white py-3 border-bottom">
            <h5 class="mb-0 fw-bold"><i class="bi bi-credit-card me-2"></i>Dane do zamówienia</h5>
          </div>
          
          <div class="card-body p-4">
            <form @submit.prevent="submitOrder">
              
              <div class="mb-3">
                <label class="form-label small text-muted fw-bold text-uppercase">Imię i Nazwisko</label>
                <div class="input-group">
                  <span class="input-group-text bg-light border-end-0"><i class="bi bi-person"></i></span>
                  <input v-model="formData.userName" type="text" class="form-control border-start-0 ps-0" placeholder="np. Jan Kowalski" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small text-muted fw-bold text-uppercase">Adres Email</label>
                <div class="input-group">
                  <span class="input-group-text bg-light border-end-0"><i class="bi bi-envelope"></i></span>
                  <input v-model="formData.email" type="email" class="form-control border-start-0 ps-0" placeholder="np. jan@example.com" required>
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label small text-muted fw-bold text-uppercase">Telefon</label>
                <div class="input-group">
                  <span class="input-group-text bg-light border-end-0"><i class="bi bi-telephone"></i></span>
                  <input v-model="formData.phone" type="tel" class="form-control border-start-0 ps-0" placeholder="+48..." required>
                </div>
                <div class="form-text small"><i class="bi bi-info-circle me-1"></i>Format: +48XXXXXXXXX</div>
              </div>

              <div v-if="submitError" class="alert alert-danger d-flex align-items-center small">
                <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <div>{{ submitError }}</div>
              </div>

              <button 
                type="submit" 
                class="btn btn-success w-100 py-3 fw-bold shadow-sm" 
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting">
                  <span class="spinner-border spinner-border-sm me-2"></span>Przetwarzanie...
                </span>
                <span v-else>
                  Zamawiam i Płacę <i class="bi bi-arrow-right ms-2"></i>
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>