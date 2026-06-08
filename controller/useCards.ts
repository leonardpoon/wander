// controller/useCards.ts
// US-11 to US-18 (card CRUD), US-12 (drag/drop), US-32 (votes)
// US-33–US-34 (packing), US-35–US-38 (to-do)
// Hook — loads data, wires Realtime, exposes actions to the UI

import { useEffect, useCallback } from 'react'
import { supabase } from '../entity/supabaseClient'
import { cardService } from './cardService'
import { packingRepository } from '../entity/packingRepository'
import { todoRepository } from '../entity/todoRepository'
import { useCardStore } from './useCardStore'
import { useSessionStore } from './sessionStore'
import {
    Card,
    CardCategory,
    CreateTodoCardPayload,
    CreateTodoColumnPayload,
} from '../entity/Cards'

export function useCards(tripId: string | null) {
    const { user } = useSessionStore()
    const {
        cards,
        activeCard,
        voteTallies,
        packingItems,
        todoColumns,
        todoCards,
        isLoading,
        error,
        sidePanelColumnId,
        setCards,
        addCard,
        updateCard,
        removeCard,
        moveCardOptimistic,
        setActiveCard,
        setVoteTallies,
        updateVoteTally,
        setPackingItems,
        addPackingItem,
        updatePackingItem,
        removePackingItem,
        setTodoColumns,
        addTodoColumn,
        updateTodoColumn,
        removeTodoColumn,
        setTodoCards,
        addTodoCard,
        updateTodoCard,
        removeTodoCard,
        setLoading,
        setError,
        setSidePanelColumnId,
        reset,
    } = useCardStore()

    // ─── Initial Load ──────────────────────────────────────────────────────
    // Fires when tripId changes — loads all data for the trip in parallel

    useEffect(() => {
        if (!tripId) return

        let cancelled = false

        async function loadAll() {
            setLoading(true)
            setError(null)

            try {
                // load cards, packing items, and todo board in parallel
                const [fetchedCards, fetchedPacking, fetchedTodoCols, fetchedTodoCards] =
                    await Promise.all([
                        cardService.getCardsByTrip(tripId!),
                        packingRepository.findByTrip(tripId!),
                        todoRepository.findColumnsByTrip(tripId!),
                        todoRepository.findCardsByTrip(tripId!),
                    ])

                if (cancelled) return

                setCards(fetchedCards)
                setPackingItems(fetchedPacking)
                setTodoColumns(fetchedTodoCols)
                setTodoCards(fetchedTodoCards)

                // load vote tallies for all cards
                if (fetchedCards.length > 0 && user) {
                    const tallies = await cardService.getVoteTallies(
                        fetchedCards.map((c) => c.id),
                        user.id
                    )
                    if (!cancelled) setVoteTallies(tallies)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load cards')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadAll()

        // cleanup — prevents state updates after unmount or tripId change
        return () => { cancelled = true }
    }, [tripId])

    // ─── Supabase Realtime ─────────────────────────────────────────────────
    // Subscribes to all card/packing/todo changes for the active trip.
    // This is what keeps the board in sync across multiple members.

    useEffect(() => {
        if (!tripId) return

        const channel = supabase
            .channel(`trip-cards-${tripId}`)

            // cards table — handles all board changes from other members
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cards',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        addCard(payload.new as Card)
                    } else if (payload.eventType === 'UPDATE') {
                        updateCard(payload.new as Card)
                    } else if (payload.eventType === 'DELETE') {
                        removeCard(payload.old.id)
                    }
                }
            )

            // packing_items table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'packing_items',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        addPackingItem(payload.new as any)
                    } else if (payload.eventType === 'UPDATE') {
                        updatePackingItem(payload.new as any)
                    } else if (payload.eventType === 'DELETE') {
                        removePackingItem(payload.old.id)
                    }
                }
            )

            // todo_cards table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todo_cards',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        addTodoCard(payload.new as any)
                    } else if (payload.eventType === 'UPDATE') {
                        updateTodoCard(payload.new as any)
                    } else if (payload.eventType === 'DELETE') {
                        removeTodoCard(payload.old.id)
                    }
                }
            )

            .subscribe()

        // cleanup — unsubscribe when tripId changes or component unmounts
        return () => {
            supabase.removeChannel(channel)
        }
    }, [tripId])

    // ─── Cleanup on unmount ────────────────────────────────────────────────
    // Reset all card state when leaving a trip entirely

    useEffect(() => {
        return () => { reset() }
    }, [])

    // ─── Card Actions ──────────────────────────────────────────────────────

    // US-11: create a new card in a column
    const createCard = useCallback(async (payload: {
        column_id: string
        category: CardCategory
        sub_category?: string | null
        title: string
        location_name?: string | null
        fixed_time?: boolean
        time_value?: string | null
        budget_amount?: number | null
        notes?: string | null
    }) => {
        if (!tripId || !user) return

        try {
            setError(null)
            // Realtime will add the card to local state via the subscription above
            // so we don't call addCard here — avoids duplicates
            await cardService.createCard({
                ...payload,
                trip_id: tripId,
                created_by: user.id,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create card')
            throw err
        }
    }, [tripId, user])

    // US-18: update an existing card
    const editCard = useCallback(async (
        cardId: string,
        payload: Parameters<typeof cardService.updateCard>[1]
    ) => {
        try {
            setError(null)
            // Realtime handles the local state update
            await cardService.updateCard(cardId, payload)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update card')
            throw err
        }
    }, [])

    // US-12: drag a card between columns
    const moveCard = useCallback(async (
        cardId: string,
        targetColumnId: string,
        targetPosition: number
    ) => {
        try {
            setError(null)
            // optimistic update first — UI moves instantly
            moveCardOptimistic(cardId, targetColumnId, targetPosition)
            // then persist to DB — Realtime will confirm the final state
            await cardService.moveCard(cardId, targetColumnId, targetPosition)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to move card')
            // re-fetch to correct any optimistic drift
            if (tripId) {
                const corrected = await cardService.getCardsByTrip(tripId)
                setCards(corrected)
            }
            throw err
        }
    }, [tripId])

    // delete a card
    const deleteCard = useCallback(async (cardId: string) => {
        try {
            setError(null)
            // optimistic remove — Realtime confirms
            removeCard(cardId)
            await cardService.deleteCard(cardId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete card')
            // re-fetch to restore if delete failed
            if (tripId) {
                const corrected = await cardService.getCardsByTrip(tripId)
                setCards(corrected)
            }
            throw err
        }
    }, [tripId])

    // US-32: vote on a card
    const voteOnCard = useCallback(async (
        cardId: string,
        vote: 'up' | 'down' | null
    ) => {
        if (!user) return
        try {
            await cardService.voteOnCard(cardId, user.id, vote)
            // re-fetch just this card's tally
            const [tally] = await cardService.getVoteTallies([cardId], user.id)
            if (tally) updateVoteTally(tally)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to vote')
        }
    }, [user])

    // ─── Packing Actions ───────────────────────────────────────────────────

    // US-33: add a packing item
    const addPacking = useCallback(async (label: string) => {
        if (!tripId || !user) return
        try {
            const position = packingItems.length
            const item = await packingRepository.createItem({
                trip_id: tripId,
                label,
                position,
                created_by: user.id,
            })
            // Realtime handles addPackingItem — but packing_items
            // may not be subscribed above in all deployments,
            // so we also update local state directly as a fallback
            addPackingItem(item)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add packing item')
        }
    }, [tripId, user, packingItems])

    // US-34: toggle a packing item checked state
    const togglePacking = useCallback(async (itemId: string, checked: boolean) => {
        try {
            // optimistic update
            const item = packingItems.find((i) => i.id === itemId)
            if (item) updatePackingItem({ ...item, checked })
            await packingRepository.setChecked(itemId, checked)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update packing item')
        }
    }, [packingItems])

    const deletePacking = useCallback(async (itemId: string) => {
        try {
            removePackingItem(itemId)
            await packingRepository.deleteItem(itemId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete packing item')
        }
    }, [])

    // ─── To-Do Actions ─────────────────────────────────────────────────────

    // US-35: seed default columns when a trip is first created
    // Called once from trip creation flow if todo_columns is empty
    const seedTodoColumns = useCallback(async () => {
        if (!tripId) return
        const defaults = ['To Do', 'In Progress', 'Awaiting', 'Done']
        for (let i = 0; i < defaults.length; i++) {
            const col = await todoRepository.createColumn({
                trip_id: tripId,
                label: defaults[i],
                position: i,
            })
            addTodoColumn(col)
        }
    }, [tripId])

    // US-38: add a custom todo column
    const addTodoCol = useCallback(async (label: string) => {
        if (!tripId) return
        try {
            const position = todoColumns.length
            const col = await todoRepository.createColumn({ trip_id: tripId, label, position })
            addTodoColumn(col)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add column')
        }
    }, [tripId, todoColumns])

    // US-38: rename a todo column
    const renameTodoCol = useCallback(async (columnId: string, label: string) => {
        try {
            const col = await todoRepository.updateColumn(columnId, { label })
            updateTodoColumn(col)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to rename column')
        }
    }, [])

    // US-38: delete a todo column
    const deleteTodoCol = useCallback(async (columnId: string) => {
        try {
            removeTodoColumn(columnId)
            await todoRepository.deleteColumn(columnId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete column')
        }
    }, [])

    // US-36, US-37: create a todo card
    const createTodoCard = useCallback(async (
        payload: Omit<CreateTodoCardPayload, 'trip_id' | 'position'>
    ) => {
        if (!tripId) return
        try {
            const cardsInColumn = todoCards.filter((c) => c.column_id === payload.column_id)
            const position = cardsInColumn.length
            const card = await todoRepository.createCard({ ...payload, trip_id: tripId, position })
            addTodoCard(card)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create to-do card')
        }
    }, [tripId, todoCards])

    // US-36, US-37: update a todo card
    const editTodoCard = useCallback(async (
        cardId: string,
        payload: Parameters<typeof todoRepository.updateCard>[1]
    ) => {
        try {
            const card = await todoRepository.updateCard(cardId, payload)
            updateTodoCard(card)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update to-do card')
        }
    }, [])

    // move a todo card between columns
    const moveTodoCard = useCallback(async (
        cardId: string,
        targetColumnId: string,
        targetPosition: number
    ) => {
        try {
            const card = todoCards.find((c) => c.id === cardId)
            if (card) updateTodoCard({ ...card, column_id: targetColumnId, position: targetPosition })
            await todoRepository.moveCard(cardId, targetColumnId, targetPosition)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to move to-do card')
        }
    }, [todoCards])

    const deleteTodoCard = useCallback(async (cardId: string) => {
        try {
            removeTodoCard(cardId)
            await todoRepository.deleteCard(cardId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete to-do card')
        }
    }, [])

    // ─── Derived State ─────────────────────────────────────────────────────
    // Convenience selectors — the UI can call these instead of filtering
    // cards array itself. Keeps filtering logic in one place.

    const getCardsByColumn = useCallback(
        (columnId: string) =>
            cards
                .filter((c) => c.column_id === columnId)
                .sort((a, b) => a.position - b.position),
        [cards]
    )

    const getTodoCardsByColumn = useCallback(
        (columnId: string) =>
            todoCards
                .filter((c) => c.column_id === columnId)
                .sort((a, b) => a.position - b.position),
        [todoCards]
    )

    const getVoteTallyForCard = useCallback(
        (cardId: string) => voteTallies.find((t) => t.card_id === cardId) ?? null,
        [voteTallies]
    )

    // US-36: is a todo card overdue?
    const isOverdue = useCallback((dueDate: string | null): boolean => {
        if (!dueDate) return false
        return new Date(dueDate) < new Date(new Date().toDateString())
    }, [])

    return {
        // state
        cards,
        activeCard,
        packingItems,
        todoColumns,
        todoCards,
        isLoading,
        error,
        sidePanelColumnId,

        // card actions
        createCard,
        editCard,
        moveCard,
        deleteCard,
        voteOnCard,
        setActiveCard,
        setSidePanelColumnId,

        // packing actions
        addPacking,
        togglePacking,
        deletePacking,

        // todo actions
        seedTodoColumns,
        addTodoCol,
        renameTodoCol,
        deleteTodoCol,
        createTodoCard,
        editTodoCard,
        moveTodoCard,
        deleteTodoCard,

        // derived selectors
        getCardsByColumn,
        getTodoCardsByColumn,
        getVoteTallyForCard,
        isOverdue,
    }
}