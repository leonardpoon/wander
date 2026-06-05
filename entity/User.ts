//US-01, US-03, US-04

export interface User {
    id: string
    username: string
    passphrase_hash: string
    display_name: string | null
    home_currency: string
    created_at: string
    last_seen_at: string | null
}

// send to the DB on registration
export interface CreateUserPayLoad {
    username: string
    passphrase_hash: string
    display_name?: string
    home_currency?: string
}

// exposed to the UI
export interface SafeUser {
    id: string
    username: string
    display_name: string | null
    home_currency: string
    created_at: string
    last_seen_at: string | null
}