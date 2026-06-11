// boundary/KanbanBoard.tsx
// US-11 to US-18: main kanban board — horizontally scrollable, drag and drop
// US-19: weather strips on column headers

import { useEffect, useRef } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { KanbanColumn } from './KanbanColumn'
import { CardSidePanel } from './CardSidePanel'
import { useCards } from '../controller/useCards'
import { useSessionStore } from '../controller/sessionStore'
import { CategoryFilters } from './AppShell'
import { WeatherForecast } from '../controller/weatherService'
import { Card } from '../entity/Cards'
import { CardCategoryOption } from '../entity/CardCategories'

interface ColumnData {
    id:          string
    date:        string    // YYYY-MM-DD
    label:       string    // e.g. "Arrival", "Day 1" — optional
    destination: string    // for weather lookup
    currency:    string
}

interface KanbanBoardProps {
    tripId:          string
    columns:         ColumnData[]
    categoryFilters: CategoryFilters
    categoryOptions: CardCategoryOption[]
    // weather keyed by destination name
    weatherByDest:   Record<string, WeatherForecast[]>
    accentColor:     string
}

export function KanbanBoard({
    tripId,
    columns,
    categoryFilters,
    categoryOptions,
    weatherByDest,
    accentColor,
}: KanbanBoardProps) {
    const { user } = useSessionStore()
    const {
        activeCard,
        sidePanelColumnId,
        getCardsByColumn,
        createCard,
        editCard,
        moveCard,
        deleteCard,
        setActiveCard,
        setSidePanelColumnId,
    } = useCards(tripId)

    const boardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!sidePanelColumnId) return

        function scrollActiveColumnIntoView() {
            const board = boardRef.current
            const column = board?.querySelector<HTMLElement>(`[data-column-id="${sidePanelColumnId}"]`)
            column?.scrollIntoView({ block: 'nearest', inline: 'end', behavior: 'smooth' })
        }

        scrollActiveColumnIntoView()
        const timeout = window.setTimeout(scrollActiveColumnIntoView, 280)
        return () => window.clearTimeout(timeout)
    }, [sidePanelColumnId])

    // US-19: get the forecast for a specific column's date + destination
    function getWeatherForColumn(destination: string, date: string): WeatherForecast | null {
        const forecasts = weatherByDest[destination]
        if (!forecasts) return null
        return forecasts.find((f) => f.date === date) ?? null
    }

    // filter cards by active category filters before passing to column
    function getFilteredCards(columnId: string): Card[] {
        return getCardsByColumn(columnId).filter(
            (card) => categoryFilters[card.category] !== false
        )
    }

    function handleAddCard(columnId: string) {
        setSidePanelColumnId(columnId)
        setActiveCard(null)
    }

    function handleEditCard(card: Card) {
        setActiveCard(card)
        setSidePanelColumnId(card.column_id)
    }

    function handleClosePanel() {
        setActiveCard(null)
        setSidePanelColumnId(null)
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="flex h-full relative">
                {/* Horizontally scrollable board */}
                <div
                    ref={boardRef}
                    className="wander-board-scroll flex h-full overflow-x-auto overflow-y-hidden"
                    style={{
                        padding: '16px',
                        gap: 12,
                        // shrink when side panel is open
                        width: sidePanelColumnId ? 'calc(100% - var(--card-panel-width))' : '100%',
                        transition: 'width 0.25s ease',
                    }}
                >
                    {columns.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            columnId={col.id}
                            date={col.date}
                            label={col.label}
                            cards={getFilteredCards(col.id)}
                            categoryOptions={categoryOptions}
                            weather={getWeatherForColumn(col.destination, col.date)}
                            accentColor={accentColor}
                            onAddCard={() => handleAddCard(col.id)}
                            onEditCard={handleEditCard}
                            onMoveCard={moveCard}
                        />
                    ))}

                    {/* Empty state */}
                    {columns.length === 0 && (
                        <div
                            className="flex items-center justify-center w-full"
                            style={{ color: 'var(--muted-foreground)', fontSize: 14 }}
                        >
                            No date columns yet. Add destinations to your trip first.
                        </div>
                    )}
                </div>

                {/* Card side panel — slides in from right */}
                {sidePanelColumnId && (
                    <CardSidePanel
                        key={`${sidePanelColumnId}:${activeCard?.id ?? 'new'}`}
                        tripId={tripId}
                        columnId={sidePanelColumnId}
                        card={activeCard}
                        columns={columns}
                        categoryOptions={categoryOptions}
                        onSave={async (payload) => {
                            if (activeCard) {
                                await editCard(activeCard.id, payload)
                            } else {
                                await createCard({
                                    column_id: sidePanelColumnId,
                                    ...payload,
                                })
                            }
                            handleClosePanel()
                        }}
                        onDelete={async () => {
                            if (activeCard) {
                                await deleteCard(activeCard.id)
                            }
                            handleClosePanel()
                        }}
                        onClose={handleClosePanel}
                    />
                )}
            </div>
        </DndProvider>
    )
}
