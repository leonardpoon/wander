// pages/index.tsx
// US-01, US-02, US-03, US-09: entry point
// Two paths: host a trip (username only) or join a room (code + PIN)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSessionStore } from '../controller/sessionStore'
import { useAuth } from '../controller/useAuth'
import { tripService } from '../controller/tripService'
import { saveTripInvite } from '../controller/inviteStorage'
import { SafeTrip } from '../entity/Trip'
import { MapPin, Users, ArrowRight, Check, Loader, KeyRound } from 'lucide-react'

const FALLBACK_TRIP_IMAGE =
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80'

type Screen =
    | 'landing'         // initial — two big buttons
    | 'host'            // enter username to create account
    | 'host-confirm'    // account created
    | 'login'           // returning user sign in
    | 'join'            // enter room code + PIN
    | 'trips'           // logged in — trip list

export default function Home() {
    const router = useRouter()
    const { user } = useSessionStore()
    const { register, login, restoreSession } = useAuth()

    const [screen,      setScreen]      = useState<Screen>('landing')
    const [restoring,   setRestoring]   = useState(true)

    // host flow
    const [username,    setUsername]    = useState('')
    const [password,    setPassword]    = useState('')
    const [hostLoading, setHostLoading] = useState(false)
    const [hostError,   setHostError]   = useState<string | null>(null)

    // login flow
    const [loginUsername, setLoginUsername] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [loginError, setLoginError] = useState<string | null>(null)

    // join flow
    const [roomCode,    setRoomCode]    = useState('')
    const [pin,         setPin]         = useState('')
    const [joinLoading, setJoinLoading] = useState(false)
    const [joinError,   setJoinError]   = useState<string | null>(null)

    // trips list
    const [trips,       setTrips]       = useState<SafeTrip[]>([])
    const [loadingTrips,setLoadingTrips]= useState(false)

    // restore session on mount
    useEffect(() => {
        async function restore() {
            await restoreSession()
            setRestoring(false)
        }
        restore()
    }, [])

    // if user is already logged in, go to trips screen
    useEffect(() => {
        if (!restoring && user) {
            setScreen('trips')
            loadTrips()
        }
    }, [restoring, user])

    async function loadTrips() {
        if (!user) return
        setLoadingTrips(true)
        try {
            const data = await tripService.getTripsByUser(user.id)
            setTrips(data)
        } catch {
            // silent — empty state handles it
        } finally {
            setLoadingTrips(false)
        }
    }

    // ─── Host flow ────────────────────────────────────────────────────────────

    async function handleHost() {
        if (!username.trim()) {
            setHostError('Please enter a name')
            return
        }

        if (password.length < 6) {
            setHostError('Password must be at least 6 characters')
            return
        }

        setHostLoading(true)
        setHostError(null)

        try {
            // we call register directly — authService handles uniqueness check
            await register(username.trim(), password)
            setScreen('host-confirm')
        } catch (err) {
            setHostError(err instanceof Error ? err.message : 'Failed to create account')
        } finally {
            setHostLoading(false)
        }
    }

    // ─── Join flow ────────────────────────────────────────────────────────────

    async function handleJoin() {
        if (!roomCode.trim() || !pin.trim()) {
            setJoinError('Enter both the room code and PIN')
            return
        }

        setJoinLoading(true)
        setJoinError(null)

        try {
            // US-09: verify room code + PIN
            const trip = await tripService.verifyPin(
                roomCode.trim().toUpperCase(),
                pin.trim()
            )
            if (trip) {
                saveTripInvite(trip.id, trip.room_code, pin.trim())
                router.push(`/trip/${trip.id}`)
            }
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : 'Invalid room code or PIN')
        } finally {
            setJoinLoading(false)
        }
    }

    // ─── Screens ──────────────────────────────────────────────────────────────

    async function handleLogin() {
        if (!loginUsername.trim() || !loginPassword.trim()) {
            setLoginError('Enter your name and password')
            return
        }

        setLoginLoading(true)
        setLoginError(null)

        try {
            await login(loginUsername.trim(), loginPassword.trim())
            setScreen('trips')
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setLoginLoading(false)
        }
    }

    if (restoring) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <Loader size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        )
    }

    // Landing — two big buttons
    if (screen === 'landing') {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <div className="text-center mb-12">
                    <h1
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    800,
                            fontSize:      48,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.04em',
                            marginBottom:  8,
                        }}
                    >
                        Wander
                    </h1>
                    <p style={{ fontSize: 16, color: 'var(--muted-foreground)' }}>
                        Plan trips together
                    </p>
                </div>

                <div className="flex gap-4">
                    {/* Host a trip */}
                    <button
                        onClick={() => setScreen('host')}
                        className="flex flex-col items-center gap-3 rounded-2xl p-8 transition-all"
                        style={{
                            width:      220,
                            background: 'var(--card)',
                            border:     '2px solid var(--border)',
                            boxShadow:  '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.boxShadow  = '0 8px 24px rgba(0,0,0,0.12)'
                            e.currentTarget.style.transform  = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.boxShadow  = '0 2px 8px rgba(0,0,0,0.06)'
                            e.currentTarget.style.transform  = 'translateY(0)'
                        }}
                    >
                        <div
                            className="flex items-center justify-center rounded-2xl"
                            style={{
                                width:      56,
                                height:     56,
                                background: 'var(--accent)',
                            }}
                        >
                            <MapPin size={24} color="white" />
                        </div>
                        <div className="text-center">
                            <p
                                style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 700,
                                    fontSize:   16,
                                    color:      'var(--foreground)',
                                    marginBottom: 4,
                                }}
                            >
                                Host a trip
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                                Create a new trip and invite friends
                            </p>
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--accent)' }} />
                    </button>

                    {/* Join a room */}
                    <button
                        onClick={() => setScreen('join')}
                        className="flex flex-col items-center gap-3 rounded-2xl p-8 transition-all"
                        style={{
                            width:      220,
                            background: 'var(--card)',
                            border:     '2px solid var(--border)',
                            boxShadow:  '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.boxShadow  = '0 8px 24px rgba(0,0,0,0.12)'
                            e.currentTarget.style.transform  = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.boxShadow  = '0 2px 8px rgba(0,0,0,0.06)'
                            e.currentTarget.style.transform  = 'translateY(0)'
                        }}
                    >
                        <div
                            className="flex items-center justify-center rounded-2xl"
                            style={{
                                width:      56,
                                height:     56,
                                background: '#8B5CF6',
                            }}
                        >
                            <Users size={24} color="white" />
                        </div>
                        <div className="text-center">
                            <p
                                style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 700,
                                    fontSize:   16,
                                    color:      'var(--foreground)',
                                    marginBottom: 4,
                                }}
                            >
                                Join a room
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                                Enter a room code to join a trip
                            </p>
                        </div>
                        <ArrowRight size={16} style={{ color: '#8B5CF6' }} />
                    </button>
                </div>

                <button
                    onClick={() => setScreen('login')}
                    className="mt-6 flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        fontWeight: 700,
                    }}
                >
                    <KeyRound size={15} />
                    Sign in
                </button>
            </div>
        )
    }

    // Host — enter username
    if (screen === 'host') {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <div
                    className="rounded-2xl p-8"
                    style={{
                        width:      400,
                        background: 'var(--card)',
                        border:     '1px solid var(--border)',
                        boxShadow:  '0 20px 60px rgba(0,0,0,0.1)',
                    }}
                >
                    <button
                        onClick={() => {
                            setScreen('landing')
                            setHostError(null)
                            setUsername('')
                            setPassword('')
                        }}
                        style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}
                    >
                        ← Back
                    </button>

                    <h2
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    700,
                            fontSize:      22,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.02em',
                            marginBottom:  6,
                        }}
                    >
                        Choose a name and password
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
                        This is how your travel companions will see you. Choose a simple visible password to sign in later.
                    </p>

                    <input
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. john"
                        className="w-full rounded-xl px-4 py-3 outline-none transition-all mb-3"
                        style={{
                            background: 'var(--input-background)',
                            border:     '1px solid var(--border)',
                            color:      'var(--foreground)',
                            fontSize:   14,
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleHost() }}
                    />

                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full rounded-xl px-4 py-3 outline-none transition-all mb-3"
                        style={{
                            background: 'var(--input-background)',
                            border:     '1px solid var(--border)',
                            color:      'var(--foreground)',
                            fontSize:   14,
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleHost() }}
                    />

                    {hostError && (
                        <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>
                            {hostError}
                        </p>
                    )}

                    <button
                        onClick={handleHost}
                        disabled={hostLoading || !username.trim() || !password}
                        className="w-full rounded-xl py-3 transition-all"
                        style={{
                            background: 'var(--accent)',
                            color:      'var(--accent-foreground)',
                            fontSize:   14,
                            fontWeight: 700,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            opacity:    hostLoading || !username.trim() || !password ? 0.6 : 1,
                        }}
                    >
                        {hostLoading ? 'Creating account…' : 'Continue'}
                    </button>
                </div>
            </div>
        )
    }

    // Login — returning user
    if (screen === 'login') {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <div
                    className="rounded-2xl p-8"
                    style={{
                        width: 400,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    }}
                >
                    <button
                        onClick={() => { setScreen('landing'); setLoginError(null); setLoginUsername(''); setLoginPassword('') }}
                        style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}
                    >
                        Back
                    </button>

                    <h2
                        style={{
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 700,
                            fontSize: 22,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.02em',
                            marginBottom: 6,
                        }}
                    >
                        Sign in
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
                        Use the name and password you created for your account.
                    </p>

                    <div className="flex flex-col" style={{ gap: 12 }}>
                        <input
                            autoFocus
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder="Name"
                            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                            style={{
                                background: 'var(--input-background)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                fontSize: 14,
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        />

                        <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                            style={{
                                background: 'var(--input-background)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
                        />

                        {loginError && (
                            <p style={{ fontSize: 12, color: '#EF4444' }}>{loginError}</p>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={loginLoading || !loginUsername.trim() || !loginPassword.trim()}
                            className="w-full rounded-xl py-3 transition-all"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--accent-foreground)',
                                fontSize: 14,
                                fontWeight: 700,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                opacity: loginLoading || !loginUsername.trim() || !loginPassword.trim() ? 0.6 : 1,
                            }}
                        >
                            {loginLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Host confirm
    if (screen === 'host-confirm') {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <div
                    className="rounded-2xl p-8"
                    style={{
                        width:      420,
                        background: 'var(--card)',
                        border:     '1px solid var(--border)',
                        boxShadow:  '0 20px 60px rgba(0,0,0,0.1)',
                    }}
                >
                    <div
                        className="flex items-center justify-center rounded-full mb-6 mx-auto"
                        style={{
                            width:      48,
                            height:     48,
                            background: '#22C55E18',
                            color:      '#22C55E',
                        }}
                    >
                        <Check size={22} />
                    </div>

                    <h2
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    700,
                            fontSize:      22,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.02em',
                            marginBottom:  6,
                            textAlign:     'center',
                        }}
                    >
                        Account created!
                    </h2>
                    <p
                        style={{
                            fontSize:   13,
                            color:      'var(--muted-foreground)',
                            marginBottom: 24,
                            textAlign:  'center',
                            lineHeight: 1.5,
                        }}
                    >
                        Your account is ready. Use your name and password to sign in on other devices.
                    </p>

                    <button
                        onClick={() => router.push('/trip/new')}
                        className="w-full rounded-xl py-3 transition-all"
                        style={{
                            background: 'var(--accent)',
                            color:      'var(--accent-foreground)',
                            fontSize:   14,
                            fontWeight: 700,
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                    >
                        Create my first trip
                    </button>
                </div>
            </div>
        )
    }
    // Join — enter room code + PIN
    if (screen === 'join') {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <div
                    className="rounded-2xl p-8"
                    style={{
                        width:      400,
                        background: 'var(--card)',
                        border:     '1px solid var(--border)',
                        boxShadow:  '0 20px 60px rgba(0,0,0,0.1)',
                    }}
                >
                    <button
                        onClick={() => { setScreen('landing'); setJoinError(null); setRoomCode(''); setPin('') }}
                        style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 20 }}
                    >
                        ← Back
                    </button>

                    <h2
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    700,
                            fontSize:      22,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.02em',
                            marginBottom:  6,
                        }}
                    >
                        Join a trip
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
                        Enter the room code and PIN shared by your trip host.
                    </p>

                    <div className="flex flex-col" style={{ gap: 12 }}>
                        <input
                            autoFocus
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="WND-XXXXXX"
                            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                            style={{
                                background:  'var(--input-background)',
                                border:      '1px solid var(--border)',
                                color:       'var(--foreground)',
                                fontSize:    14,
                                fontFamily:  "'JetBrains Mono', monospace",
                                letterSpacing: '0.06em',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        />

                        <input
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="4-digit PIN"
                            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                            style={{
                                background:  'var(--input-background)',
                                border:      '1px solid var(--border)',
                                color:       'var(--foreground)',
                                fontSize:    14,
                                fontFamily:  "'JetBrains Mono', monospace",
                                letterSpacing: '0.2em',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--ring)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
                        />

                        {joinError && (
                            <p style={{ fontSize: 12, color: '#EF4444' }}>{joinError}</p>
                        )}

                        <button
                            onClick={handleJoin}
                            disabled={joinLoading || !roomCode.trim() || pin.length !== 4}
                            className="w-full rounded-xl py-3 transition-all"
                            style={{
                                background: '#8B5CF6',
                                color:      'white',
                                fontSize:   14,
                                fontWeight: 700,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                opacity:    joinLoading || !roomCode.trim() || pin.length !== 4 ? 0.6 : 1,
                            }}
                        >
                            {joinLoading ? 'Joining…' : 'Join trip →'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Trips list — logged in
    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--background)' }}
        >
            <div
                className="flex items-center justify-between px-8 py-4"
                style={{
                    background:   'var(--card)',
                    borderBottom: '1px solid var(--border)',
                }}
            >
                <h1
                    style={{
                        fontFamily:    "'Inter', system-ui, sans-serif",
                        fontWeight:    800,
                        fontSize:      20,
                        color:         'var(--foreground)',
                        letterSpacing: '-0.03em',
                    }}
                >
                    Wander
                </h1>
                <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                    {user?.display_name ?? user?.username}
                </span>
            </div>

            <div className="max-w-4xl mx-auto px-8 py-10">
                <div className="flex items-center justify-between mb-8">
                    <h2
                        style={{
                            fontFamily:    "'Inter', system-ui, sans-serif",
                            fontWeight:    700,
                            fontSize:      24,
                            color:         'var(--foreground)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Your Trips
                    </h2>
                    <button
                        onClick={() => router.push('/trip/new')}
                        className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                        style={{
                            background: 'var(--accent)',
                            color:      'var(--accent-foreground)',
                            fontSize:   13,
                            fontWeight: 600,
                        }}
                    >
                        + New Trip
                    </button>
                </div>

                {loadingTrips ? (
                    <div className="flex justify-center py-16">
                        <Loader size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    </div>
                ) : trips.length === 0 ? (
                    <div
                        className="rounded-2xl p-12 text-center"
                        style={{
                            background: 'var(--card)',
                            border:     '2px dashed var(--border)',
                        }}
                    >
                        <MapPin size={32} style={{ color: 'var(--muted-foreground)', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                            No trips yet
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
                            Create your first trip to start planning
                        </p>
                        <button
                            onClick={() => router.push('/trip/new')}
                            className="rounded-xl px-5 py-2.5"
                            style={{
                                background: 'var(--accent)',
                                color:      'var(--accent-foreground)',
                                fontSize:   13,
                                fontWeight: 600,
                            }}
                        >
                            Create a trip
                        </button>
                    </div>
                ) : (
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
                    >
                        {trips.map((trip) => (
                            <button
                                key={trip.id}
                                onClick={() => router.push(`/trip/${trip.id}`)}
                                className="rounded-2xl overflow-hidden text-left transition-all"
                                style={{
                                    background: 'var(--card)',
                                    border:     '1px solid var(--border)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                            >
                                <div style={{ height: 120, background: 'var(--muted)', position: 'relative' }}>
                                    <img
                                        src={trip.photo_url ?? FALLBACK_TRIP_IMAGE}
                                        alt={trip.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div
                                        style={{
                                            position:   'absolute',
                                            bottom:     0,
                                            left:       0,
                                            right:      0,
                                            height:     3,
                                            background: trip.theme_colour ?? 'var(--accent)',
                                        }}
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--foreground)', marginBottom: 4 }}>
                                        {trip.name}
                                    </h3>
                                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                        {trip.start_date} – {trip.end_date}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
