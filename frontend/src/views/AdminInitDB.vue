<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const fileContent = ref(null)
const selectedFileName = ref('')
const fileType = ref('')

const isLoading = ref(false)
const statusMessage = ref('')
const statusType = ref('')

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  selectedFileName.value = file.name
  statusMessage.value = ''

  if (file.name.endsWith('.json')) {
    fileType.value = 'application/json'
  } else if (file.name.endsWith('.csv')) {
    fileType.value = 'text/csv'
  } else {
    statusMessage.value = 'Nieobsługiwany format pliku. Wybierz .json lub .csv'
    statusType.value = 'danger'
    fileContent.value = null
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    let content = e.target.result
    
    if (fileType.value === 'application/json') {
      try {
        fileContent.value = JSON.parse(content)
      } catch (err) {
        statusMessage.value = 'Błąd w pliku JSON. Niepoprawna składnia.'
        statusType.value = 'danger'
        fileContent.value = null
      }
    } else {
      fileContent.value = content
    }
  }
  reader.readAsText(file)
}

const initDatabase = async () => {
  if (!fileContent.value) return

  if (!confirm('Czy na pewno chcesz zainicjować bazę? Ta operacja wymaga pustej tabeli produktów.')) {
    return
  }

  isLoading.value = true
  statusMessage.value = ''

  try {
    const response = await axios.post(
      'http://localhost:3000/api/admin/init',
      fileContent.value, 
      {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': fileType.value
        }
      }
    )

    statusMessage.value = `Sukces! Dodano ${response.data.added_count} produktów.`
    statusType.value = 'success'
    
  } catch (err) {
    console.error(err)
    statusType.value = 'danger'
    
    const problem = err.response?.data
    if (problem) {
      if (err.response.status === 409) {
        statusMessage.value = `Błąd: ${problem.title}. ${problem.details} (Liczba produktów w bazie: ${problem.number_of_products})`
      } else if (problem.missing_categorie) {
        statusMessage.value = `Błąd: Brakuje kategorii o ID: ${problem.missing_categorie.join(', ')}`
      } else {
        statusMessage.value = `Błąd: ${problem.title || 'Wystąpił problem'}. ${problem.details || ''}`
      }
    } else {
      statusMessage.value = 'Wystąpił błąd połączenia z serwerem.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container mt-5">
    <div class="card shadow">
      <div class="card-header bg-danger text-white">
        <h3 class="mb-0">⚠️ Inicjalizacja Bazy Danych</h3>
      </div>
      <div class="card-body">
        <p class="lead">
          Tutaj możesz masowo wgrać produkty do sklepu.
          <br>
          <small class="text-muted">
            Wymagania: Tabela produktów musi być pusta. Kategorie muszą już istnieć.
          </small>
        </p>

        <div v-if="statusMessage" :class="`alert alert-${statusType}`" role="alert">
          {{ statusMessage }}
        </div>

        <div class="mb-4">
          <label class="form-label fw-bold">Wybierz plik z danymi (.json lub .csv)</label>
          <input 
            type="file" 
            class="form-control" 
            accept=".json,.csv"
            @change="handleFileUpload"
          >
          <div class="form-text">
            Format CSV: <code>product_name,category_id,description,price,weight</code><br>
            Format JSON: <code>[{ "product_name": "...", ... }]</code>
          </div>
        </div>

        <div v-if="selectedFileName" class="mb-3 p-2 bg-light border rounded">
          <strong>Wybrany plik:</strong> {{ selectedFileName }} 
          <span class="badge bg-secondary">{{ fileType }}</span>
        </div>

        <button 
          @click="initDatabase" 
          class="btn btn-danger w-100 py-2 fw-bold"
          :disabled="!fileContent || isLoading"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
          {{ isLoading ? 'Przetwarzanie...' : 'ZAŁADUJ DANE DO BAZY' }}
        </button>

      </div>
    </div>
  </div>
</template>