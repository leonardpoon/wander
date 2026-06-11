// US-11 to US-18: card CRUD
// US-15: geocoding 

import { cardRepository } from "../entity/cardRepository";
import {Card, CardCategory, CreateCardPayload, UpdateCardPayload, CardVoteTally} from "../entity/Cards";

// US-15: geocoding using OpenStreetMap Nominatim API
interface NominatimResult {
    lat: string
    lon: string
    display_name: string
}

async function geocodeLocation(locationName: string): Promise<{lat: number, lng: number} | null> {
    try {
        const query = encodeURIComponent(locationName)
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Wander/1.0 (travel planning app)',
            },
        })

        if (!response.ok) return null

        const results: NominatimResult[] = await response.json()
        if (!results.length) return null

        return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon)
        }
     } catch {
        return null
    }
        
}


// position helpers
async function getNextPosition(columnId: string): Promise<number> {
    const cards = await cardRepository.findByColumn(columnId)
    if (cards.length === 0) return 0
    return Math.max(...cards.map(c => c.position)) + 1
}

function allowsSubCategory(category: CardCategory): boolean {
    return category === 'eating' || category === 'travel'
}


// card service
export const cardService = {

    // US-11: create a new card
    async createCard(payload: {
        column_id: string
        trip_id: string
        category: CardCategory
        sub_category?: string | null
        title: string
        location_name?: string | null
        fixed_time?: boolean
        time_value?: string | null
        budget_amount?: number | null
        budget_currency?: string | null
        notes?: string | null
        created_by: string
    }): Promise<Card> {

        // US-14: only eating and travel cards have sub-category options
        if (payload.sub_category && !allowsSubCategory(payload.category)) {
            throw new Error('Sub-category can only be set for eating or travel cards')
        }

        // US-13: if fixed_time is truem time_value must be provided
        if (payload.fixed_time && !payload.time_value) {
            throw new Error('time_value must be provided if fixed_time is true')
        }

        // US-15: geocode location if provided
        let lat: number | null = null
        let lng: number | null = null

        if (payload.location_name) {
            const coords = await geocodeLocation(payload.location_name)
            if (coords) {
                lat = coords.lat
                lng = coords.lng
            }

        }

        // append to buttom of column
        const position = await getNextPosition(payload.column_id)

        const createPayload: CreateCardPayload = {
            column_id: payload.column_id,
            trip_id: payload.trip_id,
            category: payload.category,
            sub_category: payload.sub_category ?? null,
            title: payload.title,
            location_name: payload.location_name ?? null,
            lat,
            lng,
            fixed_time: payload.fixed_time ?? false,
            time_value: payload.time_value ?? null,
            budget_amount: payload.budget_amount ?? null,
            budget_currency: payload.budget_currency ?? null,
            notes: payload.notes ?? null,
            position,
            created_by: payload.created_by
        }

        return await cardRepository.createCard(createPayload)
    },

    // US-18: update an existing card
    async updateCard(cardId: string, payload: UpdateCardPayload & {location_name?: string | null}): Promise<Card> {

        // US-14: only eating and travel cards have sub-category options
        if (payload.sub_category && payload.category && !allowsSubCategory(payload.category)) {
            throw new Error('Sub-category can only be set for eating or travel cards')
        }

        // US-13: validate fixed_time if fixed_time is provided
        if (payload.fixed_time === true && !payload.time_value) {
            throw new Error('time_value must be provided if fixed_time is true')
        }

        // US-15: re-geocode if location name was changed
        if ('location_name' in payload) {
            if (payload.location_name) {
                const coords = await geocodeLocation(payload.location_name)
                if (coords) {
                    payload.lat = coords.lat
                    payload.lng = coords.lng
                } else {
                    payload.lat = null
                    payload.lng = null
                }
            } else {
                payload.lat = null
                payload.lng = null
            }
        }

        return await cardRepository.updateCard(cardId, payload)
    },

    // US-12: move a card to a different column 
    async moveCard(cardId: string, targetColumnId: string, targetPosition: number): Promise<void> {
        
        // get current state
        const card = await cardRepository.findById(cardId)
        if (!card) throw new Error('Card not found')
        
        const sourceColumnId = card.column_id
        const movingBetweenColumns = sourceColumnId !== targetColumnId

        await cardRepository.moveCard(cardId, targetColumnId, targetPosition)

        await reindexColumn(targetColumnId)

        if (movingBetweenColumns) {
            await reindexColumn(sourceColumnId)
        }
    },

    // US-11: delete a card
    async deleteCard(cardId: string): Promise<void> {
        const card = await cardRepository.findById(cardId)
        if (!card) throw new Error('Card not found')

        await cardRepository.deleteCard(cardId)

        await reindexColumn(card.column_id)
    },

    // US-11: load all cards for a trip
    async getCardsByTrip(tripId: string): Promise<Card[]> {
        return await cardRepository.findByTrip(tripId)
    },

    // US-15, US-21: load only geocoded cards for map view
    async getMapCards(tripId: string): Promise<Card[]> {
        return await cardRepository.findByTripWithLocation(tripId)
    },

    // US-32: cast or retract a vote on a card
    async voteOnCard(cardId: string, userId: string, vote: 'up' | 'down' | null): Promise<void> {
        if (vote === null) {
            await cardRepository.deleteVote(cardId, userId)
        } else {
            await cardRepository.upsertVote(cardId, userId, vote)
        }
    },

    // US-32: get vote tallies for all cards 
    async getVoteTallies(cardIds: string[], userId: string): Promise<CardVoteTally[]> {
        return await cardRepository.getVoteTallies(cardIds, userId)
    },

    // US-15: standalone geocode used when user types in the location manually
    async geocode(locationName: string): Promise<{lat: number, lng: number} | null> {
        return await geocodeLocation(locationName)
    },
}

// helper to reindex positions after a move or delete
async function reindexColumn(columnId: string): Promise<void> {
    const cards = await cardRepository.findByColumn(columnId)
    if (cards.length === 0) return

    const updates = cards.map((card, index) => ({
        id: card.id,
        position: index
    }))

    await cardRepository.updatePositions(updates)
}
