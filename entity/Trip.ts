// US-06, US-07, US-08, US-09, US-10

export interface Trip {
    id: string
    owner_id: string
    name: string
    start_date: string
    end_date: string
    primary_currency: string
    theme_colour: string | null
    photo_url: string | null
    room_code: string 
    pin_hash: string
    created_at: string
    updated_at: string
}

// Payload for creating a new trip
export interface CreateTripPayload {
    owner_id: string
    name: string
    start_date: string
    end_date: string
    primary_currency?: string
    theme_colour?: string
    photo_url?: string | null
    room_code: string
    pin_hash: string
}

// safe to expose to UI
export interface SafeTrip {
    id: string
    owner_id: string
    name: string
    start_date: string
    end_date: string
    primary_currency: string
    theme_colour: string | null
    photo_url: string | null
    room_code: string
    created_at: string
    updated_at: string
}

export interface TripMember {
    trip_id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    joined_at: string
}