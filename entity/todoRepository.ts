// US-35 to US-38: to-do board database access

import {supabase} from './supabaseClient'
import {TodoColumn, CreateTodoColumnPayload, UpdateTodoColumnPayload, TodoCard, CreateTodoCardPayload, UpdateTodoCardPayload} from './Cards'

export const todoRepository = {

    // fetch all columns for a trip ordered by position
    async findColumnsByTrip(tripId: string): Promise<TodoColumn[]> {
        const {data, error} = await supabase
            .from('todo_columns')
            .select('*')
            .eq('trip_id', tripId)
            .order('position', {ascending: true})

        if (error) throw new Error(`findColumnsByTrip failed: ${error.message}`)
        return data as TodoColumn[]
    },

    // US-35: insert a new todo column
    async createColumn(payload: CreateTodoColumnPayload): Promise<TodoColumn> {
        const {data, error} = await supabase
            .from('todo_columns')
            .insert(payload)
            .select()
            .single()

        if (error) throw new Error(`createColumn failed: ${error.message}`)
        return data as TodoColumn
    },

    // US-38: rename or reorder a todo column
    async updateColumn(columnId: string, payload: UpdateTodoColumnPayload): Promise<TodoColumn> {
        const {data, error} = await supabase
            .from('todo_columns')
            .update(payload)
            .eq('id', columnId)
            .select()
            .single()

        if (error) throw new Error(`updateColumn failed: ${error.message}`)
        return data as TodoColumn
    },

    // US-38: delete a column and all its cards
    async deleteColumn(columnId: string): Promise<void> {
        const {error} = await supabase
            .from('todo_columns')
            .delete()
            .eq('id', columnId)

        if (error) throw new Error(`deleteColumn failed: ${error.message}`)
    },

    // bulk update column positions after reorder
    async updateColumnPositions(updates: {id: string; position: number}[]): Promise<void> {
        if (updates.length === 0) return

        const {error} = await supabase
            .from('todo_columns')
            .upsert(
                updates.map(({id, position}) => ({id, position})),
                {onConflict: 'id'}
            )

        if (error) throw new Error(`updateColumnPositions failed: ${error.message}`)
    },

    // fetch all todo cards for a trip
    async findCardsByTrip(tripId: string): Promise<TodoCard[]> {
        const {data, error} = await supabase
            .from('todo_cards')
            .select('*')
            .eq('trip_id', tripId)
            .order('column_id', {ascending: true})
            .order('position', {ascending: true})

        if (error) throw new Error(`findCardsByTrip failed: ${error.message}`)
        return data as TodoCard[]
    },

    // US-36: create a new todo card
    async createCard(payload: CreateTodoCardPayload): Promise<TodoCard> {
        const {data, error} = await supabase
            .from('todo_cards')
            .insert(payload)
            .select()
            .single()

        if (error) throw new Error(`createCard failed: ${error.message}`)
        return data as TodoCard
    },

    // US-36, US-37: update a todo card
    async updateCard(cardId: string, payload: UpdateTodoCardPayload): Promise<TodoCard> {
        const {data, error} = await supabase
            .from('todo_cards')
            .update(payload)
            .eq('id', cardId)
            .select()
            .single()

        if (error) throw new Error(`updateCard failed: ${error.message}`)
        return data as TodoCard
    },

    // move a todo card to a different column
    async moveCard(cardId: string, columnId: string, position: number): Promise<void> {
        const {error} = await supabase
            .from('todo_cards')
            .update({column_id: columnId, position})
            .eq('id', cardId)

        if (error) throw new Error(`moveCard failed: ${error.message}`)
    },

    // delete a todo card
    async deleteCard(cardId: string): Promise<void> {
        const {error} = await supabase
            .from('todo_cards')
            .delete()
            .eq('id', cardId)

        if (error) throw new Error(`deleteCard failed: ${error.message}`)
    },

    // bulk update card positions after reorder
    async updateCardPositions(updates: {id: string; position: number}[]): Promise<void> {
        if (updates.length === 0) return

        const {error} = await supabase
            .from('todo_cards')
            .upsert(
                updates.map(({id, position}) => ({id, position})),
                {onConflict: 'id'}
            )

        if (error) throw new Error(`updateCardPositions failed: ${error.message}`)
    },
}