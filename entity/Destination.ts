// US-08: multuple destinations per trip

export interface Destination {
    id: string
    trip_id: string
    name: string
    country_code: string
    local_currency: string
    colour_hex: string
    position: number
    start_date: string
    end_date: string
}

export interface CreateDestinationPayload {
    trip_id: string
    name: string
    country_code: string
    local_currency: string
    colour_hex: string
    position: number
    start_date: string
    end_date: string
}