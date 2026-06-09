import { useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Loader, Plus } from 'lucide-react'
import { useSessionStore } from '../../controller/sessionStore'
import { tripService } from '../../controller/tripService'

const today = new Date().toISOString().split('T')[0]

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

            <main className="mx-auto px-6 py-10" style={{ maxWidth: 560 }}>
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
                            onChange={(event) => setDestination(event.target.value)}
                            placeholder="Tokyo"
                            className="rounded-xl px-4 py-3 outline-none"
                            style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                        />
                    </label>

                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                            Country code
                            <input
                                value={countryCode}
                                onChange={(event) => setCountryCode(event.target.value.slice(0, 2).toUpperCase())}
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

                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                            Start date
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="rounded-xl px-4 py-3 outline-none"
                                style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                            />
                        </label>
                        <label className="grid gap-2" style={{ color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }}>
                            End date
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="rounded-xl px-4 py-3 outline-none"
                                style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}
                            />
                        </label>
                    </div>

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
