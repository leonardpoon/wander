// boundary/PackingList.tsx
// US-33, US-34: packing list — shared checklist across all trip members

import { useState } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { useCards } from '../controller/useCards'

interface PackingListProps {
    tripId: string
}

export function PackingList({ tripId }: PackingListProps) {
    const {
        packingItems,
        isLoading,
        addPacking,
        togglePacking,
        deletePacking,
    } = useCards(tripId)

    const [newLabel, setNewLabel] = useState('')
    const [adding,   setAdding]   = useState(false)

    const checkedCount = packingItems.filter((i) => i.checked).length
    const totalCount   = packingItems.length
    const packedPercent = totalCount > 0
        ? Math.round((checkedCount / totalCount) * 100)
        : 0

    async function handleAdd() {
        if (!newLabel.trim()) return
        await addPacking(newLabel.trim())
        setNewLabel('')
        setAdding(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Loading…</p>
            </div>
        )
    }

    return (
        <div
            className="flex flex-col h-full max-w-2xl mx-auto"
            style={{ padding: '24px 16px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    700,
                            fontSize:      20,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.02em',
                            marginBottom:  4,
                        }}
                    >
                        Packing List
                    </h2>

                    {/* US-34: progress indicator */}
                    {totalCount > 0 && (
                        <div className="flex items-center gap-2">
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                {checkedCount} of {totalCount} packed
                            </p>
                            <span
                                className="rounded-full px-2 py-0.5"
                                style={{
                                    background: checkedCount === totalCount
                                        ? 'color-mix(in srgb, var(--success) 14%, transparent)'
                                        : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                                    color:      checkedCount === totalCount
                                        ? 'var(--success)'
                                        : 'var(--accent)',
                                    fontSize:   11,
                                    fontWeight: 700,
                                }}
                            >
                                {packedPercent}%
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition-colors"
                    style={{
                        background: 'var(--accent)',
                        color:      'var(--accent-foreground)',
                        fontSize:   13,
                        fontWeight: 600,
                    }}
                >
                    <Plus size={14} />
                    Add Item
                </button>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
                <div
                    className="rounded-full overflow-hidden mb-6"
                    style={{
                        height:     6,
                        background: 'var(--border)',
                    }}
                >
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width:      `${packedPercent}%`,
                            background: checkedCount === totalCount
                                ? 'var(--success)'
                                : 'var(--accent)',
                        }}
                    />
                </div>
            )}

            {/* Add item input */}
            {adding && (
                <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
                    style={{
                        background: 'var(--card)',
                        border:     '1px solid var(--ring)',
                        boxShadow:  '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                >
                    <input
                        autoFocus
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g. Passport, sunscreen…"
                        className="flex-1 outline-none"
                        style={{
                            background: 'transparent',
                            color:      'var(--foreground)',
                            fontSize:   13,
                            border:     'none',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter')  handleAdd()
                            if (e.key === 'Escape') setAdding(false)
                        }}
                    />
                    <button
                        onClick={handleAdd}
                        className="rounded-lg px-3 py-1.5"
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
                        onClick={() => setAdding(false)}
                        className="rounded-lg px-2 py-1.5"
                        style={{
                            color:   'var(--muted-foreground)',
                            fontSize: 12,
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Empty state */}
            {totalCount === 0 && !adding && (
                <div
                    className="flex flex-col items-center justify-center flex-1 gap-3"
                    style={{ color: 'var(--muted-foreground)' }}
                >
                    <Package size={32} style={{ opacity: 0.4 }} />
                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                        Nothing to pack yet
                    </p>
                    <p style={{ fontSize: 12 }}>
                        Add items to share the packing list with your group
                    </p>
                </div>
            )}

            {/* Packing items list */}
            <div className="flex flex-col" style={{ gap: 6 }}>
                {/* Unchecked items first */}
                {packingItems
                    .filter((i) => !i.checked)
                    .map((item) => (
                        <PackingRow
                            key={item.id}
                            label={item.label}
                            checked={item.checked}
                            onToggle={() => togglePacking(item.id, !item.checked)}
                            onDelete={() => deletePacking(item.id)}
                        />
                    ))}

                {/* Divider if there are checked items */}
                {checkedCount > 0 && packingItems.some((i) => !i.checked) && (
                    <div
                        className="flex items-center gap-2 my-2"
                        style={{ color: 'var(--muted-foreground)' }}
                    >
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 11, fontWeight: 500 }}>
                            Packed ({checkedCount})
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                )}

                {/* Checked items at bottom */}
                {packingItems
                    .filter((i) => i.checked)
                    .map((item) => (
                        <PackingRow
                            key={item.id}
                            label={item.label}
                            checked={item.checked}
                            onToggle={() => togglePacking(item.id, !item.checked)}
                            onDelete={() => deletePacking(item.id)}
                        />
                    ))}
            </div>
        </div>
    )
}

// ─── PackingRow ───────────────────────────────────────────────────────────────

interface PackingRowProps {
    label:    string
    checked:  boolean
    onToggle: () => void
    onDelete: () => void
}

function PackingRow({ label, checked, onToggle, onDelete }: PackingRowProps) {
    return (
        <div
            className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
            style={{
                background: 'var(--card)',
                border:     '1px solid var(--border)',
                opacity:    checked ? 0.65 : 1,
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
            {/* Checkbox */}
            <button
                onClick={onToggle}
                className="rounded-md flex items-center justify-center shrink-0 transition-all"
                style={{
                    width:      20,
                    height:     20,
                    background: checked ? 'var(--success)' : 'transparent',
                    border:     `2px solid ${checked ? 'var(--success)' : 'var(--border)'}`,
                }}
            >
                {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </button>

            {/* Label */}
            <span
                style={{
                    flex:           1,
                    fontSize:       13,
                    fontWeight:     500,
                    color:          'var(--foreground)',
                    textDecoration: checked ? 'line-through' : 'none',
                }}
            >
                {label}
            </span>

            {/* Delete — on hover */}
            <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            >
                <Trash2 size={13} />
            </button>
        </div>
    )
}
