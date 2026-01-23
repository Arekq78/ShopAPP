<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const productId = route.params.id

const product = ref({
  product_name: '',
  category_id: '',
  description: '',
  price: 0,
  weight: 0
})

const categories = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const isGeneratingAI = ref(false)
const errorMsg = ref('')

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${authStore.accessToken}` }
})

onMounted(async () => {
  try {
    const [productRes, categoriesRes] = await Promise.all([
      axios.get(`http://localhost:3000/api/products/${productId}`),
      axios.get('http://localhost:3000/api/categories')
    ])

    product.value = productRes.data
    categories.value = categoriesRes.data
  } catch (err) {
    errorMsg.value = 'Nie udało się pobrać danych produktu.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
})

const optimizeDescription = async () => {
  isGeneratingAI.value = true
  errorMsg.value = ''

  try {
    const response = await axios.get(
      `http://localhost:3000/api/products/${productId}/seo-description`,
      getHeaders() 
    )

    product.value.description = response.data.seo_description_html
    alert('Opis wygenerowany przez AI!')
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Błąd generowania opisu AI.'
  } finally {
    isGeneratingAI.value = false
  }
}

const saveProduct = async () => {
  isSaving.value = true
  errorMsg.value = ''

  try {
    await axios.put(
      `http://localhost:3000/api/products/${productId}`, 
      product.value, 
      getHeaders() 
    )
    alert('Produkt zaktualizowany pomyślnie!')
    router.push('/')
  } catch (err) {
    console.error(err)
    errorMsg.value = err.response?.data?.details || 'Błąd zapisu produktu.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="container mt-4 mb-5">
    <h1>Edycja Produktu</h1>
    
    <div v-if="isLoading" class="alert alert-info">Ładowanie danych...</div>
    <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

    <div v-if="!isLoading" class="card shadow">
      <div class="card-body">
        <form @submit.prevent="saveProduct">
          
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Nazwa Produktu</label>
              <input v-model="product.product_name" type="text" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Kategoria</label>
              <select v-model="product.category_id" class="form-select" required>
                <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
                  {{ cat.category_name }}
                </option>
              </select>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Cena (PLN)</label>
              <input v-model.number="product.price" type="number" step="1" min="0" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Waga (kg)</label>
              <input v-model.number="product.weight" type="number" step="0.1" min="0" class="form-control" required>
            </div>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-bold">Opis Produktu (Edytor HTML)</label>
              <button 
                type="button" 
                class="btn btn-outline-primary btn-sm" 
                @click="optimizeDescription"
                :disabled="isGeneratingAI"
              >
                <span v-if="isGeneratingAI" class="spinner-border spinner-border-sm me-1"></span>
                <span v-if="!isGeneratingAI">✨</span> 
                {{ isGeneratingAI ? 'Generowanie...' : 'Optymalizuj opis (AI)' }}
              </button>
            </div>
            <textarea 
                v-model="product.description" 
                class="form-control font-monospace" 
                rows="8" 
                placeholder="Tutaj pojawi się kod HTML..."
                required
            ></textarea>
             <div class="form-text">Edytujesz surowy kod HTML. Zmiany zobaczysz w podglądzie poniżej.</div>
          </div>

          <div class="card mb-4">
            <div class="card-header bg-light fw-bold small">
              Podgląd na żywo (To zobaczy klient):
            </div>
            <div class="card-body preview-box" v-html="product.description"></div>
          </div>

          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-success" :disabled="isSaving">
              {{ isSaving ? 'Zapisywanie...' : 'Zapisz Zmiany' }}
            </button>
            <router-link to="/" class="btn btn-secondary">Anuluj</router-link>
          </div>

        </form>
      </div>
    </div>
  </div>
</template>
