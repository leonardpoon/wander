// US-01, US-03, US-04, US-05
// All DB operations related to the User entity, including registration, authentication, and profile management.

import {supabase} from './supabaseClient'
import {User, CreateUserPayLoad, SafeUser} from './User'

export const userRepository = {

    // US-03, US-05: check if username already exists
    async usernameExists(username: string): Promise<boolean> {
        const {data, error} = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle()
        
        if (error) throw new Error(`usernameExists failed: ${error.message}`)
        return data !== null
    },

    // US-01, US-04: insert new user on registration
    async createUser(payload: CreateUserPayLoad): Promise<SafeUser> {
        const {data, error} = await supabase
            .from('users')
            .insert({
                username: payload.username,
                passphrase_hash: payload.passphrase_hash,
                display_name: payload.display_name ?? null,
                home_currency: payload.home_currency ?? 'SGD',
            })
            .select('*')
            .single()

        if (error) throw new Error(`createUser failed: ${error.message}`)
        return data as SafeUser
    },

    // US-03: fetch full user row by username for login
    async findUsername(username: string): Promise<User | null> {
        const {data,error} = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle()

        if (error) throw new Error(`findByUsername failed: ${error.message}`)
        return data as User | null
    },

    // US-03: update last_seen_at on login
    async updateLastSeen(userId: string): Promise<void> {
        const {error} = await supabase
            .from('users')
            .update({last_seen_at: new Date().toISOString()})
            .eq('id', userId)
        
            if (error) throw new Error(`updateLastSeen failed: ${error.message}`)
    },

    // US-01: fetch safe user by ID used to restore session on app load
    async findById(userId: string): Promise<SafeUser | null> {
        const {data, error} = await supabase
            .from('users')
            .select('id, username, display_name, home_currency, created_at, last_seen_at')
            .eq('id', userId)
            .maybeSingle()

        if (error) throw new Error(`findById failed: ${error.message}`)
        return data as SafeUser | null
    }
}