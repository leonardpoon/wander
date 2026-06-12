import { useRef } from 'react'
import { useDrop } from 'react-dnd'

const DND_CARD = 'CARD'
const DND_GROUP = 'GROUP'

interface DragCardItem {
    kind?: 'card'
    cardId: string
    sourceColumnId: string
    sourceIndex: number
    sourcePosition: number
    sourceGroupId?: string | null
}

interface DragGroupItem {
    kind: 'group'
    groupId: string
    sourceColumnId: string
    sourcePosition: number
}

type DragItem = DragCardItem | DragGroupItem

interface CardDropZoneProps {
    columnId: string
    position: number
    groupId?: string | null
    onMoveCard: (
        cardId: string,
        targetColumnId: string,
        targetPosition: number,
        targetGroupId?: string | null
    ) => Promise<void>
    onMoveGroup?: (
        groupId: string,
        targetColumnId: string,
        targetPosition: number
    ) => Promise<void>
}

export function CardDropZone({
    columnId,
    position,
    groupId = null,
    onMoveCard,
    onMoveGroup,
}: CardDropZoneProps) {
    const zoneRef = useRef<HTMLDivElement>(null)

    const [{ isOver, canDrop }, drop] = useDrop<
        DragItem,
        void,
        { isOver: boolean; canDrop: boolean }
    >({
        accept: [DND_CARD, DND_GROUP],
        canDrop: (item) => {
            if ('groupId' in item) {
                return groupId === null
                    && Boolean(onMoveGroup)
                    && (
                        item.sourceColumnId !== columnId
                        || (position !== item.sourcePosition && position !== item.sourcePosition + 1)
                    )
            }

            return item.sourceColumnId !== columnId
                || (item.sourceGroupId ?? null) !== groupId
                || (position !== item.sourcePosition && position !== item.sourcePosition + 1)
        },
        drop: (item) => {
            if ('groupId' in item) {
                onMoveGroup?.(item.groupId, columnId, position)
                return
            }

            onMoveCard(item.cardId, columnId, position, groupId)
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
    })

    drop(zoneRef)

    return (
        <div
            ref={zoneRef}
            className="transition-all"
            style={{
                height: isOver && canDrop ? 24 : 8,
                borderRadius: 8,
                background: isOver && canDrop
                    ? 'color-mix(in srgb, var(--accent) 26%, transparent)'
                    : 'transparent',
                border: isOver && canDrop
                    ? '1px dashed var(--accent)'
                    : '1px solid transparent',
            }}
        />
    )
}
