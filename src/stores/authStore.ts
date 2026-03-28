import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  authenticate: (pin: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      authenticate: (pin: string): boolean => {
        const correctPin = import.meta.env.VITE_APP_PIN || '1234'
        if (pin === correctPin) {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },

      logout: () => {
        set({ isAuthenticated: false })
      },
    }),
    {
      name: 'rpi-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
