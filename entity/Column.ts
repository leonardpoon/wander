// US-06: Kanban columns

export interface TripColumn {
    id:              string
    trip_id:         string
    destintation_id: string    // note: intentional typo matching DB column
    date:            string
    label:           string | null
    position:        number
}

// alias — used in pages/trip/[id].tsx
export type Column = TripColumn

export interface CreateColumnPayload {
    trip_id:         string
    destintation_id: string
    date:            string
    label?:          string
    position:        number
}
