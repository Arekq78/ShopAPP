import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),

  getters: {
    totalPrice: (state) => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
    },
    itemCount: (state) => {
      return state.items.reduce((count, item) => count + item.quantity, 0)
    }
  },

actions: {
    getStorageKey() {
      try {
        const authStore = useAuthStore()
        if (authStore.user && authStore.user.id) {
          return `cart_user_${authStore.user.id}`
        }
      } catch (e) {
        console.warn('Problem z authStore:', e)
      }
      return 'cart_guest'
    },

    saveCart() {
      try {
        const key = this.getStorageKey()
        localStorage.setItem(key, JSON.stringify(this.items))
      } catch (e) {
        console.error('Błąd zapisu koszyka', e)
      }
    },

    loadCart() {
      try {
        const key = this.getStorageKey()
        const savedData = localStorage.getItem(key)
        
        if (savedData) {
          const parsed = JSON.parse(savedData)
          this.items = Array.isArray(parsed) ? parsed : []
        } else {
          this.items = []
        }
      } catch (e) {
        console.error('Błąd odczytu koszyka', e)
        this.items = []
      }
    },

    addToCart(product) {
      if (!product) return;

      let safePrice = parseFloat(product.price);
      if (isNaN(safePrice)) safePrice = 0;

      const existingItem = this.items.find(item => item.product_id === product.product_id)
      
      if (existingItem) {
        existingItem.quantity++
      } else {
        this.items.push({
          product_id: product.product_id,
          product_name: product.product_name || 'Produkt', 
          price: safePrice, 
          quantity: 1
        })
      }
      this.saveCart()
    },

    removeFromCart(productId) {
      const index = this.items.findIndex(item => item.product_id === productId)
      if (index !== -1) {
        this.items.splice(index, 1)
        this.saveCart()
      }
    },

    clearCart() {
      this.items = []
      this.saveCart()
    },

    updateQuantity(productId, quantity) {
        const item = this.items.find(i => i.product_id === productId);
        if(item) {
            item.quantity = quantity;
            if(item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
            }
        }
    }
  }
})