// Zustand store — holds the current logged-in user in memory
// localStorage used for session persistence across page refreshes

import { create } from 'zustand'
import { SafeUser } from '../entity/User'

const SESSION_KEY = 'wander_user_id'

interface SessionState {
  user: SafeUser | null
  isLoading: boolean
  error: string | null

  setUser: (user: SafeUser) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // US-03: Persist user ID to localStorage so session survives page refresh
  persistSession: (userId: string) => void

  // US-01: Read persisted session on app load — returns userId or null
  getPersistedSession: () => string | null

  // Clear persisted session on logout
  clearPersistedSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, error: null }),
  clearUser: () => set({ user: null, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // US-03: Save userId to localStorage after login/register
  persistSession: (userId: string) => {
    localStorage.setItem(SESSION_KEY, userId)
  },

  // US-01: Check localStorage on app launch for existing session
  getPersistedSession: () => {
    return localStorage.getItem(SESSION_KEY)
  },

  // Clear localStorage on logout
  clearPersistedSession: () => {
    localStorage.removeItem(SESSION_KEY)
  },

}))