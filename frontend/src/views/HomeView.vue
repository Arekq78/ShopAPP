<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'

const cartStore = useCartStore()
const authStore = useAuthStore() 

const products = ref([])
const categories = ref([])
const isLoading = ref(true)
const error = ref('')

const searchName = ref('')
const selectedCategory = ref('')

const activeProduct = ref({}) 

onMounted(async () => {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      axios.get('http://localhost:3000/api/products'),
      axios.get('http://localhost:3000/api/categories')
    ])
    
    products.value = productsRes.data
    categories.value = categoriesRes.data
  } catch (err) {
    error.value = 'Nie udało się pobrać danych z serwera.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
})

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesName = product.product_name.toLowerCase().includes(searchName.value.toLowerCase())
    const matchesCategory = selectedCategory.value 
      ? product.category_id == selectedCategory.value 
      : true
    return matchesName && matchesCategory
  })
})

function handleBuy(product) {
  cartStore.addToCart(product)
  alert(`Dodano do koszyka: ${product.product_name}`)
}

function openDescriptionModal(product) {
  activeProduct.value = product
}
</script>

<template>
  <div class="container py-5">
    
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h2 class="fw-bold text-dark mb-1">
          <i class="bi bi-shop-window me-2 text-primary"></i>Oferta Sklepu
        </h2>
        <p class="text-muted mb-0">Przeglądaj dostępne produkty i kategorie</p>
      </div>
    </div>

    <div v-if="isLoading" class="alert alert-info shadow-sm border-0 d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-3" role="status"></div>
      Ładowanie produktów...
    </div>
    <div v-if="error" class="alert alert-danger shadow-sm border-0">
      <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
    </div>

    <div class="card shadow-sm border-0 mb-4 bg-white">
      <div class="card-body p-4">
        <div class="row g-3 align-items-end">
          
          <div class="col-md-6">
            <label class="form-label small text-uppercase fw-bold text-muted mb-1">Szukaj produktu</label>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input 
                v-model="searchName" 
                type="text" 
                class="form-control bg-light border-start-0 ps-0" 
                placeholder="Wpisz nazwę, np. Laptop..."
              >
            </div>
          </div>
          
          <div class="col-md-6">
            <label class="form-label small text-uppercase fw-bold text-muted mb-1">Kategoria</label>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-tags"></i></span>
              <select v-model="selectedCategory" class="form-select bg-light border-start-0 ps-1" style="cursor: pointer;">
                <option value="">Wszystkie kategorie</option>
                <option 
                  v-for="cat in categories" 
                  :key="cat.category_id" 
                  :value="cat.category_id"
                >
                  {{ cat.category_name }}
                </option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0" v-if="!isLoading">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="bg-light border-bottom">
            <tr>
              <th class="ps-4 py-2 text-uppercase small fw-bold text-secondary">Nazwa Produktu</th>
              <th class="py-2 text-uppercase small fw-bold text-secondary">Kategoria</th>
              <th class="py-2 text-center text-uppercase small fw-bold text-secondary">Szczegóły</th>
              <th class="py-2 text-uppercase small fw-bold text-secondary">Waga</th>
              <th class="py-2 text-uppercase small fw-bold text-secondary">Cena</th>
              <th class="ps-5 py-2 text-uppercase small fw-bold text-secondary" style="min-width: 150px;">Akcja</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.product_id">
              
              <td class="ps-4">
                <div class="fw-bold text-dark fs-6">{{ product.product_name }}</div>
              </td>
              
              <td>
                <span class="badge rounded-pill bg-warning text-dark border border-warning fw-normal px-3">
                  {{ product.category_name }}
                </span>
              </td>
              
              <td class="text-center">
                <button 
                  class="btn btn-outline-primary btn-sm" 
                  data-bs-toggle="modal" 
                  data-bs-target="#descriptionModal"
                  @click="openDescriptionModal(product)"
                  title="Zobacz opis"
                >
                  <i class="bi bi-eye"></i> Podgląd
                </button>
              </td>

              <td class="text-muted small">
                <i class="bi bi-box-seam me-1"></i>{{ product.weight }} kg
              </td>
              
              <td>
                <div class="fw-bold text-price fs-5">{{ product.price }} zł</div>
              </td>
              
              <td class="text-end pe-4">
                <button 
                  v-if="!authStore.isEmployee"
                  @click="handleBuy(product)" 
                  class="btn btn-success btn-sm rounded-pill px-3 fw-bold shadow-sm"
                >
                  <i class="bi bi-cart-plus me-1"></i> Do koszyka
                </button>

                <router-link 
                  v-if="authStore.isEmployee"
                  :to="`/admin/product/edit/${product.product_id}`" 
                  class="btn btn-outline-warning btn-sm px-3 fw-bold"
                >
                  <i class="bi bi-pencil-square me-1"></i> Edytuj
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="filteredProducts.length === 0" class="text-center py-5">
        <i class="bi bi-search display-4 text-light mb-3"></i>
        <h4 class="text-muted">Nie znaleziono produktów.</h4>
        <p class="text-secondary small">Spróbuj zmienić kryteria wyszukiwania.</p>
      </div>
    </div>

    <div class="modal fade" id="descriptionModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
          
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold display-6 fs-4">{{ activeProduct.product_name }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div class="modal-body pt-2">
            <span class="badge bg-warning text-dark mb-3">{{ activeProduct.category_name }}</span>
            
            <div class="p-3 bg-light rounded border">
              <div v-if="activeProduct.description" v-html="activeProduct.description" class="text-secondary"></div>
              <div v-else class="text-muted fst-italic">Ten produkt nie posiada jeszcze opisu.</div>
            </div>
          </div>
          
          <div class="modal-footer border-top-0 pt-0">
            <div class="d-flex justify-content-between w-100 align-items-center">
              <div>
                <small class="text-muted text-uppercase fw-bold d-block">Aktualna cena</small>
                <div class="text-danger fw-bold display-6 fs-3">{{ activeProduct.price }} zł</div>
              </div>
              
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">Zamknij</button>
                <button 
                  v-if="!authStore.isEmployee"
                  type="button" 
                  class="btn btn-success px-4 fw-bold shadow-sm" 
                  @click="handleBuy(activeProduct)"
                  data-bs-dismiss="modal" 
                >
                  <i class="bi bi-bag-check me-2"></i>Kup teraz
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>