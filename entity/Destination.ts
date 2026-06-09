// US-08: multiple destinations per trip

export interface Destination {
    id:             string
    trip_id:        string
    name:           string
    country_code:   string
    local_currency: string
    colour_hex:     string
    position:       number
    start_date:     string
    end_date:       string
    lat:            number | null   // US-15: geocoded via Nominatim
    lng:            number | null
}

export interface CreateDestinationPayload {
    trip_id:        string
    name:           string
    country_code:   string
    local_currency: string
    colour_hex:     string
    position:       number
    start_date:     string
    end_date:       string
    lat?:           number | null
    lng?:           number | null
}