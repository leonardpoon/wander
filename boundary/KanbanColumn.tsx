// boundary/KanbanColumn.tsx
// US-11 to US-18: kanban column — date header, weather strip, card list, add button
// US-19: weather strip display
// US-12: drop target for drag and drop

import { useRef } from 'react'
import { useDrop } from 'react-dnd'
import { Plus, CloudSun } from 'lucide-react'
import { CardItem } from './CardItem'
import { Card } from '../entity/Cards'
import { WeatherForecast } from '../controller/weatherService'
import { getWeatherIcon } from './WeatherIcon'

const DND_CARD = 'CARD'

interface KanbanColumnProps {
    columnId:    string
    date:        string
    label:       string
    cards:       Card[]
    weather:     WeatherForecast | null
    accentColor: string
    onAddCard:   () => void
    onEditCard:  (card: Card) => void
    onMoveCard:  (cardId: string, targetColumnId: string, targetPosition: number) => Promise<void>
}

export function KanbanColumn({
    columnId,
    date,
    label,
    cards,
    weather,
    accentColor,
    onAddCard,
    onEditCard,
    onMoveCard,
}: KanbanColumnProps) {
    const columnRef = useRef<HTMLDivElement>(null)

    // US-12: drop target — accepts dragged cards
    const [{ isOver }, drop] = useDrop({
        accept: DND_CARD,
        drop: (item: { cardId: string }) => {
            // drop at the end of the column
            onMoveCard(item.cardId, columnId, cards.length)
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    })

    drop(columnRef)

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
            className="flex flex-col shrink-0 rounded-xl transition-colors"
            style={{
                width: 280,
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
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                className="flex flex-col flex-1 overflow-y-auto p-2"
                style={{ gap: 8 }}
            >
                {cards.map((card, index) => (
                    <CardItem
                        key={card.id}
                        card={card}
                        index={index}
                        columnId={columnId}
                        onEdit={() => onEditCard(card)}
                        onMove={onMoveCard}
                    />
                ))}
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
                    Add card
                </button>
            </div>
        </div>
    )
}