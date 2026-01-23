import { defineStore } from 'pinia'
import axios from 'axios'
import router from '../router'
import { jwtDecode } from 'jwt-decode'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    user: JSON.parse(localStorage.getItem('user')) || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    
    isEmployee: (state) => state.user?.role === 'PRACOWNIK',
    
    authHeader: (state) => {
      return state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}
    }
  },

  actions: {
    async login(username, password) {
      try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
          username,
          password
        })

        const { accessToken: newAccess, refreshToken: newRefresh } = response.data
        const decoded = jwtDecode(newAccess)

        this.accessToken = newAccess
        this.refreshToken = newRefresh
        
        this.user = {
          id: decoded.id,
          role: decoded.role,
          username: username
        }

        localStorage.setItem('accessToken', newAccess)
        localStorage.setItem('refreshToken', newRefresh)
        localStorage.setItem('user', JSON.stringify(this.user))

        if (this.isEmployee) {
          router.push('/admin/orders')
        } else {
          router.push('/')
        }

        return true
      } catch (error) {
        console.error('Błąd logowania:', error)
        throw error
      }
    },

    async register(username, password) {
      try {
        await axios.post('http://localhost:3000/api/auth/register', {
          username,
          password,
          role: 'KLIENT'
        })
        router.push('/login')
      } catch (error) {
        console.error('Błąd rejestracji:', error)
        throw error
      }
    },

    async logout() {
      try {
        if (this.refreshToken) {
          await axios.post('http://localhost:3000/api/auth/logout', {
            token: this.refreshToken
          })
        }
      } catch (err) {
        console.error("Błąd podczas wylogowywania z serwera", err)
      } finally {
        this.accessToken = ''
        this.refreshToken = ''
        this.user = null
        
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        router.push('/login')
      }
    }
  }
})