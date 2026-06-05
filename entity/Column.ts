// US-06: Kanban columns

export interface TripColumn {
    id: string
    trip_id: string
    destination_id: string
    date: string
    label: string | null
    position: number
}

export interface CreateColumnPayload {
    trip_id: string
    destination_id: string
    date: string
    label?: string
    position: number
}