import { useRef } from 'react'
import { useDrop } from 'react-dnd'
import { Layers } from 'lucide-react'
import { Card, CardGroup } from '../entity/Cards'
import { CardCategoryOption } from '../entity/CardCategories'
import { CardItem } from './CardItem'
import { CardDropZone } from './CardDropZone'

const DND_CARD = 'CARD'

interface CardGroupItemProps {
    group: CardGroup
    cards: Card[]
    columnId: string
    categoryOptions: CardCategoryOption[]
    onEditCard: (card: Card) => void
    onMoveCard: (
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ) => Promise<void>
    onAddCardToGroup: (cardId: string, groupId: string) => Promise<void>
    onRemoveCardFromGroup: (cardId: string) => Promise<void>
}

export function CardGroupItem({
    group,
    cards,
    columnId,
    categoryOptions,
    onEditCard,
    onMoveCard,
    onAddCardToGroup,
    onRemoveCardFromGroup,
}: CardGroupItemProps) {
    const groupRef = useRef<HTMLDivElement>(null)

    const [{ isOver }, drop] = useDrop<
        { cardId: string; sourceColumnId: string; sourceGroupId?: string | null },
        void,
        { isOver: boolean }
    >({
        accept: DND_CARD,
        canDrop: (item: { cardId: string; sourceColumnId: string }) =>
            item.sourceColumnId === columnId
            && !cards.some((card) => card.id === item.cardId),
        drop: (item: { cardId: string }) => {
            const lastPosition = cards.length > 0
                ? Math.max(...cards.map((card) => card.position))
                : group.position
            onMoveCard(item.cardId, columnId, lastPosition + 1, group.id)
        },
        collect: (monitor) => ({
            isOver: monitor.canDrop() && monitor.isOver({ shallow: true }),
        }),
    })

    drop(groupRef)

    return (
        <div
            ref={groupRef}
            className="rounded-xl transition-all"
            style={{
                background: `${group.color}12`,
                border: `2px solid ${isOver ? group.color : `${group.color}55`}`,
                boxShadow: isOver ? `0 0 0 3px ${group.color}22` : 'none',
                padding: 8,
            }}
        >
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <span
                        className="flex items-center justify-center rounded-full"
                        style={{
                            width: 20,
                            height: 20,
                            background: group.color,
                            color: 'white',
                            flexShrink: 0,
                        }}
                    >
                        <Layers size={11} />
                    </span>
                    <span
                        style={{
                            color: 'var(--foreground)',
                            fontSize: 12,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {group.title}
                    </span>
                </div>
                <span
                    className="rounded-full px-2 py-0.5"
                    style={{
                        background: 'var(--card)',
                        color: 'var(--muted-foreground)',
                        fontSize: 10,
                        fontWeight: 700,
                    }}
                >
                    {cards.length}
                </span>
            </div>

            <div className="flex flex-col" style={{ gap: 8 }}>
                <CardDropZone
                    columnId={columnId}
                    position={cards[0]?.position ?? group.position}
                    groupId={group.id}
                    onMoveCard={onMoveCard}
                />
                {cards.map((card, index) => (
                    <div key={card.id} className="flex flex-col" style={{ gap: 8 }}>
                        <CardItem
                            card={card}
                            index={index}
                            columnId={columnId}
                            categoryOptions={categoryOptions}
                            onEdit={() => onEditCard(card)}
                            onMove={onMoveCard}
                            onUngroup={onRemoveCardFromGroup}
                            enableGrouping={false}
                        />
                        <CardDropZone
                            columnId={columnId}
                            position={card.position + 1}
                            groupId={group.id}
                            onMoveCard={onMoveCard}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
