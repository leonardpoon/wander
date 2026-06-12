// US-11 to US-18: card CRUD
// US-15: geocoding 

import { cardRepository } from "../entity/cardRepository";
import {
    Card,
    CardCategory,
    CardGroup,
    CardVoteTally,
    CreateCardPayload,
    UpdateCardPayload,
} from "../entity/Cards";

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

async function geocodeCardLocation(title: string, locationName: string | null | undefined): Promise<{lat: number, lng: number} | null> {
    const cleanTitle = title.trim()
    const cleanLocation = locationName?.trim()

    if (cleanTitle && cleanLocation) {
        const combined = await geocodeLocation(`${cleanTitle}, ${cleanLocation}`)
        if (combined) return combined
    }

    if (cleanLocation) return await geocodeLocation(cleanLocation)
    return null
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
        group_id?: string | null
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
            const coords = await geocodeCardLocation(payload.title, payload.location_name)
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
            group_id: payload.group_id ?? null,
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
        if ('location_name' in payload || 'title' in payload) {
            const currentCard = await cardRepository.findById(cardId)
            const nextTitle = payload.title ?? currentCard?.title ?? ''
            const nextLocation = 'location_name' in payload
                ? payload.location_name
                : currentCard?.location_name

            if (nextLocation) {
                const coords = await geocodeCardLocation(nextTitle, nextLocation)
                if (coords) {
                    payload.lat = coords.lat
                    payload.lng = coords.lng
                } else {
                    payload.lat = null
                    payload.lng = null
                }
            } else if ('location_name' in payload && !payload.location_name) {
                payload.lat = null
                payload.lng = null
            }
        }

        return await cardRepository.updateCard(cardId, payload)
    },

    // US-12: move a card to a different column 
    async moveCard(
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ): Promise<void> {
        
        // get current state
        const card = await cardRepository.findById(cardId)
        if (!card) throw new Error('Card not found')
        
        const sourceColumnId = card.column_id
        const sourceGroupId = card.group_id ?? null
        const targetLaneGroupId = targetGroupId !== undefined ? targetGroupId : sourceGroupId
        const movingBetweenColumns = sourceColumnId !== targetColumnId
        const movingBetweenLanes = movingBetweenColumns || sourceGroupId !== targetLaneGroupId

        await cardRepository.moveCard(cardId, targetColumnId, targetPosition, targetGroupId)

        await reindexLaneWithMovedCard(cardId, targetColumnId, targetPosition, targetLaneGroupId)

        if (movingBetweenLanes) {
            await reindexLane(sourceColumnId, sourceGroupId)
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

    async getGroupsByTrip(tripId: string): Promise<CardGroup[]> {
        return await cardRepository.findGroupsByTrip(tripId)
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

    async previewCardLocation(title: string, locationName: string): Promise<{lat: number, lng: number} | null> {
        return await geocodeCardLocation(title, locationName)
    },

    async createGroup(payload: {
        trip_id: string
        column_id: string
        title: string
        color: string
        position: number
    }): Promise<CardGroup> {
        return await cardRepository.createGroup(payload)
    },

    async updateGroup(groupId: string, payload: {
        column_id?: string
        title?: string
        color?: string
        position?: number
    }): Promise<CardGroup> {
        return await cardRepository.updateGroup(groupId, payload)
    },

    async deleteGroup(groupId: string): Promise<void> {
        await cardRepository.deleteGroup(groupId)
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

function isSameLaneGroup(cardGroupId: string | null | undefined, groupId: string | null): boolean {
    return (cardGroupId ?? null) === groupId
}

function applyFixedTimeOrder(cards: Card[]): Card[] {
    const fixedCards = cards
        .filter((card) => card.fixed_time && card.time_value)
        .sort((a, b) => (a.time_value ?? '').localeCompare(b.time_value ?? ''))

    let fixedIndex = 0
    return cards.map((card) => {
        if (!card.fixed_time || !card.time_value) return card
        const nextFixed = fixedCards[fixedIndex]
        fixedIndex += 1
        return nextFixed
    })
}

async function reindexLane(columnId: string, groupId: string | null): Promise<void> {
    const cards = (await cardRepository.findByColumn(columnId))
        .filter((card) => isSameLaneGroup(card.group_id, groupId))
        .sort((a, b) => a.position - b.position)

    if (cards.length === 0) return

    const orderedCards = applyFixedTimeOrder(cards)
    await cardRepository.updatePositions(orderedCards.map((card, index) => ({
        id: card.id,
        position: index,
    })))
}

async function reindexLaneWithMovedCard(
    movedCardId: string,
    columnId: string,
    targetPosition: number,
    groupId: string | null
): Promise<void> {
    const laneCards = (await cardRepository.findByColumn(columnId))
        .filter((card) => isSameLaneGroup(card.group_id, groupId))
    const movedCard = laneCards.find((card) => card.id === movedCardId)
    if (!movedCard) return

    const otherCards = laneCards
        .filter((card) => card.id !== movedCardId)
        .sort((a, b) => a.position - b.position)
    const insertIndex = otherCards.findIndex((card) => card.position >= targetPosition)
    const boundedIndex = insertIndex === -1
        ? otherCards.length
        : Math.max(0, insertIndex)

    const nextCards = [...otherCards]
    nextCards.splice(boundedIndex, 0, movedCard)
    const orderedCards = applyFixedTimeOrder(nextCards)

    await cardRepository.updatePositions(orderedCards.map((card, index) => ({
        id: card.id,
        position: index,
    })))
}
