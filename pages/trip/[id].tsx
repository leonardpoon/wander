// pages/trip/[id].tsx
// US-11 to US-27: main trip page — board, map, analytics, packing, todo

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSessionStore } from '../../controller/sessionStore'
import { tripService } from '../../controller/tripService'
import { DestinationWeather } from '../../controller/weatherService'
import { SafeTrip } from '../../entity/Trip'
import { Destination } from '../../entity/Destination'
import { Column } from '../../entity/Column'
import { AppShell, ViewType, TabType } from '../../boundary/AppShell'
import { KanbanBoard } from '../../boundary/KanbanBoard'
import { MapView } from '../../boundary/MapView'
import { AnalyticsDashboard } from '../../boundary/AnalyticsDashboard'
import { PackingList } from '../../boundary/PackingList'
import { TodoBoard } from '../../boundary/TodoBoard'
import { ShareModal } from '../../boundary/ShareModal'
import { ExportModal } from '../../boundary/ExportModal'
import { useCards } from '../../controller/useCards'
import { getTripInvite } from '../../controller/inviteStorage'
import { Loader } from 'lucide-react'
import { cardCategoryRepository } from '../../entity/cardCategoryRepository'
import {
    BUILT_IN_CATEGORY_OPTIONS,
    CardCategoryOption,
    getNextCategoryColor,
    getUniqueCategoryId,
    normalizeCategoryLabel,
} from '../../entity/CardCategories'

export default function TripPage() {
    const router        = useRouter()
    const { id }        = router.query
    const { user }      = useSessionStore()

    const [trip,         setTrip]         = useState<SafeTrip | null>(null)
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [columns,      setColumns]      = useState<Column[]>([])
    const [weather,      setWeather]      = useState<Record<string, DestinationWeather['forecasts']>>({})
    const [loading,      setLoading]      = useState(true)
    const [activeView,   setActiveView]   = useState<ViewType>('board')
    const [activeTab,    setActiveTab]    = useState<TabType>('planner')
    const [showShare,    setShowShare]    = useState(false)
    const [showExport,   setShowExport]   = useState(false)
    const [darkMode,     setDarkMode]     = useState(false)
    const [savedTripPin, setSavedTripPin] = useState<string | null>(null)
    const [customCategories, setCustomCategories] = useState<CardCategoryOption[]>([])
    const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>(
        () => Object.fromEntries(BUILT_IN_CATEGORY_OPTIONS.map((cat) => [cat.id, true]))
    )

    const { cards } = useCards(typeof id === 'string' ? id : null)

    const categoryOptions = useMemo(() => {
        const options = [...BUILT_IN_CATEGORY_OPTIONS, ...customCategories]
        const knownIds = new Set(options.map((option) => option.id))
        const colors = options.map((option) => option.color)

        for (const card of cards) {
            if (knownIds.has(card.category)) continue

            knownIds.add(card.category)
            const color = getNextCategoryColor(colors)
            colors.push(color)
            options.push({
                id: card.category,
                label: card.category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
                color,
            })
        }

        return options
    }, [cards, customCategories])

    useEffect(() => {
        if (!id || typeof id !== 'string') return

        const invite = getTripInvite(id)
        setSavedTripPin(invite?.pin ?? null)
    }, [id])

    useEffect(() => {
        setCategoryFilters((prev) => {
            const next = { ...prev }
            for (const option of categoryOptions) {
                if (!(option.id in next)) next[option.id] = true
            }
            return next
        })
    }, [categoryOptions])

    function toggleCategoryFilter(categoryId: string) {
        setCategoryFilters((prev) => ({
            ...prev,
            [categoryId]: prev[categoryId] === false,
        }))
    }

    async function addCustomCategory(label: string) {
        if (!id || typeof id !== 'string') return

        const normalized = normalizeCategoryLabel(label)
        if (!normalized) return

        const allOptions = [...BUILT_IN_CATEGORY_OPTIONS, ...customCategories]
        const existing = allOptions.find(
            (option) => option.label.toLowerCase() === normalized.toLowerCase()
        )

        if (existing) {
            setCategoryFilters((filters) => ({ ...filters, [existing.id]: true }))
            return
        }

        const category = {
            id: getUniqueCategoryId(normalized, allOptions.map((option) => option.id)),
            label: normalized,
            color: getNextCategoryColor(allOptions.map((option) => option.color)),
        }

        const savedCategory = await cardCategoryRepository.createCategory(
            id,
            category,
            customCategories.length
        )

        setCustomCategories((prev) => {
            if (prev.some((option) => option.id === savedCategory.id)) return prev
            return [...prev, savedCategory]
        })
        setCategoryFilters((filters) => ({ ...filters, [savedCategory.id]: true }))
    }

    // redirect if not logged in
    useEffect(() => {
        if (!user && !loading) router.replace('/')
    }, [user, loading])

    // load trip data
    useEffect(() => {
        if (!id || typeof id !== 'string') return

        async function loadTrip() {
            setLoading(true)
            try {
                const [tripData, destData, colData, categoryData] = await Promise.all([
                    tripService.getTripById(id as string),
                    tripService.getDestinations(id as string),
                    tripService.getColumns(id as string),
                    cardCategoryRepository.findByTrip(id as string),
                ])

                setTrip(tripData)
                setDestinations(destData)
                setColumns(colData)
                setCustomCategories(categoryData)

                try {
                    if (destData.length > 0) {
                        const response = await fetch('/api/weather/trip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                destinations: destData.map((dest: Destination) => ({
                                    name: dest.name,
                                    countryCode: dest.country_code,
                                    lat: dest.lat,
                                    lng: dest.lng,
                                })),
                            }),
                        })

                        if (!response.ok) throw new Error('Failed to load weather')

                        const { weather: weatherResults } = await response.json()
                        const weatherMap: Record<string, DestinationWeather['forecasts']> = {}
                        for (const result of weatherResults as DestinationWeather[]) {
                            weatherMap[result.destination] = result.forecasts
                        }
                        setWeather(weatherMap)
                    }
                } catch (weatherError) {
                    console.warn('Weather unavailable:', weatherError)
                    setWeather({})
                }
            } catch {
                router.replace('/')
            } finally {
                setLoading(false)
            }
        }

        loadTrip()
    }, [id])

    // handle tab change — todo tab forces todo view
    function handleTabChange(tab: TabType) {
        setActiveTab(tab)
        if (tab === 'todo') setActiveView('todo')
        else setActiveView('board')
    }

    // handle view change — board/map/analytics/packing stay in planner tab
    function handleViewChange(view: ViewType) {
        setActiveView(view)
        if (view === 'todo') setActiveTab('todo')
        else setActiveTab('planner')
    }

    // compute date range string
    function getDateRange(): string {
        if (!trip?.start_date || !trip?.end_date) return ''
        const start = new Date(trip.start_date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short'
        })
        const end = new Date(trip.end_date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        return `${start} – ${end}`
    }

    // compute day count
    function getDayCount(): number {
        if (!trip?.start_date || !trip?.end_date) return 0
        const diff = new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
    }

    // map Column to the shape KanbanBoard expects
    const columnData = columns.map((col) => {
        const dest = destinations.find((d) => d.id === col.destintation_id)
        return {
            id:          col.id,
            date:        col.date,
            label:       col.label ?? '',
            destination: dest?.name ?? '',
        }
    })

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--background)' }}
            >
                <Loader
                    size={24}
                    className="animate-spin"
                    style={{ color: 'var(--accent)' }}
                />
            </div>
        )
    }

    if (!trip) return null

    return (
        <>
            <AppShell
                tripName={trip.name}
                destination={destinations[0]?.name ?? trip.primary_destination ?? trip.name}
                heroImage={trip.hero_image_url ?? null}
                accentColor={trip.accent_color ?? 'var(--accent)'}
                dateRange={getDateRange()}
                dayCount={getDayCount()}
                activeView={activeView}
                activeTab={activeTab}
                onViewChange={handleViewChange}
                onTabChange={handleTabChange}
                onShare={() => setShowShare(true)}
                onExport={() => setShowExport(true)}
                categoryOptions={categoryOptions}
                categoryFilters={categoryFilters}
                onToggleCategory={toggleCategoryFilter}
                onAddCategory={addCustomCategory}
                tripCode={trip.room_code ?? null}
                tripPin={savedTripPin}
            >
                {/* Board view */}
                {activeView === 'board' && (
                    <KanbanBoard
                        tripId={trip.id}
                        columns={columnData}
                        categoryFilters={categoryFilters}
                        categoryOptions={categoryOptions}
                        weatherByDest={weather}
                        accentColor={trip.accent_color ?? 'var(--accent)'}
                    />
                )}

                {/* Map view */}
                {activeView === 'map' && (
                    <MapView
                        tripId={trip.id}
                        darkMode={darkMode}
                    />
                )}

                {/* Analytics view */}
                {activeView === 'analytics' && (
                    <AnalyticsDashboard
                        tripId={trip.id}
                        tripCurrency={trip.primary_currency ?? 'USD'}
                        homeCurrency={user?.home_currency ?? 'USD'}
                        dayCount={getDayCount()}
                    />
                )}

                {/* Packing list */}
                {activeView === 'packing' && (
                    <PackingList tripId={trip.id} />
                )}

                {/* Todo board */}
                {activeView === 'todo' && (
                    <TodoBoard tripId={trip.id} />
                )}
            </AppShell>

            {/* Modals */}
            {showShare && trip.room_code && (
                <ShareModal
                    tripCode={trip.room_code}
                    tripPin={savedTripPin ?? '****'}
                    onClose={() => setShowShare(false)}
                />
            )}

            {showExport && (
                <ExportModal
                    tripName={trip.name}
                    cards={cards}
                    columns={columns}
                    onClose={() => setShowExport(false)}
                />
            )}
        </>
    )
}
