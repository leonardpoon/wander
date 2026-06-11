// US-11 to US-18: kanban cards
// US-32: votes
// US-33 to US-34: packling list
// US-35 to US-38: to-do board

// US-14: top-level categories. Built-ins use known ids; trips can add custom ids.
export type CardCategory = string

// sub categories for eating
export type EatingSubCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Cafe' | 'Bar' | 'Tea' | 'Brunch'

// travel sub-categories 
export type TravelSubCategory = 'Flight' | 'Train' | 'Bus' | 'Ferry' | 'Taxi' | 'Cycle' | 'Walk' | 'Car Rental' | 'Accommodation'

export type CardSubCategory = EatingSubCategory | TravelSubCategory | string | null

// cards
export interface Card {
    id: string
    column_id: string
    trip_id: string
    category: CardCategory
    sub_category: string | null
    title: string
    location_name: string | null
    lat: number | null
    lng: number | null
    fixed_time: boolean
    time_value: string | null
    budget_amount: number | null
    budget_currency: string | null
    notes: string | null
    position: number
    created_at: string
    updated_at: string
    created_by: string
}

// US-11
// payload for creating new card
export interface CreateCardPayload {
    column_id: string
    trip_id: string
    category: CardCategory
    sub_category?: string | null
    title: string
    location_name?: string | null
    lat?: number | null
    lng?: number | null
    fixed_time?: boolean
    time_value?: string | null
    budget_amount?: number | null
    budget_currency?: string | null
    notes?: string | null
    position: number
    created_by: string
}

// US-18
// payload for updating card
export interface UpdateCardPayload {
    column_id?: string
    category?: CardCategory
    sub_category?: string | null
    title?: string
    location_name?: string | null
    lat?: number | null
    lng?: number | null
    fixed_time?: boolean
    time_value?: string | null
    budget_amount?: number | null
    budget_currency?: string | null
    notes?: string | null
    position?: number
}

// US-32: up/down votes on shared trip cards
export interface CardVote {
    id: string
    card_id: string
    user_id: string
    vote: 'up' | 'down'
    created_at: string
}

// votes tally
export interface CardVoteTally {
    card_id: string
    up: number
    down: number
    user_vote: 'up' | 'down' | null
}

// US-33, US-34: packing list items
export interface PackingItem {
    id: string
    trip_id: string
    label: string
    checked: boolean
    position: number
    created_by: string
    created_at: string
}

export interface CreatePackingItemPayload {
    trip_id: string
    label: string
    position: number
    created_by: string
}

// US-35 to US-38: separate kanban bpoard for trip prep task
export interface TodoColumn {
    id: string
    trip_id: string
    label: string
    position: number
}

export interface CreateTodoColumnPayload {
    trip_id: string
    label: string
    position: number
}

export interface UpdateTodoColumnPayload {
    label?: string
    position?: number
}

export interface TodoCard {
    id: string
    trip_id: string
    column_id: string
    title: string
    assigned_to_user_id: string | null
    assigned_to_name: string | null
    due_date: string | null
    notes: string | null
    position: number
    created_at: string
}

export interface CreateTodoCardPayload {
    trip_id: string
    column_id: string
    title: string
    assigned_to_user_id?: string | null
    assigned_to_name?: string | null
    due_date?: string | null
    notes?: string | null
    position: number
}

export interface UpdateTodoCardPayload {
    column_id?: string
    title?: string
    assigned_to_user_id?: string | null
    assigned_to_name?: string | null
    due_date?: string | null
    notes?: string | null
    position?: number
}

// US-45: every pipline run is logged
export interface PipelineRun {
    id: string
    pipeline_name: string
    started_at: string
    finished_at: string | null
    status: 'running' | 'success' | 'failed'
    rows_inserted: number | null
    error_message: string | null
}
