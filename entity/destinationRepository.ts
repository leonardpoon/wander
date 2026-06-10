// US-08: db operation for destination table

import {supabase} from './supabaseClient'
import {Destination, CreateDestinationPayload} from './Destination'

export const destinationRepository = {

    // US-08: bulk insert desintation on trip creation
    async createDestinations(destinations: CreateDestinationPayload[]): Promise<Destination[]> {
        const { data, error } = await supabase
            .from('destinations')
            .insert(destinations)
            .select()

        if (
            error &&
            (error.message.includes('lat') || error.message.includes('lng') || error.message.includes('schema cache'))
        ) {
            const destinationsWithoutCoords = destinations.map(({ lat, lng, ...dest }) => dest)
            const fallback = await supabase
                .from('destinations')
                .insert(destinationsWithoutCoords)
                .select()

            if (fallback.error) throw new Error(`createDestinations failed: ${fallback.error.message}`)
            return fallback.data as Destination[]
        }

        if (error) throw new Error(`createDestinations failed: ${error.message}`)
        return data as Destination[]
    },

    // fetch all destinations for a trip 
    async findByTrip(tripId: string): Promise<Destination[]> {
        const {data, error} = await supabase
            .from('destinations')
            .select('*')
            .eq('trip_id', tripId)
            .order('position', {ascending: true})

        if (error) throw new Error(`findByTrip failed: ${error.message}`)
        return data as Destination[]
    },
}
