// pages/trip/[id].tsx
// US-11 to US-27: main trip page — board, map, analytics, packing, todo

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSessionStore } from '../../controller/sessionStore'
import { tripService } from '../../controller/tripService'
import { weatherService, DestinationWeather } from '../../controller/weatherService'
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
import { Loader } from 'lucide-react'

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

    const { cards } = useCards(typeof id === 'string' ? id : null)

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
                const [tripData, destData, colData] = await Promise.all([
                    tripService.getTripById(id as string),
                    tripService.getDestinations(id as string),
                    tripService.getColumns(id as string),
                ])

                setTrip(tripData)
                setDestinations(destData)
                setColumns(colData)

                // US-19: fetch weather for all geocoded destinations
                const geocodedDests = destData.filter(
                    (d: Destination) => d.lat !== null && d.lng !== null
                )

                if (geocodedDests.length > 0) {
                    const weatherResults = await weatherService.getWeatherForTrip(
                        geocodedDests.map((d: Destination) => ({
                            name: d.name,
                            lat:  d.lat!,
                            lng:  d.lng!,
                        }))
                    )
                    const weatherMap: Record<string, DestinationWeather['forecasts']> = {}
                    for (const result of weatherResults) {
                        weatherMap[result.destination] = result.forecasts
                    }
                    setWeather(weatherMap)
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
                destination={trip.primary_destination ?? trip.name}
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
            >
                {/* Board view */}
                {activeView === 'board' && (
                    <KanbanBoard
                        tripId={trip.id}
                        columns={columnData}
                        categoryFilters={{ travel: true, sightsee: true, shopping: true, eating: true }}
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
                        homeCurrency={trip.home_currency ?? 'USD'}
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
                    tripPin="****"
                    onClose={() => setShowShare(false)}
                />
            )}

            {showExport && (
                <ExportModal
                    tripName={trip.name}
                    cards={cards}
                    onClose={() => setShowExport(false)}
                />
            )}
        </>
    )
}
