// US-06, US-07, US-08, US-09, US-10

import {supabase} from './supabaseClient'
import {Trip, CreateTripPayload, SafeTrip, TripMember} from './Trip'
import {CreateColumnPayload, TripColumn} from './Column'

export const tripRepository = {

    // US-06: insert a new trip
    async createTrip(payload: CreateTripPayload): Promise<SafeTrip> {
        const {data, error} = await supabase
            .from('trips')
            .insert(payload)
            .select('id, owner_id, name, start_date, end_date, primary_currency, theme_colour, photo_url, room_code, created_at, updated_at')
            .single()

        if (error) throw new Error(`createTrip failed: ${error.message}`)
        return data as SafeTrip
    },

    // US-06: fetch all tripes for a user 
    async findByUser(userId: string): Promise<SafeTrip[]> {
        const {data, error} = await supabase
            .from('trips')
            .select('id, owner_id, name, start_date, end_date, primary_currency, theme_colour, photo_url, room_code, created_at, updated_at')
            .eq('owner_id', userId)

        if (error) throw new Error(`findByUser failed: ${error.message}`)
        return data as SafeTrip[]
    },

    // fetch single trip by ID
    async findById(id: string): Promise<SafeTrip | null> {
        const {data, error} = await supabase
            .from('trips')
            .select('id, owner_id, name, start_date, end_date, primary_currency, theme_colour, photo_url, room_code, created_at, updated_at')
            .eq('id', id)
            .maybeSingle()

        if (error) throw new Error(`findById failed: ${error.message}`)
        return data as SafeTrip | null
    },

    // US-09: find trip by room code used for joining via room code + pin
    async findByRoomCode(roomCode: string): Promise<Trip | null> {
        const {data, error} = await supabase
            .from('trips')
            .select('*')
            .eq('room_code', roomCode)
            .maybeSingle()

        if (error) throw new Error(`findByRoomCode failed: ${error.message}`)
        return data as Trip | null
    },

    // US-10: delete trip
    async deleteTrip(tripId: string): Promise<void> {
        const {error} = await supabase
            .from('trips')
            .delete()
            .eq('id', tripId)

        if (error) throw new Error(`deleteTrip failed: ${error.message}`)
    },

    // US-06: insert owner as first trip member 
    async addMember(tripId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<void> {
        const {error} = await supabase
            .from('trip_members')
            .insert({trip_id: tripId, user_id: userId, role})
        
        if (error) throw new Error(`addMember failed: ${error.message}`)
    },

    // US-06: bulk insert auto-generated columns
    async createColumns(columns: CreateColumnPayload[]): Promise<TripColumn[]> {
        const {data, error} = await supabase
            .from('trip_columns')
            .insert(columns)
            .select()

        if (error) throw new Error(`createColumns failed: ${error.message}`)
        return data as TripColumn[]
    },

    // fetch all columns for a trip
    async findColumnsByTrip(tripId: string): Promise<TripColumn[]> {
        const {data, error} = await supabase
            .from('columns')
            .select('*')
            .eq('trip_id', tripId)
            .order('position', {ascending: true})

        if (error) throw new Error(`findColumnsByTrip failed: ${error.message}`)
        return data as TripColumn[]
    },
}