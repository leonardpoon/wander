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
    CardGroup,
    CreateTodoCardPayload,
} from '../entity/Cards'

const DEFAULT_TODO_COLUMNS = ['To Do', 'In Progress', 'Awaiting', 'Done']
const GROUP_COLORS = ['#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5']

const realtimeChannels = new Map<
    string,
    { channel: ReturnType<typeof supabase.channel>; refs: number }
>()

export function useCards(tripId: string | null) {
    const { user } = useSessionStore()
    const {
        cards,
        cardGroups,
        activeCard,
        voteTallies,
        packingItems,
        todoColumns,
        todoCards,
        isLoading,
        error,
        sidePanelColumnId,
        setCards,
        setCardGroups,
        addCard,
        updateCard,
        removeCard,
        addCardGroup,
        updateCardGroup,
        removeCardGroup,
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
                const [fetchedCards, fetchedGroups, fetchedPacking, fetchedTodoCols, fetchedTodoCards] =
                    await Promise.all([
                        cardService.getCardsByTrip(tripId!),
                        cardService.getGroupsByTrip(tripId!),
                        packingRepository.findByTrip(tripId!),
                        todoRepository.findColumnsByTrip(tripId!),
                        todoRepository.findCardsByTrip(tripId!),
                    ])

                if (cancelled) return

                setCards(fetchedCards)
                setCardGroups(fetchedGroups)
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

        const existing = realtimeChannels.get(tripId)
        if (existing) {
            existing.refs += 1
            return () => {
                existing.refs -= 1
                if (existing.refs === 0) {
                    realtimeChannels.delete(tripId)
                    supabase.removeChannel(existing.channel)
                }
            }
        }

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

            // card groups table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'card_groups',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        addCardGroup(payload.new as CardGroup)
                    } else if (payload.eventType === 'UPDATE') {
                        updateCardGroup(payload.new as CardGroup)
                    } else if (payload.eventType === 'DELETE') {
                        removeCardGroup(payload.old.id)
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

            // todo_columns table
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todo_columns',
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        addTodoColumn(payload.new as any)
                    } else if (payload.eventType === 'UPDATE') {
                        updateTodoColumn(payload.new as any)
                    } else if (payload.eventType === 'DELETE') {
                        removeTodoColumn(payload.old.id)
                    }
                }
            )

            .subscribe()

        realtimeChannels.set(tripId, { channel, refs: 1 })

        // cleanup — unsubscribe when tripId changes or component unmounts
        return () => {
            const active = realtimeChannels.get(tripId)
            if (!active) return

            active.refs -= 1
            if (active.refs === 0) {
                realtimeChannels.delete(tripId)
                supabase.removeChannel(active.channel)
            }
        }
    }, [tripId])

    // ─── Card Actions ──────────────────────────────────────────────────────

    // US-11: create a new card in a column
    const createCard = useCallback(async (payload: {
        column_id: string
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
    }) => {
        if (!tripId || !user) return

        try {
            setError(null)
            const card = await cardService.createCard({
                ...payload,
                trip_id: tripId,
                created_by: user.id,
            })
            addCard(card)
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
            const card = await cardService.updateCard(cardId, payload)
            updateCard(card)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update card')
            throw err
        }
    }, [])

    // US-12: drag a card between columns
    const moveCard = useCallback(async (
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ) => {
        try {
            setError(null)
            // optimistic update first — UI moves instantly
            moveCardOptimistic(cardId, targetColumnId, targetPosition, targetGroupId)
            // then persist to DB — Realtime will confirm the final state
            await cardService.moveCard(cardId, targetColumnId, targetPosition, targetGroupId)
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

        const existing = await todoRepository.findColumnsByTrip(tripId)
        if (existing.length > 0) {
            setTodoColumns(existing)
            return
        }

        const created = await Promise.all(DEFAULT_TODO_COLUMNS.map((label, i) =>
            todoRepository.createColumn({
                trip_id: tripId,
                label,
                position: i,
            })
        ))
        setTodoColumns(created)
    }, [tripId])

    function getNextGroupColor(): string {
        return GROUP_COLORS[cardGroups.length % GROUP_COLORS.length]
    }

    function getGroupTitle(cardsForGroup: Card[]): string {
        const location = cardsForGroup.find((card) => card.location_name)?.location_name
        if (location) return location

        const shortestTitle = cardsForGroup
            .map((card) => card.title)
            .sort((a, b) => a.length - b.length)[0]

        return shortestTitle ? `${shortestTitle} group` : 'Activity group'
    }

    const addCardToGroup = useCallback(async (cardId: string, groupId: string) => {
        const card = cards.find((candidate) => candidate.id === cardId)
        const group = cardGroups.find((candidate) => candidate.id === groupId)
        if (!card || !group) return

        if (card.column_id !== group.column_id) {
            setError('Cards can only be grouped within the same day.')
            return
        }

        try {
            setError(null)
            const updated = await cardService.updateCard(cardId, { group_id: groupId })
            updateCard(updated)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add card to group')
            throw err
        }
    }, [cards, cardGroups])

    const createGroupFromCards = useCallback(async (sourceCardId: string, targetCardId: string) => {
        if (!tripId || sourceCardId === targetCardId) return

        const sourceCard = cards.find((card) => card.id === sourceCardId)
        const targetCard = cards.find((card) => card.id === targetCardId)
        if (!sourceCard || !targetCard) return

        if (sourceCard.column_id !== targetCard.column_id) {
            setError('Groups can only be created within the same day.')
            return
        }

        if (targetCard.group_id) {
            await addCardToGroup(sourceCardId, targetCard.group_id)
            return
        }

        if (sourceCard.group_id) {
            await addCardToGroup(targetCardId, sourceCard.group_id)
            return
        }

        try {
            setError(null)
            const group = await cardService.createGroup({
                trip_id: tripId,
                column_id: targetCard.column_id,
                title: getGroupTitle([targetCard, sourceCard]),
                color: getNextGroupColor(),
                position: Math.min(targetCard.position, sourceCard.position),
            })

            addCardGroup(group)

            const targetUpdate = await cardService.updateCard(targetCard.id, { group_id: group.id })
            const sourceUpdate = await cardService.updateCard(sourceCard.id, {
                group_id: group.id,
                column_id: targetCard.column_id,
            })

            updateCard(targetUpdate)
            updateCard(sourceUpdate)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create group')
            throw err
        }
    }, [tripId, cards, cardGroups, addCardToGroup])

    const removeCardFromGroup = useCallback(async (cardId: string) => {
        const card = cards.find((candidate) => candidate.id === cardId)
        if (!card?.group_id) return

        try {
            setError(null)
            const updated = await cardService.updateCard(cardId, { group_id: null })
            updateCard(updated)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove card from group')
            throw err
        }
    }, [cards])

    const renameCardGroup = useCallback(async (groupId: string, title: string) => {
        const cleanTitle = title.trim()
        if (!cleanTitle) return

        try {
            setError(null)
            const group = await cardService.updateGroup(groupId, { title: cleanTitle })
            updateCardGroup(group)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to rename group')
            throw err
        }
    }, [])

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
            if (!card) return

            const sourceColumnId = card.column_id
            const cardsWithoutMoved = todoCards.filter((c) => c.id !== cardId)
            const targetCards = cardsWithoutMoved
                .filter((c) => c.column_id === targetColumnId)
                .sort((a, b) => a.position - b.position)
            const boundedPosition = Math.max(0, Math.min(targetPosition, targetCards.length))

            targetCards.splice(boundedPosition, 0, {
                ...card,
                column_id: targetColumnId,
                position: boundedPosition,
            })

            const reindexedTargetCards = targetCards.map((todoCard, index) => ({
                ...todoCard,
                position: index,
            }))
            const reindexedSourceCards = cardsWithoutMoved
                .filter((c) => c.column_id === sourceColumnId && sourceColumnId !== targetColumnId)
                .sort((a, b) => a.position - b.position)
                .map((todoCard, index) => ({ ...todoCard, position: index }))

            const movedColumnIds = new Set([sourceColumnId, targetColumnId])
            const nextTodoCards = [
                ...cardsWithoutMoved.filter((c) => !movedColumnIds.has(c.column_id)),
                ...reindexedSourceCards,
                ...reindexedTargetCards,
            ]

            setTodoCards(nextTodoCards)
            await todoRepository.moveCard(cardId, targetColumnId, boundedPosition)
            await todoRepository.updateCardPositions([
                ...reindexedSourceCards,
                ...reindexedTargetCards,
            ].map((todoCard) => ({
                id: todoCard.id,
                position: todoCard.position,
            })))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to move to-do card')
            if (tripId) {
                const corrected = await todoRepository.findCardsByTrip(tripId)
                setTodoCards(corrected)
            }
        }
    }, [todoCards, tripId])

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
        cardGroups,
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
        createGroupFromCards,
        addCardToGroup,
        removeCardFromGroup,
        renameCardGroup,
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
