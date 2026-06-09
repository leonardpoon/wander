// US-06, US-07, US-08, US-09, US-10

export interface Trip {
    id:               string
    owner_id:         string
    name:             string
    start_date:       string
    end_date:         string
    primary_currency: string
    home_currency:    string | null    // US-25: for FX conversion display
    theme_colour:     string | null
    accent_color:     string | null    // alias used in UI
    photo_url:        string | null
    hero_image_url:   string | null    // alias used in UI
    primary_destination: string | null // first destination name — denormalised for list view
    room_code:        string
    pin_hash:         string
    created_at:       string
    updated_at:       string
}

export interface CreateTripPayload {
    owner_id:         string
    name:             string
    start_date:       string
    end_date:         string
    primary_currency?: string
    home_currency?:   string
    theme_colour?:    string
    photo_url?:       string | null
    room_code:        string
    pin_hash:         string
}

export interface SafeTrip {
    id:               string
    owner_id:         string
    name:             string
    start_date:       string
    end_date:         string
    primary_currency: string
    home_currency:    string | null
    theme_colour:     string | null
    accent_color:     string | null
    photo_url:        string | null
    hero_image_url:   string | null
    primary_destination: string | null
    room_code:        string
    created_at:       string
    updated_at:       string
}

export interface TripMember {
    trip_id:   string
    user_id:   string
    role:      'owner' | 'editor' | 'viewer'
    joined_at: string
}