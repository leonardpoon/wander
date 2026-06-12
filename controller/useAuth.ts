// US-01, US-02, US-03, US-04, US-05

import {useSessionStore} from './sessionStore'
import {authService} from './authService'
import {userRepository} from '../entity/userRepository'

export function useAuth() {
    const {setUser, clearUser, setLoading, setError, persistSession, getPersistedSession, clearPersistedSession} = useSessionStore()

    // US-01, US-04: register new user
    async function register(username: string, password: string, displayName?: string) {
        setLoading(true)
        setError(null)
        try {
            const user = await authService.register(username, password, displayName)
            setUser(user)
            persistSession(user.id)
            return user
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // US-03: log in returning user
    async function login(username: string, password: string) {
        setLoading(true)
        setError(null)
        try {
            const user = await authService.login(username, password)
            setUser(user)
            persistSession(user.id)
            return user
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // US-01: on app load check localStorage for existing session
    async function restoreSession() {
        setLoading(true)
        try {
            const userId = getPersistedSession()
            if (!userId) return null

            // fetch user by ID to restore full SafeUser object
            const user = await userRepository.findById(userId)
            if (user) {
                setUser(user)
                return user
            } else {
                // session ID in localStorage but user not found -> clear it
                clearPersistedSession()
                return null
            }
        } catch (err: any) {
            clearPersistedSession()
            return null
        } finally {
            setLoading(false)
        }
    }

    // US-05: check username suggestion before registration
    async function suggestUsername(base: string) {
        return await authService.suggestUsername(base)
    }

    // logout
    function logout() {
        clearUser()
        clearPersistedSession()
    }

    return {register, login, logout, restoreSession, suggestUsername}
}
