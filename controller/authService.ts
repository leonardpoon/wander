// controller/authService.ts
// US-01, US-02, US-03, US-04, US-05
// bcrypt operations moved to API routes — runs server-side only

import { userRepository } from '../entity/userRepository'
import { SafeUser } from '../entity/User'

export const authService = {

    // US-05: suggest username if taken
    async suggestUsername(base: string): Promise<string> {
        const exists = await userRepository.usernameExists(base)
        if (!exists) return base

        let counter = 1
        while (counter <= 99) {
            const padded    = counter.toString().padStart(2, '0')
            const candidate = `${base}${padded}`
            const taken     = await userRepository.usernameExists(candidate)
            if (!taken) return candidate
            counter++
        }

        throw new Error('Could not find an available username variant. Try a different name')
    },

    // US-01, US-04: register via API route (bcrypt runs server-side)
    async register(username: string, password: string, displayName?: string): Promise<SafeUser> {
        const response = await fetch('/api/auth/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password, displayName }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Registration failed')
        return data as SafeUser
    },

    // US-03: login via API route (bcrypt runs server-side)
    async login(username: string, password: string): Promise<SafeUser> {
        const response = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Login failed')
        return data as SafeUser
    },
}
