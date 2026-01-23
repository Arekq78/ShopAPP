<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const orders = ref([])
const isLoading = ref(true)
const errorMsg = ref('')

const opinionForm = ref({
  orderId: null,
  rating: 5,
  content: ''
})

const fetchOrders = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/orders/my-orders', {
      headers: authStore.authHeader
    })
    orders.value = response.data
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Nie udało się pobrać historii zamówień.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchOrders)

const openOpinionModal = (orderId) => {
  opinionForm.value = { orderId, rating: 5, content: '' }
}

const submitOpinion = async () => {
  try {
    await axios.post(
      `http://localhost:3000/api/orders/${opinionForm.value.orderId}/opinions`,
      {
        rating: opinionForm.value.rating,
        content: opinionForm.value.content
      },
      getHeaders()
    )
    alert('Dziękujemy za opinię!')
    
    // Odśwież listę, żeby przycisk zniknął, a pojawiła się ocena
    await fetchOrders() 
  } catch (err) {
    alert(err.response?.data?.details || 'Błąd dodawania opinii')
  }
}

const canAddOpinion = (order) => {
  const finishedStatuses = ['ZREALIZOWANE', 'ANULOWANE'];
  
  const isFinished = finishedStatuses.includes(order.status_name);
  const hasOpinion = order.rating != null;
  
  return isFinished && !hasOpinion;
}
</script>

<template>
  <div class="container py-5">
    
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h2 class="fw-bold text-dark mb-1">
          <i class="bi bi-receipt me-2 text-primary"></i>Moje Zamówienia
        </h2>
        <p class="text-muted mb-0">Śledź status swoich zakupów i dodawaj opinie</p>
      </div>
    </div>

    <div v-if="isLoading" class="alert alert-info shadow-sm border-0 d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-3" role="status"></div>
      Ładowanie historii zamówień...
    </div>
    <div v-if="errorMsg" class="alert alert-danger shadow-sm border-0">
      <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ errorMsg }}
    </div>

    <div v-if="!isLoading && orders.length === 0" class="text-center py-5 bg-light rounded-3 border border-dashed">
      <i class="bi bi-bag-x display-1 text-muted mb-3 d-block opacity-50"></i>
      <h4 class="text-muted fw-normal">Nie masz jeszcze żadnych zamówień.</h4>
      <p class="mb-4 text-secondary">To idealny moment, aby coś kupić!</p>
      <router-link to="/" class="btn btn-primary px-4 rounded-pill fw-bold">
        <i class="bi bi-arrow-left me-2"></i>Wróć do sklepu
      </router-link>
    </div>

    <div v-else class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="bg-light border-bottom">
            <tr>
              <th class="ps-4 text-uppercase small fw-bold text-secondary">Data złożenia</th>
              <th class="text-uppercase small fw-bold text-secondary">Klient</th>
              <th class="text-uppercase small fw-bold text-secondary">Status</th>
              <th class="text-end pe-4 text-uppercase small fw-bold text-secondary" style="min-width: 200px;">Opinia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.order_id">
              
              <td class="ps-4 fw-bold text-dark">
                {{ new Date(order.order_date).toLocaleDateString('pl-PL') }}
              </td>
              
              <td>
                <span class="fw-bold text-secondary">{{ order.customer_name }}</span>
              </td>
              
              <td>
                <span class="badge rounded-pill px-3 py-2 fw-normal border" :class="{
                  'bg-success text-white border-success': order.status_name?.toUpperCase() === 'ZREALIZOWANE',
                  'bg-danger text-white border-danger': order.status_name?.toUpperCase() === 'ANULOWANE',
                  'bg-primary text-white border-primary': order.status_name?.toUpperCase() === 'ZATWIERDZONE',
                  'bg-warning text-dark border-warning': ['NIEZATWIERDZONE', 'NOWE', 'W TRAKCIE REALIZACJI'].includes(order.status_name?.toUpperCase())
                }">
                  {{ order.status_name }}
                </span>
              </td>
              
              <td class="text-end pe-4">
                <div v-if="order.rating" class="bg-light p-2 rounded border text-start">
                  <div class="fw-bold text-warning mb-1">★ {{ order.rating }}/5</div>
                  <div class="text-secondary small fst-italic text-truncate">"{{ order.content }}"</div>
                </div>

                <button 
                  v-else-if="canAddOpinion(order)"
                  class="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold"
                  data-bs-toggle="modal" 
                  data-bs-target="#opinionModal"
                  @click="openOpinionModal(order.order_id)"
                >
                  <i class="bi bi-star me-1"></i> Dodaj Opinię
                </button>
                
                <span v-else class="badge bg-light text-muted border fw-normal">
                  <i class="bi bi-lock me-1"></i> Dostępne po zakończeniu
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="opinionModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          
          <div class="modal-header border-bottom-0">
            <h5 class="modal-title fw-bold">Oceń zamówienie <span class="text-primary">#{{ opinionForm.orderId }}</span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body pt-0">
            <p class="text-muted small mb-4">Twoja opinia pomoże nam ulepszać nasze usługi.</p>
            
            <form @submit.prevent="submitOpinion">
              <div class="mb-3">
                <label class="form-label small text-uppercase fw-bold text-muted">Twoja ocena</label>
                <select v-model.number="opinionForm.rating" class="form-select bg-light border-0 py-2 fw-bold text-warning" required style="cursor: pointer;">
                  <option value="5" class="text-dark">⭐⭐⭐⭐⭐ (5) - Super</option>
                  <option value="4" class="text-dark">⭐⭐⭐⭐ (4) - Dobrze</option>
                  <option value="3" class="text-dark">⭐⭐⭐ (3) - Może być</option>
                  <option value="2" class="text-dark">⭐⭐ (2) - Słabo</option>
                  <option value="1" class="text-dark">⭐ (1) - Unikać</option>
                </select>
              </div>
              
              <div class="mb-4">
                <label class="form-label small text-uppercase fw-bold text-muted">Komentarz</label>
                <textarea 
                  v-model="opinionForm.content" 
                  class="form-control bg-light border-0" 
                  rows="4" 
                  placeholder="Napisz kilka słów o zamówieniu..."
                  required
                ></textarea>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-outline-secondary px-4 rounded-pill" data-bs-dismiss="modal">Anuluj</button>
                <button type="submit" class="btn btn-primary px-4 fw-bold rounded-pill shadow-sm" data-bs-dismiss="modal">
                  <i class="bi bi-send me-2"></i>Wyślij opinię
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>