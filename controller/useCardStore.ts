// controller/useCardStore.ts
// US-11 to US-18 (cards), US-32 (votes), US-33–US-34 (packing), US-35–US-38 (to-do)
// Zustand store — single source of truth for all card-related state

import { create } from 'zustand'
import {
    Card,
    CardGroup,
    CardVoteTally,
    PackingItem,
    TodoColumn,
    TodoCard,
} from '../entity/Cards'

interface CardState {
    // ─── Kanban Cards ──────────────────────────────────────────────────────
    cards: Card[]                       // all cards for the active trip
    cardGroups: CardGroup[]
    activeCard: Card | null             // card currently open in side panel
    voteTallies: CardVoteTally[]        // vote counts keyed by card_id

    // ─── Packing List ──────────────────────────────────────────────────────
    packingItems: PackingItem[]

    // ─── To-Do Board ───────────────────────────────────────────────────────
    todoColumns: TodoColumn[]
    todoCards: TodoCard[]

    // ─── UI State ──────────────────────────────────────────────────────────
    isLoading: boolean
    error: string | null
    // which column the side panel is opening into (for new card creation)
    sidePanelColumnId: string | null

    // ─── Card Actions ──────────────────────────────────────────────────────
    setCards: (cards: Card[]) => void
    setCardGroups: (groups: CardGroup[]) => void
    addCard: (card: Card) => void
    updateCard: (card: Card) => void
    removeCard: (cardId: string) => void
    addCardGroup: (group: CardGroup) => void
    updateCardGroup: (group: CardGroup) => void
    removeCardGroup: (groupId: string) => void

    // optimistic move — updates local state immediately before DB confirms
    // keeps the UI snappy during drag and drop
    moveCardOptimistic: (
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ) => void
    moveGroupOptimistic: (
        groupId: string,
        targetColumnId: string,
        targetPosition: number
    ) => void

    setActiveCard: (card: Card | null) => void
    setVoteTallies: (tallies: CardVoteTally[]) => void
    updateVoteTally: (tally: CardVoteTally) => void

    // ─── Packing Actions ───────────────────────────────────────────────────
    setPackingItems: (items: PackingItem[]) => void
    addPackingItem: (item: PackingItem) => void
    updatePackingItem: (item: PackingItem) => void
    removePackingItem: (itemId: string) => void

    // ─── To-Do Actions ─────────────────────────────────────────────────────
    setTodoColumns: (columns: TodoColumn[]) => void
    addTodoColumn: (column: TodoColumn) => void
    updateTodoColumn: (column: TodoColumn) => void
    removeTodoColumn: (columnId: string) => void

    setTodoCards: (cards: TodoCard[]) => void
    addTodoCard: (card: TodoCard) => void
    updateTodoCard: (card: TodoCard) => void
    removeTodoCard: (cardId: string) => void

    // ─── UI Actions ────────────────────────────────────────────────────────
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setSidePanelColumnId: (columnId: string | null) => void

    // reset all card state when leaving a trip
    reset: () => void
}

const initialState = {
    cards: [],
    cardGroups: [],
    activeCard: null,
    voteTallies: [],
    packingItems: [],
    todoColumns: [],
    todoCards: [],
    isLoading: false,
    error: null,
    sidePanelColumnId: null,
}

export const useCardStore = create<CardState>((set) => ({
    ...initialState,

    // ─── Card Actions ───────────────────────────────────────────────────────

    setCards: (cards) => set({ cards }),
    setCardGroups: (cardGroups) => set({ cardGroups }),

    addCard: (card) =>
        set((state) => ({
            cards: state.cards.some((c) => c.id === card.id)
                ? state.cards.map((c) => (c.id === card.id ? card : c))
                : [...state.cards, card],
        })),

    updateCard: (card) =>
        set((state) => ({
            cards: state.cards.map((c) => (c.id === card.id ? card : c)),
        })),

    removeCard: (cardId) =>
        set((state) => ({
            cards: state.cards.filter((c) => c.id !== cardId),
            // close side panel if the deleted card was open
            activeCard: state.activeCard?.id === cardId ? null : state.activeCard,
        })),

    addCardGroup: (group) =>
        set((state) => ({
            cardGroups: state.cardGroups.some((g) => g.id === group.id)
                ? state.cardGroups.map((g) => (g.id === group.id ? group : g))
                : [...state.cardGroups, group],
        })),

    updateCardGroup: (group) =>
        set((state) => ({
            cardGroups: state.cardGroups.map((g) => (g.id === group.id ? group : g)),
        })),

    removeCardGroup: (groupId) =>
        set((state) => ({
            cardGroups: state.cardGroups.filter((g) => g.id !== groupId),
            cards: state.cards.map((card) =>
                card.group_id === groupId ? { ...card, group_id: null } : card
            ),
        })),

    // optimistic move — mutate local state immediately so the drag feels instant
    // the actual DB write happens in cardService.moveCard in parallel
    // if the DB write fails, useCards hook will re-fetch and correct the state
    moveCardOptimistic: (cardId, targetColumnId, targetPosition, targetGroupId) =>
        set((state) => {
            const cards = state.cards.map((c) => {
                if (c.id === cardId) {
                    return {
                        ...c,
                        column_id: targetColumnId,
                        position: targetPosition,
                        group_id: targetGroupId !== undefined ? targetGroupId : c.group_id,
                    }
                }
                return c
            })
            return { cards }
        }),

    moveGroupOptimistic: (groupId, targetColumnId, targetPosition) =>
        set((state) => ({
            cardGroups: state.cardGroups.map((group) =>
                group.id === groupId
                    ? { ...group, column_id: targetColumnId, position: targetPosition }
                    : group
            ),
            cards: state.cards.map((card) =>
                card.group_id === groupId
                    ? { ...card, column_id: targetColumnId }
                    : card
            ),
        })),

    setActiveCard: (card) => set({ activeCard: card }),

    setVoteTallies: (voteTallies) => set({ voteTallies }),

    updateVoteTally: (tally) =>
        set((state) => ({
            voteTallies: state.voteTallies.some((t) => t.card_id === tally.card_id)
                ? state.voteTallies.map((t) => (t.card_id === tally.card_id ? tally : t))
                : [...state.voteTallies, tally],
        })),

    // ─── Packing Actions ────────────────────────────────────────────────────

    setPackingItems: (packingItems) => set({ packingItems }),

    addPackingItem: (item) =>
        set((state) => ({
            packingItems: state.packingItems.some((i) => i.id === item.id)
                ? state.packingItems.map((i) => (i.id === item.id ? item : i))
                : [...state.packingItems, item],
        })),

    updatePackingItem: (item) =>
        set((state) => ({
            packingItems: state.packingItems.map((i) => (i.id === item.id ? item : i)),
        })),

    removePackingItem: (itemId) =>
        set((state) => ({
            packingItems: state.packingItems.filter((i) => i.id !== itemId),
        })),

    // ─── To-Do Column Actions ───────────────────────────────────────────────

    setTodoColumns: (todoColumns) => set({ todoColumns }),

    addTodoColumn: (column) =>
        set((state) => ({
            todoColumns: state.todoColumns.some((c) => c.id === column.id)
                ? state.todoColumns.map((c) => (c.id === column.id ? column : c))
                : [...state.todoColumns, column],
        })),

    updateTodoColumn: (column) =>
        set((state) => ({
            todoColumns: state.todoColumns.map((c) =>
                c.id === column.id ? column : c
            ),
        })),

    removeTodoColumn: (columnId) =>
        set((state) => ({
            todoColumns: state.todoColumns.filter((c) => c.id !== columnId),
            // also remove all cards that belonged to this column
            todoCards: state.todoCards.filter((c) => c.column_id !== columnId),
        })),

    // ─── To-Do Card Actions ─────────────────────────────────────────────────

    setTodoCards: (todoCards) => set({ todoCards }),

    addTodoCard: (card) =>
        set((state) => ({
            todoCards: state.todoCards.some((c) => c.id === card.id)
                ? state.todoCards.map((c) => (c.id === card.id ? card : c))
                : [...state.todoCards, card],
        })),

    updateTodoCard: (card) =>
        set((state) => ({
            todoCards: state.todoCards.map((c) => (c.id === card.id ? card : c)),
        })),

    removeTodoCard: (cardId) =>
        set((state) => ({
            todoCards: state.todoCards.filter((c) => c.id !== cardId),
        })),

    // ─── UI Actions ─────────────────────────────────────────────────────────

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setSidePanelColumnId: (sidePanelColumnId) => set({ sidePanelColumnId }),

    // called when user navigates away from a trip
    // clears all card state so the next trip loads fresh
    reset: () => set(initialState),
}))
