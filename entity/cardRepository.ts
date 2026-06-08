// US-11 to US-18: cards
// US-32: votes

import {supabase} from './supabaseClient'
import {Card, CreateCardPayload, UpdateCardPayload, CardVote, CardVoteTally} from './Cards'

export const cardRepository = {

    // US-11: insert a new card into a column
    async createCard(payload: CreateCardPayload): Promise<Card> {
        const {data, error} = await supabase
            .from('cards')
            .insert(payload)
            .select()
            .single()

        if (error) throw new Error(`createCard failed: ${error.message}`)
        return data as Card
    },

    // US-18: fetch a single card by id
    async findById(cardId: string): Promise<Card | null> {
        const {data, error} = await supabase
            .from('cards')
            .select('*')
            .eq('id', cardId)
            .maybeSingle()

        if (error) throw new Error(`findById failed: ${error.message}`)
        return data as Card | null
    },

    // US-11: fetch all cards for a trips and ordered by column followed by position
    async findByTrip(tripId: string): Promise<Card[]> {
        const {data, error} = await supabase
            .from('cards')
            .select('*')
            .eq('trip_id', tripId)
            .order('column_id', {ascending: true})
            .order('position', {ascending: true})

        if (error) throw new Error(`findByTrip failed: ${error.message}`)
        return data as Card[]
    },

    // US-11: fetch all cards for a single column
    async findByColumn(columnId: string): Promise<Card[]> {
        const {data, error} = await supabase
            .from('cards')
            .select('*')
            .eq('column_id', columnId)
            .order('position', {ascending: true})

        if (error) throw new Error(`findByColumn failed: ${error.message}`)
        return data as Card[]
    },

    // US-15: fetch all cards with lat and lng for map
    async findByTripWithLocation(tripId: string): Promise<Card[]> {
        const {data, error} = await supabase
            .from('cards')
            .select('*')
            .eq('trip_id', tripId)
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .order('position', {ascending: true})

        if (error) throw new Error(`findByTripWithLocation failed: ${error.message}`)
        return data as Card[]
    },

    // US-18: update card fields
    async updateCard(cardId: string, payload: UpdateCardPayload): Promise<Card> {
        const {data, error} = await supabase
            .from('cards')
            .update(payload)
            .eq('id', cardId)
            .select()
            .single()

        if (error) throw new Error(`updateCard failed: ${error.message}`)
        return data as Card
    },

    // US-12: update position and column_id when dragged
    async moveCard(cardId: string, columnId: string, position: number): Promise<void> {
        const {error} = await supabase
            .from('cards')
            .update({column_id: columnId, position})
            .eq('id', cardId)

        if (error) throw new Error(`moveCard failed: ${error.message}`)
    },

    // US-11: bulk update position within a column
    async updatePositions(updates: {id: string; position: number}[]): Promise<void> {
        const {error} = await supabase
            .from('cards')
            .upsert(
                updates.map(({id, position}) => ({id, position})),
                {onConflict: 'id'}
            )
        
        if (error) throw new Error(`updatePositions failed: ${error.message}`)
    },

    // US-11 & US-10: delete a single card
    async deleteCard(cardId: string): Promise<void> {
        const {error} = await supabase
            .from('cards')
            .delete()
            .eq('id', cardId)

        if (error) throw new Error(`deleteCard failed: ${error.message}`)
    },

    // US-32: cast or update a vote on a card
    async upsertVote(cardId: string, userId: string, vote: 'up' | 'down'): Promise<void> {
        const {error} = await supabase
            .from('card_votes')
            .upsert(
                {card_id: cardId, user_id: userId, vote},
                {onConflict: 'card_id, user_id'}
            )
        
        if (error) throw new Error(`upsertVote failed: ${error.message}`)
    },

    // delete a vote
    async deleteVote(cardId: string, userId: string): Promise<void> {
        const {error} = await supabase
            .from('card_votes')
            .delete()
            .eq('card_id', cardId)
            .eq('user_id', userId)

        if (error) throw new Error(`deleteVote failed: ${error.message}`)
    },

    // tally votes
    async getVoteTallies(cardIds: string[], userId: string): Promise<CardVoteTally[]> {
        if (cardIds.length === 0) return []

        const {data, error} = await supabase
            .from('card_votes')
            .select('card_id, vote, user_id')
            .in('card_id', cardIds)

        if (error) throw new Error(`getVoteTallies failed: ${error.message}`)

        const votes = data as CardVote[]

        // group votes by card_id
        const tallyMap = new Map<string, CardVoteTally>()

        for (const vote of votes) {
            const tally = tallyMap.get(vote.card_id)
            if (!tally) continue
            if (vote.vote === 'up') tally.up++
            else tally.down++
            if (vote.user_id === userId) tally.user_vote = vote.vote
        }

        return Array.from(tallyMap.values())
    }
}