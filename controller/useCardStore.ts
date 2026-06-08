// controller/useCardStore.ts
// US-11 to US-18 (cards), US-32 (votes), US-33–US-34 (packing), US-35–US-38 (to-do)
// Zustand store — single source of truth for all card-related state

import { create } from 'zustand'
import {
    Card,
    CardVoteTally,
    PackingItem,
    TodoColumn,
    TodoCard,
} from '../entity/Cards'

interface CardState {
    // ─── Kanban Cards ──────────────────────────────────────────────────────
    cards: Card[]                       // all cards for the active trip
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
    addCard: (card: Card) => void
    updateCard: (card: Card) => void
    removeCard: (cardId: string) => void

    // optimistic move — updates local state immediately before DB confirms
    // keeps the UI snappy during drag and drop
    moveCardOptimistic: (cardId: string, targetColumnId: string, targetPosition: number) => void

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

    addCard: (card) =>
        set((state) => ({ cards: [...state.cards, card] })),

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

    // optimistic move — mutate local state immediately so the drag feels instant
    // the actual DB write happens in cardService.moveCard in parallel
    // if the DB write fails, useCards hook will re-fetch and correct the state
    moveCardOptimistic: (cardId, targetColumnId, targetPosition) =>
        set((state) => {
            const cards = state.cards.map((c) => {
                if (c.id === cardId) {
                    return { ...c, column_id: targetColumnId, position: targetPosition }
                }
                return c
            })
            return { cards }
        }),

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
        set((state) => ({ packingItems: [...state.packingItems, item] })),

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
        set((state) => ({ todoColumns: [...state.todoColumns, column] })),

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
        set((state) => ({ todoCards: [...state.todoCards, card] })),

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