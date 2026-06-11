// boundary/TodoBoard.tsx
// US-35 to US-38: to-do kanban board
// US-36: due date colour coding
// US-37: assignee chips

import { useEffect, useRef, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Plus, Trash2, GripVertical, Calendar, User } from 'lucide-react'
import { useCards } from '../controller/useCards'
import { TodoCard } from '../entity/Cards'

const DND_TODO_CARD = 'TODO_CARD'

interface TodoBoardProps {
    tripId: string
}

export function TodoBoard({ tripId }: TodoBoardProps) {
    const {
        todoColumns,
        todoCards,
        isLoading,
        seedTodoColumns,
        addTodoCol,
        renameTodoCol,
        deleteTodoCol,
        createTodoCard,
        editTodoCard,
        moveTodoCard,
        deleteTodoCard,
        getTodoCardsByColumn,
        isOverdue,
    } = useCards(tripId)

    const [newColLabel,    setNewColLabel]    = useState('')
    const [addingCol,      setAddingCol]      = useState(false)
    const [editingColId,   setEditingColId]   = useState<string | null>(null)
    const [editingColLabel,setEditingColLabel]= useState('')
    const [addingCardCol,  setAddingCardCol]  = useState<string | null>(null)
    const [newCardTitle,   setNewCardTitle]   = useState('')
    const [newCardDue,     setNewCardDue]     = useState('')
    const [newCardAssignee,setNewCardAssignee]= useState('')
    const [settingUpDefaults, setSettingUpDefaults] = useState(false)

    // US-35: seed default columns if none exist
    async function handleSeed() {
        setSettingUpDefaults(true)
        try {
            await seedTodoColumns()
        } finally {
            setSettingUpDefaults(false)
        }
    }

    useEffect(() => {
        if (isLoading || todoColumns.length > 0 || settingUpDefaults) return
        handleSeed()
    }, [isLoading, todoColumns.length, settingUpDefaults])

    async function handleAddColumn() {
        if (!newColLabel.trim()) return
        await addTodoCol(newColLabel.trim())
        setNewColLabel('')
        setAddingCol(false)
    }

    async function handleRenameColumn(columnId: string) {
        if (!editingColLabel.trim()) return
        await renameTodoCol(columnId, editingColLabel.trim())
        setEditingColId(null)
    }

    async function handleAddCard(columnId: string) {
        if (!newCardTitle.trim()) return
        await createTodoCard({
            column_id:           columnId,
            title:               newCardTitle.trim(),
            assigned_to_name:    newCardAssignee.trim() || null,
            due_date:            newCardDue || null,
        })
        setNewCardTitle('')
        setNewCardDue('')
        setNewCardAssignee('')
        setAddingCardCol(null)
    }

    const inProgressColumnIds = todoColumns
        .filter((col) => col.label.toLowerCase().includes('progress'))
        .map((col) => col.id)
    const completedColumnIds = todoColumns
        .filter((col) => {
            const label = col.label.toLowerCase()
            return label.includes('done') || label.includes('complete')
        })
        .map((col) => col.id)
    const inProgressCount = todoCards.filter((card) => inProgressColumnIds.includes(card.column_id)).length
    const completedCount = todoCards.filter((card) => completedColumnIds.includes(card.column_id)).length

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Loading…</p>
            </div>
        )
    }

    if (todoColumns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                    {settingUpDefaults ? 'Setting up to-do columns...' : 'No to-do columns yet.'}
                </p>
                <button
                    onClick={handleSeed}
                    disabled={settingUpDefaults}
                    className="rounded-xl px-4 py-2.5"
                    style={{
                        background: 'var(--accent)',
                        color:      'var(--accent-foreground)',
                        fontSize:   13,
                        fontWeight: 600,
                        opacity:    settingUpDefaults ? 0.65 : 1,
                    }}
                >
                    {settingUpDefaults ? 'Setting up...' : 'Set up default columns'}
                </button>
            </div>
        )
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div
                className="flex h-full flex-col overflow-hidden"
                style={{ padding: 16, gap: 12 }}
            >
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
                    <TodoStat
                        label="Total"
                        value={todoCards.length}
                        color="var(--accent)"
                    />
                    <TodoStat
                        label="In Progress"
                        value={inProgressCount}
                        color="#F59E0B"
                    />
                    <TodoStat
                        label="Completed"
                        value={completedCount}
                        color="var(--success)"
                    />
                </div>

                <div className="flex flex-1 overflow-x-auto" style={{ gap: 12 }}>
                {todoColumns.map((col) => {
                    const colCards = getTodoCardsByColumn(col.id)

                    return (
                        <TodoColumnFrame
                            key={col.id}
                            columnId={col.id}
                            cardCount={colCards.length}
                            onMoveCard={moveTodoCard}
                        >
                        {/* Column header */}
                        <div
                            className="flex items-center justify-between px-3 py-2.5"
                            style={{ borderBottom: '1px solid var(--border)' }}
                        >
                            {editingColId === col.id ? (
                                <input
                                    autoFocus
                                    value={editingColLabel}
                                    onChange={(e) => setEditingColLabel(e.target.value)}
                                    onBlur={() => handleRenameColumn(col.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameColumn(col.id)
                                        if (e.key === 'Escape') setEditingColId(null)
                                    }}
                                    className="flex-1 rounded-lg px-2 py-1 outline-none"
                                    style={{
                                        background: 'var(--card)',
                                        border:     '1px solid var(--ring)',
                                        color:      'var(--foreground)',
                                        fontSize:   13,
                                        fontWeight: 600,
                                    }}
                                />
                            ) : (
                                <span
                                    style={{
                                        fontFamily: "'Inter', system-ui, sans-serif",
                                        fontWeight: 700,
                                        fontSize:   13,
                                        color:      'var(--foreground)',
                                        cursor:     'pointer',
                                    }}
                                    onDoubleClick={() => {
                                        setEditingColId(col.id)
                                        setEditingColLabel(col.label)
                                    }}
                                >
                                    {col.label}
                                </span>
                            )}

                            <div className="flex items-center gap-1.5">
                                {/* Card count */}
                                <span
                                    className="rounded-full px-2 py-0.5"
                                    style={{
                                        background: 'var(--border)',
                                        color:      'var(--muted-foreground)',
                                        fontSize:   11,
                                        fontWeight: 600,
                                    }}
                                >
                                    {colCards.length}
                                </span>

                                {/* Delete column */}
                                <button
                                    onClick={() => deleteTodoCol(col.id)}
                                    className="rounded-lg p-1 transition-colors"
                                    style={{ color: 'var(--muted-foreground)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Cards */}
                        <div
                            className="flex flex-col flex-1 overflow-y-auto p-2 transition-colors"
                            style={{
                                gap: 8,
                                cursor: addingCardCol === col.id ? 'default' : 'copy',
                            }}
                            onClick={(e) => {
                                if (addingCardCol === col.id || e.target !== e.currentTarget) return
                                setAddingCardCol(col.id)
                            }}
                            onMouseEnter={(e) => {
                                if (addingCardCol !== col.id) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            {colCards.map((card, index) => (
                                <TodoCardFrame
                                    key={card.id}
                                    card={card}
                                    columnId={col.id}
                                    index={index}
                                >
                                    {/* Title */}
                                    <p
                                        style={{
                                            fontWeight: 600,
                                            fontSize:   13,
                                            color:      'var(--foreground)',
                                            marginBottom: 8,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {card.title}
                                    </p>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* US-37: assignee chip */}
                                        {(card.assigned_to_name || card.assigned_to_user_id) && (
                                            <span
                                                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                                                style={{
                                                    background: 'var(--muted)',
                                                    color:      'var(--foreground)',
                                                    fontSize:   10,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <User size={9} />
                                                {card.assigned_to_name ?? 'Member'}
                                            </span>
                                        )}

                                        {/* US-36: due date chip */}
                                        {card.due_date && (
                                            <span
                                                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                                                style={{
                                                    background: isOverdue(card.due_date)
                                                        ? '#EF444415'
                                                        : '#22C55E15',
                                                    color: isOverdue(card.due_date)
                                                        ? '#EF4444'
                                                        : '#22C55E',
                                                    fontSize:   10,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <Calendar size={9} />
                                                {card.due_date}
                                            </span>
                                        )}
                                    </div>

                                    {/* Delete card */}
                                    <button
                                        onClick={() => deleteTodoCard(card.id)}
                                        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            color:    '#EF4444',
                                            fontSize: 10,
                                        }}
                                    >
                                        Delete
                                    </button>
                                </TodoCardFrame>
                            ))}

                            {colCards.length === 0 && addingCardCol !== col.id && (
                                <button
                                    type="button"
                                    onClick={() => setAddingCardCol(col.id)}
                                    className="flex flex-1 min-h-32 items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors"
                                    style={{
                                        borderColor: 'var(--border)',
                                        color: 'var(--muted-foreground)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--accent)'
                                        e.currentTarget.style.color = 'var(--foreground)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border)'
                                        e.currentTarget.style.color = 'var(--muted-foreground)'
                                    }}
                                >
                                    <Plus size={14} />
                                    Add task
                                </button>
                            )}

                            {/* Add card form */}
                            {addingCardCol === col.id ? (
                                <div
                                    className="rounded-xl p-3"
                                    style={{
                                        background: 'var(--card)',
                                        border:     '1px solid var(--ring)',
                                    }}
                                >
                                    <input
                                        autoFocus
                                        value={newCardTitle}
                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                        placeholder="Card title…"
                                        className="w-full rounded-lg px-2 py-1.5 outline-none mb-2"
                                        style={{
                                            background: 'var(--muted)',
                                            border:     '1px solid var(--border)',
                                            color:      'var(--foreground)',
                                            fontSize:   12,
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddCard(col.id)
                                            if (e.key === 'Escape') setAddingCardCol(null)
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={newCardAssignee}
                                        onChange={(e) => setNewCardAssignee(e.target.value)}
                                        placeholder="Assignee (optional)…"
                                        className="w-full rounded-lg px-2 py-1.5 outline-none mb-2"
                                        style={{
                                            background: 'var(--muted)',
                                            border:     '1px solid var(--border)',
                                            color:      'var(--foreground)',
                                            fontSize:   12,
                                        }}
                                    />
                                    <input
                                        type="date"
                                        value={newCardDue}
                                        onChange={(e) => setNewCardDue(e.target.value)}
                                        className="w-full rounded-lg px-2 py-1.5 outline-none mb-3"
                                        style={{
                                            background: 'var(--muted)',
                                            border:     '1px solid var(--border)',
                                            color:      'var(--foreground)',
                                            fontSize:   12,
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAddCard(col.id)}
                                            className="flex-1 rounded-lg py-1.5"
                                            style={{
                                                background: 'var(--accent)',
                                                color:      'var(--accent-foreground)',
                                                fontSize:   12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setAddingCardCol(null)}
                                            className="rounded-lg px-3 py-1.5"
                                            style={{
                                                background: 'var(--muted)',
                                                color:      'var(--muted-foreground)',
                                                fontSize:   12,
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAddingCardCol(col.id)}
                                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                                    style={{
                                        color:    'var(--muted-foreground)',
                                        fontSize: 12,
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Plus size={13} />
                                    Add card
                                </button>
                            )}
                        </div>
                        </TodoColumnFrame>
                    )
                })}

            {/* Add column button */}
                <div className="shrink-0" style={{ width: 280 }}>
                {addingCol ? (
                    <div
                        className="rounded-xl p-3"
                        style={{
                            background: 'var(--muted)',
                            border:     '1px solid var(--ring)',
                        }}
                    >
                        <input
                            autoFocus
                            value={newColLabel}
                            onChange={(e) => setNewColLabel(e.target.value)}
                            placeholder="Column name…"
                            className="w-full rounded-lg px-2 py-1.5 outline-none mb-2"
                            style={{
                                background: 'var(--card)',
                                border:     '1px solid var(--border)',
                                color:      'var(--foreground)',
                                fontSize:   13,
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddColumn()
                                if (e.key === 'Escape') setAddingCol(false)
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddColumn}
                                className="flex-1 rounded-lg py-1.5"
                                style={{
                                    background: 'var(--accent)',
                                    color:      'var(--accent-foreground)',
                                    fontSize:   12,
                                    fontWeight: 600,
                                }}
                            >
                                Add Column
                            </button>
                            <button
                                onClick={() => setAddingCol(false)}
                                className="rounded-lg px-3 py-1.5"
                                style={{
                                    background: 'var(--muted)',
                                    color:      'var(--muted-foreground)',
                                    fontSize:   12,
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setAddingCol(true)}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
                        style={{
                            background: 'var(--muted)',
                            color:      'var(--muted-foreground)',
                            fontSize:   13,
                            border:     '2px dashed var(--border)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <Plus size={14} />
                        Add Column
                    </button>
                )}
                </div>
                </div>
            </div>
        </DndProvider>
    )
}

interface TodoStatProps {
    label: string
    value: number
    color: string
}

function TodoStat({ label, value, color }: TodoStatProps) {
    return (
        <div
            className="flex min-w-32 items-center justify-center gap-2 rounded-full px-3 py-1.5"
            style={{
                background: `color-mix(in srgb, ${color} 12%, var(--card))`,
                border:     `1px solid color-mix(in srgb, ${color} 35%, var(--border))`,
                color,
                fontSize:   12,
                fontWeight: 600,
            }}
        >
            <span>{label}</span>
            <span
                className="rounded-full px-1.5"
                style={{
                    background: 'var(--card)',
                    color,
                    fontWeight: 700,
                }}
            >
                {value}
            </span>
        </div>
    )
}

interface TodoColumnFrameProps {
    columnId: string
    cardCount: number
    onMoveCard: (cardId: string, targetColumnId: string, targetPosition: number) => Promise<void>
    children: React.ReactNode
}

function TodoColumnFrame({ columnId, cardCount, onMoveCard, children }: TodoColumnFrameProps) {
    const columnRef = useRef<HTMLDivElement>(null)
    const [{ isOver }, drop] = useDrop({
        accept: DND_TODO_CARD,
        drop: (item: { cardId: string }) => {
            onMoveCard(item.cardId, columnId, cardCount)
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    })

    drop(columnRef)

    return (
        <div
            ref={columnRef}
            className="flex flex-col shrink-0 rounded-xl transition-colors"
            style={{
                width:      280,
                background: isOver
                    ? 'color-mix(in srgb, var(--accent) 10%, var(--muted))'
                    : 'var(--muted)',
                border:    isOver ? '2px solid var(--accent)' : '2px solid transparent',
                maxHeight: '100%',
            }}
        >
            {children}
        </div>
    )
}

interface TodoCardFrameProps {
    card: TodoCard
    columnId: string
    index: number
    children: React.ReactNode
}

function TodoCardFrame({ card, columnId, index, children }: TodoCardFrameProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [{ isDragging }, drag] = useDrag({
        type: DND_TODO_CARD,
        item: { cardId: card.id, sourceColumnId: columnId, sourceIndex: index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    })

    drag(cardRef)

    return (
        <div
            ref={cardRef}
            className="group rounded-xl p-3 transition-all"
            style={{
                background: 'var(--card)',
                border:     '1px solid var(--border)',
                boxShadow:  isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                cursor:     isDragging ? 'grabbing' : 'grab',
                opacity:    isDragging ? 0.45 : 1,
            }}
        >
            <div className="flex items-start gap-2">
                <GripVertical
                    size={13}
                    style={{
                        color:      'var(--muted-foreground)',
                        flexShrink: 0,
                        marginTop:  1,
                    }}
                />
                <div className="min-w-0 flex-1">
                    {children}
                </div>
            </div>
        </div>
    )
}
