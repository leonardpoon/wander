// boundary/KanbanColumn.tsx
// US-11 to US-18: kanban column — date header, weather strip, card list, add button
// US-19: weather strip display
// US-12: drop target for drag and drop

import { useRef } from 'react'
import { useDrop } from 'react-dnd'
import { Plus, CloudSun } from 'lucide-react'
import { CardItem } from './CardItem'
import { Card, CardGroup } from '../entity/Cards'
import { WeatherForecast } from '../controller/weatherService'
import { getWeatherIcon } from './WeatherIcon'
import { CardCategoryOption } from '../entity/CardCategories'
import { CardGroupItem } from './CardGroupItem'
import { CardDropZone } from './CardDropZone'

const DND_CARD = 'CARD'

interface KanbanColumnProps {
    columnId:    string
    date:        string
    label:       string
    cards:       Card[]
    groups:      CardGroup[]
    categoryOptions: CardCategoryOption[]
    weather:     WeatherForecast | null
    accentColor: string
    onAddCard:   () => void
    onEditCard:  (card: Card) => void
    onMoveCard:  (
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ) => Promise<void>
    onCreateGroup: (sourceCardId: string, targetCardId: string) => Promise<void>
    onAddCardToGroup: (cardId: string, groupId: string) => Promise<void>
    onRemoveCardFromGroup: (cardId: string) => Promise<void>
}

export function KanbanColumn({
    columnId,
    date,
    label,
    cards,
    groups,
    categoryOptions,
    weather,
    accentColor,
    onAddCard,
    onEditCard,
    onMoveCard,
    onCreateGroup,
    onAddCardToGroup,
    onRemoveCardFromGroup,
}: KanbanColumnProps) {
    const columnRef = useRef<HTMLDivElement>(null)

    // US-12: drop target — accepts dragged cards
    const [{ isOver }, drop] = useDrop({
        accept: DND_CARD,
        drop: (item: { cardId: string }, monitor) => {
            if (monitor.didDrop()) return
            // drop at the end of the column
            const lastPosition = cards.length > 0
                ? Math.max(...cards.map((card) => card.position))
                : -1
            onMoveCard(item.cardId, columnId, lastPosition + 1, null)
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    })

    drop(columnRef)
    const looseCards = cards.filter((card) => !card.group_id)
    const cardsByGroup = new Map<string, Card[]>()

    for (const card of cards) {
        if (!card.group_id) continue
        const groupCards = cardsByGroup.get(card.group_id) ?? []
        groupCards.push(card)
        cardsByGroup.set(card.group_id, groupCards)
    }

    const visibleGroups = groups
        .filter((group) => group.column_id === columnId && (cardsByGroup.get(group.id)?.length ?? 0) > 0)
        .sort((a, b) => a.position - b.position)

    // format date for column header: "Mon 12 Jun"
    function formatDate(dateStr: string): string {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-GB', {
            weekday: 'short',
            day:     'numeric',
            month:   'short',
        })
    }

    return (
        <div
            ref={columnRef}
            data-column-id={columnId}
            className="wander-kanban-column flex flex-col shrink-0 rounded-xl transition-colors"
            style={{
                background: isOver ? 'var(--accent)10' : 'var(--muted)',
                border: isOver
                    ? `2px solid ${accentColor}`
                    : '2px solid transparent',
                maxHeight: '100%',
            }}
        >
            {/* Column header */}
            <div
                className="px-3 pt-3 pb-2"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                {/* Date + label */}
                <div className="flex items-center justify-between mb-1">
                    <span
                        style={{
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {formatDate(date)}
                    </span>

                    {/* Card count badge */}
                    <span
                        className="rounded-full px-2 py-0.5"
                        style={{
                            background: 'var(--border)',
                            color: 'var(--muted-foreground)',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        {cards.length}
                    </span>
                </div>

                {/* Optional column label */}
                {label && (
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                        {label}
                    </p>
                )}

                {/* US-19: Weather strip */}
                {weather ? (
                    <div
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 mt-1"
                        style={{ background: 'var(--card)' }}
                    >
                        {getWeatherIcon(weather.icon, 14)}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
                            {weather.temp_max}°
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                            {weather.label}
                        </span>
                    </div>
                ) : (
                    <div
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 mt-1"
                        style={{ background: 'var(--card)' }}
                    >
                        <CloudSun size={14} style={{ color: 'var(--muted-foreground)' }} />
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                            No weather data
                        </span>
                    </div>
                )}
            </div>

            {/* Cards list — scrollable */}
            <div
                className="flex flex-col flex-1 overflow-y-auto p-2 transition-colors"
                style={{
                    gap: 8,
                    cursor: 'copy',
                }}
                onClick={(e) => {
                    if (e.target !== e.currentTarget) return
                    onAddCard()
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                }}
            >
                <CardDropZone
                    columnId={columnId}
                    position={looseCards[0]?.position ?? 0}
                    groupId={null}
                    onMoveCard={onMoveCard}
                />
                {looseCards.map((card, index) => (
                    <div key={card.id} className="flex flex-col" style={{ gap: 8 }}>
                        <CardItem
                            card={card}
                            index={index}
                            columnId={columnId}
                            onEdit={() => onEditCard(card)}
                            categoryOptions={categoryOptions}
                            onMove={onMoveCard}
                            onGroupWith={onCreateGroup}
                        />
                        <CardDropZone
                            columnId={columnId}
                            position={card.position + 1}
                            groupId={null}
                            onMoveCard={onMoveCard}
                        />
                    </div>
                ))}

                {visibleGroups.map((group) => (
                    <CardGroupItem
                        key={group.id}
                        group={group}
                        cards={(cardsByGroup.get(group.id) ?? []).sort((a, b) => a.position - b.position)}
                        columnId={columnId}
                        categoryOptions={categoryOptions}
                        onEditCard={onEditCard}
                        onMoveCard={onMoveCard}
                        onAddCardToGroup={onAddCardToGroup}
                        onRemoveCardFromGroup={onRemoveCardFromGroup}
                    />
                ))}

                {cards.length === 0 && (
                    <button
                        type="button"
                        onClick={onAddCard}
                        className="flex flex-1 min-h-32 items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors"
                        style={{
                            borderColor: 'var(--border)',
                            color: 'var(--muted-foreground)',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = accentColor
                            e.currentTarget.style.color = 'var(--foreground)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.color = 'var(--muted-foreground)'
                        }}
                    >
                        <Plus size={14} />
                        Add activity
                    </button>
                )}
            </div>

            {/* Add card button */}
            <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={onAddCard}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                    style={{
                        color: 'var(--muted-foreground)',
                        fontSize: 12,
                        fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--border)'
                        e.currentTarget.style.color = 'var(--foreground)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                >
                    <Plus size={14} />
                    Add activity
                </button>
            </div>
        </div>
    )
}
