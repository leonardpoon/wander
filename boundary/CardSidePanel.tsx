// boundary/CardSidePanel.tsx
// US-11 to US-18: card create/edit side panel
// US-13: fixed time toggle
// US-14: category + sub-category selector
// US-15: location search with Nominatim geocoding
// US-16: budget input
// US-17: notes textarea

import { useState, useEffect } from 'react'
import {
    X,
    MapPin,
    Clock,
    DollarSign,
    FileText,
    Trash2,
    Plane,
    Eye,
    ShoppingBag,
    UtensilsCrossed,
    Tag,
} from 'lucide-react'
import { Card, CardCategory } from '../entity/Cards'
import { cardService } from '../controller/cardService'
import { fxService } from '../controller/fxService'
import { CardCategoryOption } from '../entity/CardCategories'

const EATING_SUBS = ['Breakfast', 'Lunch', 'Dinner', 'Café', 'Bar']
const TRAVEL_SUBS = ['Flight', 'Train', 'Bus', 'Ferry', 'Taxi', 'Accommodation']
const BOOKING_DETAIL_SUBS = ['Flight', 'Train', 'Accommodation']
const SUPPORTED_BUDGET_CURRENCIES = fxService.getSupportedCurrencies().map((currency) => currency.code)

function normalizeArrowText(value: string): string {
    return value.replace(/\s*->\s*/g, ' → ')
}

function parseBookingNotes(value: string | null | undefined): {
    bookingReference: string
    travelDetails: string
    notes: string
} {
    if (!value) return { bookingReference: '', travelDetails: '', notes: '' }

    const bookingMatch = value.match(/^Booking reference:\s*(.*)$/im)
    const detailsMatch = value.match(/^Details:\s*([\s\S]*)$/im)

    if (bookingMatch || detailsMatch) {
        return {
            bookingReference: bookingMatch?.[1]?.trim() ?? '',
            travelDetails: detailsMatch?.[1]?.trim() ?? '',
            notes: '',
        }
    }

    return { bookingReference: '', travelDetails: '', notes: value }
}

interface ColumnOption {
    id:       string
    date:     string
    label:    string
    currency: string
}

interface CardSidePanelProps {
    tripId:   string
    columnId: string
    card:     Card | null   // null = create mode
    columns:  ColumnOption[]
    categoryOptions: CardCategoryOption[]
    onSave:   (payload: {
        category:      CardCategory
        sub_category?: string | null
        title:         string
        location_name?: string | null
        fixed_time?:   boolean
        time_value?:   string | null
        budget_amount?: number | null
        budget_currency?: string | null
        notes?:        string | null
        column_id?:    string
    }) => Promise<void>
    onDelete: () => Promise<void>
    onClose:  () => void
}

export function CardSidePanel({
    tripId,
    columnId,
    card,
    columns,
    categoryOptions,
    onSave,
    onDelete,
    onClose,
}: CardSidePanelProps) {
    const isEdit = card !== null

    // form state
    const [category,     setCategory]     = useState<CardCategory>(card?.category ?? 'sightsee')
    const [subCategory,  setSubCategory]  = useState<string>(card?.sub_category ?? '')
    const [title,        setTitle]        = useState(card?.title ?? '')
    const [locationName, setLocationName] = useState(card?.location_name ?? '')
    const [fixedTime,    setFixedTime]    = useState(card?.fixed_time ?? false)
    const [timeValue,    setTimeValue]    = useState(card?.time_value?.slice(0, 5) ?? '')
    const [budgetAmount, setBudgetAmount] = useState(card?.budget_amount?.toString() ?? '')
    const [budgetCurrency, setBudgetCurrency] = useState(card?.budget_currency ?? '')
    const parsedNotes = parseBookingNotes(card?.notes)
    const [notes,        setNotes]        = useState(parsedNotes.notes)
    const [bookingReference, setBookingReference] = useState(parsedNotes.bookingReference)
    const [travelDetails, setTravelDetails] = useState(parsedNotes.travelDetails)
    const [selectedCol,  setSelectedCol]  = useState(card?.column_id ?? columnId)
    const [saving,       setSaving]       = useState(false)
    const [deleting,     setDeleting]     = useState(false)
    const [error,        setError]        = useState<string | null>(null)

    // reset sub_category when category changes
    useEffect(() => {
        setSubCategory('')
    }, [category])

    async function handleSave() {
        if (!title.trim()) {
            setError('Title is required')
            return
        }
        if (fixedTime && !timeValue) {
            setError('Time is required when Fixed Time is enabled')
            return
        }

        setSaving(true)
        setError(null)

        try {
            if (budgetAmount && !SUPPORTED_BUDGET_CURRENCIES.includes(effectiveBudgetCurrency)) {
                setError(`Use a supported currency code, for example ${selectedColumnCurrency}.`)
                return
            }

            const shouldUseBookingFields = category === 'travel' && BOOKING_DETAIL_SUBS.includes(subCategory)
            const savedNotes = shouldUseBookingFields
                ? [
                    bookingReference.trim() ? `Booking reference: ${normalizeArrowText(bookingReference.trim())}` : null,
                    travelDetails.trim() ? `Details: ${normalizeArrowText(travelDetails.trim())}` : null,
                ].filter(Boolean).join('\n')
                : normalizeArrowText(notes.trim())

            await onSave({
                category,
                sub_category:  subCategory || null,
                title:         normalizeArrowText(title.trim()),
                location_name: locationName.trim() ? normalizeArrowText(locationName.trim()) : null,
                fixed_time:    fixedTime,
                time_value:    fixedTime ? timeValue : null,
                budget_amount: budgetAmount ? parseFloat(budgetAmount) : null,
                budget_currency: budgetAmount ? effectiveBudgetCurrency : null,
                notes:         savedNotes || null,
                column_id:     selectedCol,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save card')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this card?')) return
        setDeleting(true)
        try {
            await onDelete()
        } finally {
            setDeleting(false)
        }
    }

    const subOptions = category === 'eating' ? EATING_SUBS
        : category === 'travel' ? TRAVEL_SUBS
        : []
    const selectedColumnCurrency = columns.find((col) => col.id === selectedCol)?.currency ?? 'USD'
    const effectiveBudgetCurrency = budgetCurrency || selectedColumnCurrency
    const showBookingFields = category === 'travel' && BOOKING_DETAIL_SUBS.includes(subCategory)

    function getCategoryIcon(categoryId: string): React.ReactNode {
        if (categoryId === 'travel') return <Plane size={14} />
        if (categoryId === 'sightsee') return <Eye size={14} />
        if (categoryId === 'shopping') return <ShoppingBag size={14} />
        if (categoryId === 'eating') return <UtensilsCrossed size={14} />
        return <Tag size={14} />
    }

    return (
        <div
            className="wander-card-panel flex flex-col h-full overflow-hidden"
            style={{
                background:  'var(--card)',
                borderLeft:  '1px solid var(--border)',
                flexShrink:  0,
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <h2
                    style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize:   15,
                        color:      'var(--foreground)',
                    }}
                >
                    {isEdit ? 'Edit Card' : 'New Card'}
                </h2>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ gap: 20 }}>

                {/* US-14: Category selector */}
                <div className="mb-5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Category
                    </label>
                    <div className="flex gap-2 mt-2">
                        {categoryOptions.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className="flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 transition-all"
                                style={{
                                    background: category === cat.id ? `${cat.color}20` : 'var(--muted)',
                                    border: `2px solid ${category === cat.id ? cat.color : 'transparent'}`,
                                    color: category === cat.id ? cat.color : 'var(--muted-foreground)',
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            >
                                {getCategoryIcon(cat.id)}
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub-category — conditional */}
                {subOptions.length > 0 && (
                    <div className="mb-5">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Type
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {subOptions.map((sub) => (
                                <button
                                    key={sub}
                                    onClick={() => setSubCategory(subCategory === sub ? '' : sub)}
                                    className="rounded-full px-3 py-1 transition-all"
                                    style={{
                                        background: subCategory === sub ? 'var(--accent)' : 'var(--muted)',
                                        color: subCategory === sub ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                                        fontSize: 12,
                                        fontWeight: subCategory === sub ? 600 : 400,
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Title */}
                <div className="mb-5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Title *
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Add a title"
                        className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none transition-all"
                        style={{
                            background: 'var(--input-background)',
                            border:     '1px solid var(--border)',
                            color:      'var(--foreground)',
                            fontSize:   13,
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                </div>

                {/* Date column selector */}
                <div className="mb-5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Date
                    </label>
                    <select
                        value={selectedCol}
                        onChange={(e) => setSelectedCol(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none"
                        style={{
                            background: 'var(--input-background)',
                            border:     '1px solid var(--border)',
                            color:      'var(--foreground)',
                            fontSize:   13,
                        }}
                    >
                        {columns.map((col) => (
                            <option key={col.id} value={col.id}>
                                {col.date} {col.label ? `· ${col.label}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* US-15: Location */}
                <div className="mb-5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <span className="flex items-center gap-1.5">
                            <MapPin size={11} /> Location
                        </span>
                    </label>
                    <input
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Search for a place"
                        className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none transition-all"
                        style={{
                            background: 'var(--input-background)',
                            border:     '1px solid var(--border)',
                            color:      'var(--foreground)',
                            fontSize:   13,
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    <p style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4 }}>
                        Geocoded via Nominatim on save
                    </p>
                </div>

                {/* US-13: Fixed time toggle */}
                <div className="mb-5">
                    <div className="flex items-center justify-between">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <span className="flex items-center gap-1.5">
                                <Clock size={11} /> Fixed Time
                            </span>
                        </label>
                        {/* Toggle switch */}
                        <button
                            onClick={() => setFixedTime((v) => !v)}
                            className="rounded-full transition-all"
                            style={{
                                width:      40,
                                height:     22,
                                background: fixedTime ? 'var(--accent)' : 'var(--switch-background)',
                                position:   'relative',
                                flexShrink: 0,
                            }}
                        >
                            <span
                                className="absolute rounded-full bg-white transition-all"
                                style={{
                                    width:  16,
                                    height: 16,
                                    top:    3,
                                    left:   fixedTime ? 21 : 3,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }}
                            />
                        </button>
                    </div>

                    {/* Time picker — revealed when fixed time is on */}
                    {fixedTime && (
                        <input
                            type="time"
                            value={timeValue}
                            onChange={(e) => setTimeValue(e.target.value)}
                            className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none"
                            style={{
                                background:  'var(--input-background)',
                                border:      '1px solid var(--border)',
                                color:       'var(--foreground)',
                                fontSize:    13,
                                fontFamily:  "'JetBrains Mono', monospace",
                            }}
                        />
                    )}
                </div>

                {/* US-16: Budget */}
                <div className="mb-5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <span className="flex items-center gap-1.5">
                            <DollarSign size={11} /> Budget
                        </span>
                    </label>
                    <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: '1fr 96px' }}>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                            placeholder={`0.00 ${effectiveBudgetCurrency}`}
                            className="w-full rounded-xl px-3 py-2.5 outline-none transition-all"
                            style={{
                                background:  'var(--input-background)',
                                border:      '1px solid var(--border)',
                                color:       'var(--foreground)',
                                fontSize:    13,
                                fontFamily:  "'JetBrains Mono', monospace",
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        />
                        <input
                            value={budgetCurrency}
                            onChange={(e) => setBudgetCurrency(e.target.value.slice(0, 3).toUpperCase())}
                            list="budget-currency-options"
                            placeholder={selectedColumnCurrency}
                            className="w-full rounded-xl px-3 py-2.5 outline-none transition-all"
                            style={{
                                background: 'var(--input-background)',
                                border:     '1px solid var(--border)',
                                color:      'var(--foreground)',
                                fontSize:   13,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        />
                    </div>
                    <datalist id="budget-currency-options">
                        {SUPPORTED_BUDGET_CURRENCIES.map((currency) => (
                            <option key={currency} value={currency} />
                        ))}
                    </datalist>
                    <p style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 5 }}>
                        Use a supported 3-letter currency code for analytics conversion.
                    </p>
                </div>

                {/* US-17: Notes / booking details */}
                {showBookingFields ? (
                    <>
                        <div className="mb-5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <span className="flex items-center gap-1.5">
                                    <FileText size={11} /> Booking Reference
                                </span>
                            </label>
                            <input
                                value={bookingReference}
                                onChange={(e) => setBookingReference(e.target.value)}
                                placeholder="Add booking reference"
                                className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none transition-all"
                                style={{
                                    background: 'var(--input-background)',
                                    border:     '1px solid var(--border)',
                                    color:      'var(--foreground)',
                                    fontSize:   13,
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        <div className="mb-5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <span className="flex items-center gap-1.5">
                                    <FileText size={11} /> {subCategory} Details
                                </span>
                            </label>
                            <textarea
                                value={travelDetails}
                                onChange={(e) => setTravelDetails(e.target.value)}
                                placeholder={subCategory === 'Flight' ? 'Add flight number, route, or timing' : 'Add timing, route, or provider'}
                                rows={3}
                                className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none transition-all resize-none"
                                style={{
                                    background: 'var(--input-background)',
                                    border:     '1px solid var(--border)',
                                    color:      'var(--foreground)',
                                    fontSize:   13,
                                    lineHeight: 1.5,
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </>
                ) : (
                    <div className="mb-5">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <span className="flex items-center gap-1.5">
                                <FileText size={11} /> Notes
                            </span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes, links, or reminders"
                            rows={3}
                            className="w-full rounded-xl px-3 py-2.5 mt-2 outline-none transition-all resize-none"
                            style={{
                                background: 'var(--input-background)',
                                border:     '1px solid var(--border)',
                                color:      'var(--foreground)',
                                fontSize:   13,
                                lineHeight: 1.5,
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        className="rounded-xl px-3 py-2.5 mb-4"
                        style={{
                            background: '#EF444415',
                            border:     '1px solid #EF4444',
                            color:      '#EF4444',
                            fontSize:   12,
                        }}
                    >
                        {error}
                    </div>
                )}
            </div>

            {/* Footer — save + delete */}
            <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                {isEdit && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors"
                        style={{
                            background: '#EF444415',
                            color:      '#EF4444',
                            fontSize:   13,
                            fontWeight: 600,
                        }}
                    >
                        <Trash2 size={13} />
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 rounded-xl py-2.5 transition-colors"
                    style={{
                        background: 'var(--accent)',
                        color:      'var(--accent-foreground)',
                        fontSize:   13,
                        fontWeight: 700,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        opacity:    saving ? 0.7 : 1,
                    }}
                >
                    {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Card'}
                </button>
            </div>
        </div>
    )
}
