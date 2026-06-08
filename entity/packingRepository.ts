// US-33 - US-34: packing list database access layer

import {supabase} from './supabaseClient'
import {PackingItem, CreatePackingItemPayload} from './Cards'

export const packingRepository = {

    // US-33: fetch all packing items for a trip ordered by position
    async findByTrip(tripId: string): Promise<PackingItem[]> {
        const {data, error} = await supabase
            .from('packing_items')
            .select('*')
            .eq('trip_id', tripId)
            .order('position', {ascending: true})

        if (error) throw new Error(`findByTrip failed: ${error.message}`)
        return data as PackingItem[]
    },

    // US-33: add a new packing item
    async createItem(payload: CreatePackingItemPayload): Promise<PackingItem> {
        const {data, error} = await supabase
            .from('packing_items')
            .insert(payload)
            .select()
            .single()

        if (error) throw new Error(`createItem failed: ${error.message}`)
        return data as PackingItem
    },

    // US-34: toggle checked state
    async setChecked(itemId: string, checked: boolean): Promise<void> {
        const {error} = await supabase
            .from('packing_items')
            .update({checked})
            .eq('id', itemId)

        if (error) throw new Error(`setChecked failed: ${error.message}`)
    },

    // delete a packing item
    async deleteItem(itemId: string): Promise<void> {
        const {error} = await supabase
            .from('packing_items')
            .delete()
            .eq('id', itemId)

        if (error) throw new Error(`deleteItem failed: ${error.message}`)
    },

    // bulk update position after reorder
    async updatePositions(updates: {id:string; position: number}[]): Promise<void> {
       if (updates.length === 0) return

       const {error} = await supabase
            .from('packing_items')
            .upsert(
                updates.map(({id, position}) => ({id, position})),
                {onConflict: 'id'}
            )

        if (error) throw new Error(`updatePositions failed: ${error.message}`)
    },
}