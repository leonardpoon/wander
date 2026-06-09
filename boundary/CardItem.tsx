// boundary/CardItem.tsx
// US-11 to US-18: individual kanban card
// US-12: drag source for reordering
// US-13: fixed time badge
// US-14: category colour coding
// US-15: location display
// US-16: budget display
// US-26: home currency in brackets

import { useRef } from 'react'
import { useDrag } from 'react-dnd'
import {
    MapPin,
    Clock,
    Anchor,
    Pencil,
    Plane,
    Eye,
    ShoppingBag,
    UtensilsCrossed,
} from 'lucide-react'
import { Card } from '../entity/Cards'

const DND_CARD = 'CARD'

const CATEGORY_CONFIG = {
    travel: {
        color:      'var(--category-travel)',
        background: '#3B82F615',
        icon:       <Plane size={11} />,
    },
    sightsee: {
        color:      'var(--category-sightsee)',
        background: '#22C55E15',
        icon:       <Eye size={11} />,
    },
    shopping: {
        color:      'var(--category-shopping)',
        background: '#F59E0B15',
        icon:       <ShoppingBag size={11} />,
    },
    eating: {
        color:      'var(--category-eating)',
        background: '#EC489915',
        icon:       <UtensilsCrossed size={11} />,
    },
} as const

interface CardItemProps {
    card:     Card
    index:    number
    columnId: string
    onEdit:   () => void
    onMove:   (cardId: string, targetColumnId: string, targetPosition: number) => Promise<void>
}

export function CardItem({ card, index, columnId, onEdit, onMove }: CardItemProps) {
    const cardRef = useRef<HTMLDivElement>(null)

    // US-12: drag source
    const [{ isDragging }, drag] = useDrag({
        type: DND_CARD,
        item: { cardId: card.id, sourceColumnId: columnId, sourceIndex: index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    })

    drag(cardRef)

    const config = CATEGORY_CONFIG[card.category] ?? CATEGORY_CONFIG.travel

    // format time_value "14:30:00" → "14:30"
    function formatTime(timeVal: string): string {
        return timeVal.slice(0, 5)
    }

    return (
        <div
            ref={cardRef}
            className="group relative rounded-xl cursor-grab transition-all"
            style={{
                background:  'var(--card)',
                border:      `1px solid var(--border)`,
                borderLeft:  `3px solid ${config.color}`,
                opacity:      isDragging ? 0.4 : 1,
                boxShadow:    isDragging
                    ? 'none'
                    : '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
                if (!isDragging) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                e.currentTarget.style.transform = 'translateY(0)'
            }}
        >
            {/* Edit button — appears on hover */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                }}
                className="absolute top-2 right-2 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                    background: 'var(--muted)',
                    color:      'var(--muted-foreground)',
                }}
            >
                <Pencil size={11} />
            </button>

            <div className="p-3">
                {/* US-14: category chip + sub-category */}
                <div className="flex items-center gap-1.5 mb-2">
                    <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                            background: config.background,
                            color:      config.color,
                            fontSize:   10,
                            fontWeight: 600,
                        }}
                    >
                        {config.icon}
                        {card.category.charAt(0).toUpperCase() + card.category.slice(1)}
                    </span>

                    {card.sub_category && (
                        <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                            · {card.sub_category}
                        </span>
                    )}
                </div>

                {/* Title */}
                <p
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600,
                        fontSize:   13,
                        color:      'var(--foreground)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                        marginBottom: 6,
                        paddingRight: 20,  // space for edit button
                    }}
                >
                    {card.title}
                </p>

                {/* US-13: time + fixed badge */}
                {card.time_value && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <Clock size={11} style={{ color: 'var(--muted-foreground)' }} />
                        <span style={{
                            fontSize:   11,
                            color:      'var(--foreground)',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 500,
                        }}>
                            {formatTime(card.time_value)}
                        </span>

                        {/* US-13: fixed time anchor badge */}
                        {card.fixed_time && (
                            <span
                                className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
                                style={{
                                    background: '#6366F115',
                                    color:      '#6366F1',
                                    fontSize:   9,
                                    fontWeight: 700,
                                }}
                            >
                                <Anchor size={8} />
                                Fixed
                            </span>
                        )}
                    </div>
                )}

                {/* Bottom row: location + budget */}
                {(card.location_name || card.budget_amount) && (
                    <div className="flex items-center justify-between mt-2">
                        {/* US-15: location */}
                        {card.location_name ? (
                            <div className="flex items-center gap-1 min-w-0">
                                <MapPin size={10} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                                <span
                                    style={{
                                        fontSize: 10,
                                        color:    'var(--muted-foreground)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {card.location_name}
                                </span>
                            </div>
                        ) : (
                            <span />
                        )}

                        {/* US-16, US-26: budget amount */}
                        {card.budget_amount && (
                            <span
                                style={{
                                    fontSize:   10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 500,
                                    color:      'var(--muted-foreground)',
                                    whiteSpace: 'nowrap',
                                    marginLeft:  8,
                                }}
                            >
                                {card.budget_amount.toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}