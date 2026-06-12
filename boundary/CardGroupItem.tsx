import { useRef, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { Card, CardGroup } from '../entity/Cards'
import { CardCategoryOption } from '../entity/CardCategories'
import { CardItem } from './CardItem'
import { CardDropZone } from './CardDropZone'

const DND_CARD = 'CARD'
const DND_GROUP = 'GROUP'

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
    onMoveGroup: (
        groupId: string,
        targetColumnId: string,
        targetPosition: number
    ) => Promise<void>
    onAddCardToGroup: (cardId: string, groupId: string) => Promise<void>
    onRemoveCardFromGroup: (cardId: string) => Promise<void>
    onRenameGroup: (groupId: string, title: string) => Promise<void>
}

export function CardGroupItem({
    group,
    cards,
    columnId,
    categoryOptions,
    onEditCard,
    onMoveCard,
    onMoveGroup,
    onAddCardToGroup,
    onRemoveCardFromGroup,
    onRenameGroup,
}: CardGroupItemProps) {
    const groupRef = useRef<HTMLDivElement>(null)
    const dragHandleRef = useRef<HTMLDivElement>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [editingTitle, setEditingTitle] = useState(false)
    const [draftTitle, setDraftTitle] = useState(group.title)

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

    const [{ isDragging }, drag] = useDrag({
        type: DND_GROUP,
        item: {
            kind: 'group',
            groupId: group.id,
            sourceColumnId: columnId,
            sourcePosition: group.position,
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    })

    drop(groupRef)
    drag(dragHandleRef)

    return (
        <div
            ref={groupRef}
            className="rounded-xl transition-all"
            style={{
                background: `${group.color}12`,
                border: `2px solid ${isOver ? group.color : `${group.color}55`}`,
                boxShadow: isOver ? `0 0 0 3px ${group.color}22` : 'none',
                opacity: isDragging ? 0.4 : 1,
                padding: 8,
            }}
        >
            <div ref={dragHandleRef} className="flex cursor-grab items-center justify-between gap-2 px-1 pb-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setCollapsed((value) => !value)}
                        className="rounded-md p-0.5"
                        style={{ color: group.color, flexShrink: 0 }}
                        title={collapsed ? 'Expand group' : 'Collapse group'}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
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
                    {editingTitle ? (
                        <input
                            value={draftTitle}
                            autoFocus
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onBlur={async () => {
                                setEditingTitle(false)
                                if (draftTitle.trim() && draftTitle.trim() !== group.title) {
                                    await onRenameGroup(group.id, draftTitle)
                                } else {
                                    setDraftTitle(group.title)
                                }
                            }}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur()
                                }
                                if (e.key === 'Escape') {
                                    setDraftTitle(group.title)
                                    setEditingTitle(false)
                                }
                            }}
                            className="min-w-0 rounded-md px-1 py-0.5 outline-none"
                            style={{
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                fontSize: 12,
                                fontWeight: 700,
                                width: '100%',
                            }}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setEditingTitle(true)}
                            className="min-w-0 text-left"
                            title="Rename group"
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
                        </button>
                    )}
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

            {!collapsed && (
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
            )}
        </div>
    )
}
