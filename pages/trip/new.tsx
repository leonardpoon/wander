import { useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Loader, Plus } from 'lucide-react'
import { useSessionStore } from '../../controller/sessionStore'
import { tripService } from '../../controller/tripService'
import { COUNTRY_CURRENCIES, findCountryCurrency, getCurrencyForCountryCode } from '../../controller/countryCurrency'
import { saveTripInvite } from '../../controller/inviteStorage'

const today = new Date().toISOString().split('T')[0]

function parseDate(value: string): Date {
    return new Date(`${value}T00:00:00`)
}

function toDateInputValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function addDays(value: string, days: number): string {
    const date = parseDate(value)
    date.setDate(date.getDate() + days)
    return toDateInputValue(date)
}

function getTripDays(startDate: string, endDate: string): number {
    const diff = parseDate(endDate).getTime() - parseDate(startDate).getTime()
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

function formatDisplayDate(value: string): string {
    return parseDate(value).toLocaleDateString('en-SG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })
}

function formatMonth(value: Date): string {
    return value.toLocaleDateString('en-SG', {
        month: 'long',
        year: 'numeric',
    })
}

function getCalendarDays(monthDate: Date): Date[] {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const calendarStart = new Date(firstDay)
    calendarStart.setDate(firstDay.getDate() - firstDay.getDay())

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(calendarStart)
        date.setDate(calendarStart.getDate() + index)
        return date
    })
}

function shiftMonth(value: Date, offset: number): Date {
    return new Date(value.getFullYear(), value.getMonth() + offset, 1)
}

export default function NewTripPage() {
    const router = useRouter()
    const { user } = useSessionStore()

    const [name, setName] = useState('')
    const [destination, setDestination] = useState('')
    const [countryCode, setCountryCode] = useState('SG')
    const [currency, setCurrency] = useState('SGD')
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [pin, setPin] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const initial = parseDate(today)
        return new Date(initial.getFullYear(), initial.getMonth(), 1)
    })
    const [editingDate, setEditingDate] = useState<'start' | 'end'>('start')

    function applyCountryDefaults(value: string) {
        const match = findCountryCurrency(value)
        if (!match) return

        setCountryCode(match.code)
        setCurrency(match.currency)
    }

    function handleStartDateChange(value: string) {
        const currentTripDays = getTripDays(startDate, endDate)
        setStartDate(value)
        setEndDate(addDays(value, currentTripDays - 1))
    }

    function handleEndDateChange(value: string) {
        setEndDate(parseDate(value) < parseDate(startDate) ? startDate : value)
    }

    function setTripLength(days: number) {
        setEndDate(addDays(startDate, days - 1))
    }

    function selectCalendarDate(value: Date) {
        const selectedDate = toDateInputValue(value)

        if (editingDate === 'start') {
            setStartDate(selectedDate)
            if (parseDate(endDate) < value) setEndDate(selectedDate)
            setEditingDate('end')
            return
        }

        if (value < parseDate(startDate)) {
            setStartDate(selectedDate)
            setEndDate(selectedDate)
        } else {
            setEndDate(selectedDate)
        }
        setEditingDate('start')
    }

    const calendarDays = getCalendarDays(visibleMonth)
    const selectedStart = parseDate(startDate)
    const selectedEnd = parseDate(endDate)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!user) {
            router.replace('/')
            return
        }

        if (!name.trim() || !destination.trim()) {
            setError('Enter a trip name and destination')
            return
        }

        if (!/^\d{4}$/.test(pin)) {
            setError('PIN must be exactly 4 digits')
            return
        }

        if (new Date(endDate) < new Date(startDate)) {
            setError('End date must be after the start date')
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const { trip } = await tripService.createTrip({
                owner_id: user.id,
                name: name.trim(),
                primaryCurrency: currency.trim().toUpperCase() || 'SGD',
                pin,
                destinations: [
                    {
                        name: destination.trim(),
                        countryCode: countryCode.trim().toUpperCase() || 'SG',
                        localCurrency: currency.trim().toUpperCase() || 'SGD',
                        colourHex: '#14B8A6',
                        startDate,
                        endDate,
                    },
                ],
            })

            saveTripInvite(trip.id, trip.room_code, pin)
            router.push(`/trip/${trip.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create trip')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <div
                className="flex items-center justify-between px-8 py-4"
                style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
            >
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ color: 'var(--muted-foreground)', fontSize: 13 }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h1
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                        fontSize: 20,
                        color: 'var(--foreground)',
                    }}
                >
                    Wander
                </h1>
                <span style={{ width: 72 }} />
            </div>

            <main className="mx-auto px-6 py-10" style={{ maxWidth: 720 }}>
                <h2
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: 26,
                        color: 'var(--foreground)',
                        marginBottom: 6,
                    }}
                >
                    New trip
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 24 }}>
                    Set up the first destination and sharing PIN.
                </p>

                <form onSubmit={handleSubmit} className="grid gap-4">
                    <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                        Trip name
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Summer in Tokyo"
                            className="rounded-xl px-4 py-3 outline-none"
                            style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                        />
                    </label>

                    <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                        Destination
                        <input
                            value={destination}
                            onChange={(event) => {
                                setDestination(event.target.value)
                                applyCountryDefaults(event.target.value)
                            }}
                            onBlur={(event) => applyCountryDefaults(event.target.value)}
                            placeholder="Japan"
                            className="rounded-xl px-4 py-3 outline-none"
                            style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                            list="country-options"
                        />
                        <datalist id="country-options">
                            {COUNTRY_CURRENCIES.map((country) => (
                                <option key={country.code} value={country.name} />
                            ))}
                        </datalist>
                    </label>

                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                            Country code
                            <input
                                value={countryCode}
                                onChange={(event) => {
                                    const nextCode = event.target.value.slice(0, 2).toUpperCase()
                                    setCountryCode(nextCode)
                                    const nextCurrency = getCurrencyForCountryCode(nextCode)
                                    if (nextCurrency) setCurrency(nextCurrency)
                                }}
                                className="rounded-xl px-4 py-3 outline-none"
                                style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                            />
                        </label>
                        <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                            Currency
                            <input
                                value={currency}
                                onChange={(event) => setCurrency(event.target.value.slice(0, 3).toUpperCase())}
                                className="rounded-xl px-4 py-3 outline-none"
                                style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                            />
                        </label>
                    </div>

                    <section
                        className="grid gap-5 rounded-2xl p-5"
                        style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)',
                        }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span
                                    className="flex items-center justify-center rounded-xl"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        background: 'var(--accent)',
                                        color: 'var(--accent-foreground)',
                                    }}
                                >
                                    <Calendar size={20} />
                                </span>
                                <div>
                                    <p style={{ color: 'var(--foreground)', fontSize: 14, fontWeight: 800 }}>
                                        Trip dates
                                    </p>
                                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 3 }}>
                                        {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
                                    </p>
                                </div>
                            </div>

                            <span
                                className="rounded-full px-3 py-1.5"
                                style={{
                                    background: 'var(--muted)',
                                    color: 'var(--foreground)',
                                    fontSize: 12,
                                    fontWeight: 800,
                                }}
                            >
                                {getTripDays(startDate, endDate)} days
                            </span>
                        </div>

                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                            {[
                                { id: 'start' as const, label: 'Start', value: startDate },
                                { id: 'end' as const, label: 'End', value: endDate },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setEditingDate(item.id)}
                                    className="rounded-xl px-4 py-3 text-left transition-colors"
                                    style={{
                                        background: editingDate === item.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--input-background)',
                                        border: editingDate === item.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'block',
                                            color: editingDate === item.id ? 'var(--accent)' : 'var(--muted-foreground)',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            marginBottom: 5,
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                    <span style={{ fontSize: 15, fontWeight: 800 }}>
                                        {formatDisplayDate(item.value)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div
                            className="rounded-2xl p-4"
                            style={{
                                background: 'var(--input-background)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                                    className="flex items-center justify-center rounded-xl transition-colors"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        background: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                    }}
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <h3
                                    style={{
                                        color: 'var(--foreground)',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        fontSize: 18,
                                        fontWeight: 800,
                                    }}
                                >
                                    {formatMonth(visibleMonth)}
                                </h3>

                                <button
                                    type="button"
                                    onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
                                    className="flex items-center justify-center rounded-xl transition-colors"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        background: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--foreground)',
                                    }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div
                                        key={day}
                                        className="text-center"
                                        style={{
                                            color: 'var(--muted-foreground)',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {day}
                                    </div>
                                ))}

                                {calendarDays.map((date) => {
                                    const dateValue = toDateInputValue(date)
                                    const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
                                    const isStart = dateValue === startDate
                                    const isEnd = dateValue === endDate
                                    const isInRange = date >= selectedStart && date <= selectedEnd
                                    const isToday = dateValue === today

                                    return (
                                        <button
                                            key={dateValue}
                                            type="button"
                                            onClick={() => selectCalendarDate(date)}
                                            className="rounded-xl transition-colors"
                                            style={{
                                                aspectRatio: '1 / 1',
                                                minHeight: 44,
                                                background: isStart || isEnd
                                                    ? 'var(--accent)'
                                                    : isInRange
                                                        ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                                                        : 'transparent',
                                                border: isToday && !isStart && !isEnd ? '1px solid var(--accent)' : '1px solid transparent',
                                                color: isStart || isEnd
                                                    ? 'var(--accent-foreground)'
                                                    : isCurrentMonth
                                                        ? 'var(--foreground)'
                                                        : 'var(--muted-foreground)',
                                                fontSize: 14,
                                                fontWeight: isStart || isEnd || isToday ? 800 : 600,
                                                opacity: isCurrentMonth ? 1 : 0.45,
                                            }}
                                        >
                                            {date.getDate()}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[3, 5, 7, 10].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => setTripLength(days)}
                                    className="rounded-full px-3 py-1.5 transition-colors"
                                    style={{
                                        background: getTripDays(startDate, endDate) === days ? 'var(--accent)' : 'var(--muted)',
                                        color: getTripDays(startDate, endDate) === days ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                                        fontSize: 12,
                                        fontWeight: 800,
                                    }}
                                >
                                    {days} days
                                </button>
                            ))}
                        </div>
                    </section>

                    <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                        4-digit room PIN
                        <input
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="1234"
                            className="rounded-xl px-4 py-3 outline-none"
                            style={{
                                background: 'var(--input-background)',
                                border: '1px solid var(--border)',
                                letterSpacing: '0.16em',
                            }}
                        />
                    </label>

                    {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="mt-2 flex items-center justify-center gap-2 rounded-xl px-5 py-3"
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--accent-foreground)',
                            fontWeight: 700,
                            opacity: isSaving ? 0.65 : 1,
                        }}
                    >
                        {isSaving ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                        Create trip
                    </button>
                </form>
            </main>
        </div>
    )
}
