import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Types
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'SALES_ASSOCIATE'
  locationId: string
}

interface Location {
  id: string
  name: string
  address: string
  phone?: string
}

interface AuthState {
  user: User | null
  location: Location | null
  isAuthenticated: boolean
  login: (user: User, location: Location) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        location: null,
        isAuthenticated: false,
        
        login: (user: User, location: Location) => {
          set({ user, location, isAuthenticated: true })
        },
        
        logout: () => {
          set({ user: null, location: null, isAuthenticated: false })
        },
        
        updateUser: (userData: Partial<User>) => {
          const { user } = get()
          if (user) {
            set({ user: { ...user, ...userData } })
          }
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          user: state.user, 
          location: state.location, 
          isAuthenticated: state.isAuthenticated 
        }),
      }
    ),
    {
      name: 'auth-store'
    }
  )
)

// Quote Builder State
interface QuoteItem {
  id: string
  type: 'exam' | 'frame' | 'lens' | 'coating' | 'enhancement' | 'contact'
  productId: string
  name: string
  price: number
  insuranceCoverage?: number
  patientCost: number
}

interface QuoteState {
  items: QuoteItem[]
  totalRetail: number
  totalInsurance: number
  totalPatientCost: number
  currentLayer: 1 | 2 | 3  // 1=Exam, 2=Frame/Lens, 3=Contacts
  addItem: (item: QuoteItem) => void
  removeItem: (itemId: string) => void
  updateItem: (itemId: string, updates: Partial<QuoteItem>) => void
  clearQuote: () => void
  setLayer: (layer: 1 | 2 | 3) => void
  calculateTotals: () => void
}

export const useQuoteStore = create<QuoteState>()(
  devtools(
    (set, get) => ({
      items: [],
      totalRetail: 0,
      totalInsurance: 0,
      totalPatientCost: 0,
      currentLayer: 1,
      
      addItem: (item: QuoteItem) => {
        set((state) => ({
          items: [...state.items, item]
        }))
        get().calculateTotals()
      },
      
      removeItem: (itemId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== itemId)
        }))
        get().calculateTotals()
      },
      
      updateItem: (itemId: string, updates: Partial<QuoteItem>) => {
        set((state) => ({
          items: state.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        }))
        get().calculateTotals()
      },
      
      clearQuote: () => {
        set({
          items: [],
          totalRetail: 0,
          totalInsurance: 0,
          totalPatientCost: 0,
          currentLayer: 1
        })
      },
      
      setLayer: (layer: 1 | 2 | 3) => {
        set({ currentLayer: layer })
      },
      
      calculateTotals: () => {
        const { items } = get()
        const totalRetail = items.reduce((sum, item) => sum + item.price, 0)
        const totalInsurance = items.reduce((sum, item) => sum + (item.insuranceCoverage || 0), 0)
        const totalPatientCost = items.reduce((sum, item) => sum + item.patientCost, 0)
        
        set({ totalRetail, totalInsurance, totalPatientCost })
      }
    }),
    {
      name: 'quote-store'
    }
  )
)