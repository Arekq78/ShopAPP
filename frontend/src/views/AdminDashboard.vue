<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const orders = ref([])
const statuses = ref([])
const isLoading = ref(true)
const errorMsg = ref('')
const selectedStatus = ref('')

onMounted(async () => {
  try {
    const config = { headers: authStore.authHeader }

    const [ordersRes, statusRes] = await Promise.all([
      axios.get('http://localhost:3000/api/orders', config),
      axios.get('http://localhost:3000/api/status', config)
    ])
    
    orders.value = ordersRes.data
    statuses.value = statusRes.data
  } catch (err) {
    errorMsg.value = 'Nie udało się pobrać danych. Sprawdź czy masz uprawnienia PRACOWNIKA.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
})

const filteredOrders = computed(() => {
  if (!selectedStatus.value) return orders.value
  return orders.value.filter(order => order.status_id == selectedStatus.value)
})

const changeStatus = async (orderId, newStatusId) => {
  if(!confirm('Czy na pewno chcesz zmienić status tego zamówienia?')) return;

  try {
    await axios.patch(`http://localhost:3000/api/orders/${orderId}`, {
      new_status_id: newStatusId
    }, { headers: authStore.authHeader })

    const order = orders.value.find(o => o.order_id === orderId)
    if (order) {
      order.status_id = newStatusId
      const statusObj = statuses.value.find(s => s.status_id === newStatusId)
      if(statusObj) order.status_name = statusObj.status_name
    }
    alert('Status zmieniony!')
  } catch (err) {
    alert(err.response?.data?.details || 'Błąd zmiany statusu')
  }
}

const getStatusBadge = (statusName) => {
  switch(statusName.toUpperCase()) {
    case 'NIEZATWIERDZONE': 
      return 'bg-warning text-dark';            
    case 'ZREALIZOWANE':    
      return 'bg-success';            
    case 'ANULOWANE':       
      return 'bg-danger';           
    default:                
      return 'bg-secondary';         
  }
}
</script>

<template>
  <div class="container mt-5">
    
    <div class="card shadow-sm border-0">
      
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
        <div>
          <h4 class="mb-0 fw-bold text-dark">Zamówienia</h4>
          <small class="text-muted">Zarządzaj statusem i przeglądaj opinie</small>
        </div>
        
        <div class="d-flex align-items-center bg-light rounded px-3 py-2">
          <span class="text-muted small fw-bold text-uppercase me-2" style="font-size: 0.75rem; letter-spacing: 1px;">Status:</span>
          <select v-model="selectedStatus" class="form-select form-select-sm border-0 bg-transparent shadow-none" style="width: 160px; font-weight: 500;">
            <option value="">Wszystkie</option>
            <option 
              v-for="s in statuses.filter(s => s.status_id !== 2)" 
              :key="s.status_id" 
              :value="s.status_id"
            >
              {{ s.status_name }}
            </option>
          </select>
        </div>
      </div>

      <div class="card-body p-0">
        
        <div v-if="errorMsg" class="alert alert-danger m-3 rounded-0">{{ errorMsg }}</div>
        
        <div v-if="isLoading" class="p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Ładowanie danych...</div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            
            <thead class="bg-light border-bottom">
              <tr>
                <th class="ps-4 py-3 text-uppercase small fw-bold text-secondary">ID</th>
                <th class="text-uppercase small fw-bold text-secondary">Data Zamówienia</th>
                <th class="text-uppercase small fw-bold text-secondary">Klient</th>
                <th class="text-uppercase small fw-bold text-secondary">Status</th>
                <th class="text-uppercase small fw-bold text-secondary" style="width: 25%;">Opinia</th>
                <th class="text-end pe-4 text-uppercase small fw-bold text-secondary">Zarządzaj</th>
              </tr>
            </thead>
            
            <tbody>
              <tr v-for="order in filteredOrders" :key="order.order_id">
                
                <td class="ps-4 fw-bold text-primary">
                  #{{ order.order_id }}
                </td>
                
                <td class="fw-bold text-dark">
                  {{ order.order_date ? new Date(order.order_date).toLocaleDateString('pl-PL') : '-' }}
                </td>
                
                <td>
                  <div class="fw-bold">{{ order.customer_name || 'Brak danych' }}</div>
                  <div class="text-muted small" style="font-family: monospace;">{{ order.email }}</div>
                </td>
                
                <td>
                  <span class="badge rounded-pill px-3 py-2 fw-normal" :class="getStatusBadge(order.status_name)">
                    {{ order.status_name }}
                  </span>
                </td>
                
                <td>
                  <div v-if="order.rating" class="bg-light p-2 rounded border" style="font-size: 0.85rem;">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="fw-bold text-warning">★ {{ order.rating }}/5</span>
                    </div>
                    <div class="text-dark fst-italic">"{{ order.content }}"</div>
                  </div>
                  <span v-else class="text-muted small opacity-50">Brak opinii</span>
                </td>
                
                <td class="text-end pe-4">
                  <div v-if="![3, 4].includes(order.status_id)" class="d-flex gap-2 justify-content-end">
                    <button 
                      class="btn btn-sm btn-success px-3 fw-bold" 
                      @click="changeStatus(order.order_id, 4)"
                    >
                      Zrealizuj
                    </button>
                    <button 
                      class="btn btn-sm btn-outline-danger px-3" 
                      @click="changeStatus(order.order_id, 3)"
                    >
                      Anuluj
                    </button>
                  </div>
                  <div v-else class="text-muted small text-uppercase fw-bold ls-1">
                    Zakończone
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-if="!isLoading && filteredOrders.length === 0" class="card-footer bg-white text-center py-5 border-0">
        <h5 class="text-muted">Brak zamówień spełniających kryteria.</h5>
        <p class="small text-muted mb-0">Spróbuj zmienić filtry wyszukiwania.</p>
      </div>

    </div>
  </div>
</template>