// boundary/MapView.tsx
// Map view with cleaner basemap layers, day filtering, grouped pins, and route overlay.

import { useMemo, useState, useEffect } from 'react'
import MapLibreMap, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import * as maplibregl from 'maplibre-gl'
import { Layers, Navigation, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCards } from '../controller/useCards'
import { mapService, RouteResult } from '../controller/mapService'
import { Card } from '../entity/Cards'
import { Column } from '../entity/Column'

maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js')

type MapLayerId = 'clean' | 'minimal' | 'street' | 'dark'
type PinMode = 'cards' | 'groups'

interface DisplayPin {
    id: string
    title: string
    category: string
    lat: number
    lng: number
    locationName: string | null
    color: string
    count: number
    cards: Card[]
}

const CLEAN_STYLE = {
    version: 8 as const,
    sources: {
        cartoLight: {
            type: 'raster' as const,
            tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap contributors, CARTO',
        },
    },
    layers: [{
        id: 'carto-light-tiles',
        type: 'raster' as const,
        source: 'cartoLight',
    }],
}

const MINIMAL_STYLE = {
    version: 8 as const,
    sources: {
        cartoMinimal: {
            type: 'raster' as const,
            tiles: ['https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap contributors, CARTO',
        },
    },
    layers: [{
        id: 'carto-minimal-tiles',
        type: 'raster' as const,
        source: 'cartoMinimal',
    }],
}

const STREET_STYLE = {
    version: 8 as const,
    sources: {
        osm: {
            type: 'raster' as const,
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap contributors',
        },
    },
    layers: [{
        id: 'osm-tiles',
        type: 'raster' as const,
        source: 'osm',
    }],
}

const DARK_STYLE = {
    version: 8 as const,
    sources: {
        cartoDark: {
            type: 'raster' as const,
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap contributors, CARTO',
        },
    },
    layers: [{
        id: 'carto-dark-tiles',
        type: 'raster' as const,
        source: 'cartoDark',
    }],
}

interface MapViewProps {
    tripId: string
    columns: Column[]
    darkMode: boolean
}

export function MapView({ tripId, columns, darkMode }: MapViewProps) {
    const { cards, cardGroups } = useCards(tripId)

    const [mapLayer, setMapLayer] = useState<MapLayerId>(darkMode ? 'dark' : 'clean')
    const [pinMode, setPinMode] = useState<PinMode>('groups')
    const [selectedDay, setSelectedDay] = useState<string>('all')
    const [route, setRoute] = useState<RouteResult | null>(null)
    const [showRoute, setShowRoute] = useState(false)
    const [selectedPin, setSelectedPin] = useState<DisplayPin | null>(null)
    const [loadingRoute, setLoadingRoute] = useState(false)

    const sortedColumns = useMemo(
        () => columns.slice().sort((a, b) => a.position - b.position),
        [columns]
    )

    const selectedCards = useMemo(
        () => selectedDay === 'all'
            ? cards
            : cards.filter((card) => card.column_id === selectedDay),
        [cards, selectedDay]
    )

    const routeCards = useMemo(() => {
        if (pinMode === 'cards') return selectedCards

        const cardsByGroup = new Map<string, Card[]>()
        const looseCards: Card[] = []

        for (const card of selectedCards) {
            if (!card.group_id) {
                looseCards.push(card)
                continue
            }

            const groupCards = cardsByGroup.get(card.group_id) ?? []
            groupCards.push(card)
            cardsByGroup.set(card.group_id, groupCards)
        }

        return [
            ...looseCards,
            ...Array.from(cardsByGroup.values()).map((groupCards) =>
                groupCards.slice().sort((a, b) => a.position - b.position)[0]
            ),
        ]
    }, [selectedCards, pinMode])

    const pins = useMemo<DisplayPin[]>(() => {
        const mapPins = mapService.getMapPins(selectedCards)

        if (pinMode === 'cards') {
            return mapPins.map((pin) => {
                const card = selectedCards.find((candidate) => candidate.id === pin.cardId)
                return {
                    id: pin.cardId,
                    title: pin.title,
                    category: pin.category,
                    lat: pin.lat,
                    lng: pin.lng,
                    locationName: pin.locationName,
                    color: mapService.getCategoryColour(pin.category),
                    count: 1,
                    cards: card ? [card] : [],
                }
            })
        }

        const groupsById = new Map(cardGroups.map((group) => [group.id, group]))
        const pinsByGroup = new Map<string, DisplayPin>()
        const loosePins: DisplayPin[] = []

        for (const pin of mapPins) {
            const card = selectedCards.find((candidate) => candidate.id === pin.cardId)
            if (!card?.group_id) {
                loosePins.push({
                    id: pin.cardId,
                    title: pin.title,
                    category: pin.category,
                    lat: pin.lat,
                    lng: pin.lng,
                    locationName: pin.locationName,
                    color: mapService.getCategoryColour(pin.category),
                    count: 1,
                    cards: card ? [card] : [],
                })
                continue
            }

            const group = groupsById.get(card.group_id)
            const existing = pinsByGroup.get(card.group_id)
            if (existing) {
                const nextCards = [...existing.cards, card]
                const geocodedCards = nextCards.filter((groupCard) =>
                    groupCard.lat !== null && groupCard.lng !== null
                )
                pinsByGroup.set(card.group_id, {
                    ...existing,
                    lat: geocodedCards.reduce((sum, groupCard) => sum + groupCard.lat!, 0) / geocodedCards.length,
                    lng: geocodedCards.reduce((sum, groupCard) => sum + groupCard.lng!, 0) / geocodedCards.length,
                    count: nextCards.length,
                    cards: nextCards,
                })
            } else {
                pinsByGroup.set(card.group_id, {
                    id: card.group_id,
                    title: group?.title ?? 'Activity group',
                    category: 'group',
                    lat: pin.lat,
                    lng: pin.lng,
                    locationName: pin.locationName,
                    color: group?.color ?? '#7C3AED',
                    count: 1,
                    cards: [card],
                })
            }
        }

        return [...loosePins, ...Array.from(pinsByGroup.values())]
    }, [selectedCards, cardGroups, pinMode])

    useEffect(() => {
        setSelectedPin(null)
    }, [selectedDay, pinMode])

    useEffect(() => {
        if (!showRoute || pins.length < 2) {
            setRoute(null)
            return
        }

        async function fetchRoute() {
            setLoadingRoute(true)
            const result = await mapService.getRouteForCards(routeCards)
            setRoute(result)
            setLoadingRoute(false)
        }

        fetchRoute()
    }, [showRoute, pins, routeCards])

    const bounds = pins.length > 0
        ? {
            minLat: Math.min(...pins.map((pin) => pin.lat)),
            maxLat: Math.max(...pins.map((pin) => pin.lat)),
            minLng: Math.min(...pins.map((pin) => pin.lng)),
            maxLng: Math.max(...pins.map((pin) => pin.lng)),
        }
        : null
    const initLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 1.3521
    const initLng = bounds ? (bounds.minLng + bounds.maxLng) / 2 : 103.8198
    const initZoom = pins.length > 0 ? 11 : 3
    const mapStyle = mapLayer === 'dark'
        ? DARK_STYLE
        : mapLayer === 'minimal'
            ? MINIMAL_STYLE
            : mapLayer === 'street'
                ? STREET_STYLE
                : CLEAN_STYLE

    const routeGeoJSON = route ? {
        type: 'FeatureCollection' as const,
        features: [{
            type: 'Feature' as const,
            properties: {},
            geometry: {
                type: 'LineString' as const,
                coordinates: route.coordinates.map((c) => [c.lng, c.lat]),
            },
        }],
    } : null

    return (
        <div className="relative w-full h-full">
            <MapLibreMap
                mapLib={maplibregl}
                initialViewState={{
                    latitude: initLat,
                    longitude: initLng,
                    zoom: initZoom,
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
            >
                <NavigationControl position="top-right" />

                {pins.map((pin) => (
                    <Marker
                        key={pin.id}
                        latitude={pin.lat}
                        longitude={pin.lng}
                        onClick={(e) => {
                            e.originalEvent.stopPropagation()
                            setSelectedPin(selectedPin?.id === pin.id ? null : pin)
                        }}
                    >
                        <div
                            className="rounded-full flex items-center justify-center cursor-pointer transition-transform"
                            style={{
                                width: pin.count > 1 ? 34 : 28,
                                height: pin.count > 1 ? 34 : 28,
                                background: pin.color,
                                border: '2px solid white',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                transform: selectedPin?.id === pin.id ? 'scale(1.3)' : 'scale(1)',
                            }}
                        >
                            <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>
                                {pin.count > 1 ? pin.count : pin.category.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </Marker>
                ))}

                {routeGeoJSON && (
                    <Source id="route" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#1A6B8A',
                                'line-width': 3,
                                'line-opacity': 0.8,
                            }}
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round',
                            }}
                        />
                    </Source>
                )}
            </MapLibreMap>

            <div
                className="absolute top-4 left-4 flex flex-wrap items-center gap-2"
                style={{ zIndex: 10, maxWidth: 'calc(100% - 96px)' }}
            >
                <div
                    className="flex items-center gap-1 rounded-xl px-2 py-2"
                    style={{
                        background: 'var(--card)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <Layers size={13} style={{ color: 'var(--muted-foreground)' }} />
                    <select
                        value={mapLayer}
                        onChange={(e) => setMapLayer(e.target.value as MapLayerId)}
                        className="outline-none"
                        style={{
                            background: 'transparent',
                            color: 'var(--foreground)',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        <option value="clean">Clean</option>
                        <option value="minimal">Minimal</option>
                        <option value="street">Street</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>

                <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="rounded-xl px-3 py-2 outline-none"
                    style={{
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <option value="all">All days</option>
                    {sortedColumns.map((column, index) => (
                        <option key={column.id} value={column.id}>
                            Day {index + 1} - {column.date}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => setPinMode((mode) => mode === 'groups' ? 'cards' : 'groups')}
                    className="rounded-xl px-3 py-2 transition-all"
                    style={{
                        background: pinMode === 'groups' ? 'var(--accent)' : 'var(--card)',
                        color: pinMode === 'groups' ? 'var(--accent-foreground)' : 'var(--foreground)',
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                    }}
                >
                    {pinMode === 'groups' ? 'Group pins' : 'Card pins'}
                </button>

                <button
                    onClick={() => setShowRoute((v) => !v)}
                    disabled={pins.length < 2}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                    style={{
                        background: showRoute ? 'var(--accent)' : 'var(--card)',
                        color: showRoute ? 'var(--accent-foreground)' : 'var(--foreground)',
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                        opacity: pins.length < 2 ? 0.5 : 1,
                    }}
                >
                    <Navigation size={13} />
                    {loadingRoute ? 'Calculating...' : 'Show route'}
                </button>

                {route && showRoute && (
                    <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{
                            background: 'var(--card)',
                            fontSize: 12,
                            color: 'var(--muted-foreground)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                            {route.distanceKm} km
                        </span>
                        <span>-</span>
                        <span>{route.durationMins} mins driving</span>
                    </div>
                )}
            </div>

            {selectedPin && (
                <div
                    className="absolute bottom-6 left-1/2 rounded-2xl p-4"
                    style={{
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        minWidth: 280,
                        maxWidth: 380,
                    }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 mb-2"
                                style={{
                                    background: `${selectedPin.color}18`,
                                    color: selectedPin.color,
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            >
                                {selectedPin.count > 1 ? `${selectedPin.count} activities` : selectedPin.category}
                            </span>

                            <p
                                style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    color: 'var(--foreground)',
                                    marginBottom: 4,
                                }}
                            >
                                {selectedPin.title}
                            </p>

                            {selectedPin.locationName && (
                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                    {selectedPin.locationName}
                                </p>
                            )}

                            {selectedPin.cards.length > 1 && (
                                <div className="mt-3 flex flex-col" style={{ gap: 4 }}>
                                    {selectedPin.cards
                                        .slice()
                                        .sort((a, b) => a.position - b.position)
                                        .map((card) => (
                                            <p
                                                key={card.id}
                                                style={{ fontSize: 12, color: 'var(--foreground)' }}
                                            >
                                                {card.time_value ? `${card.time_value.slice(0, 5)} - ` : ''}{card.title}
                                            </p>
                                        ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedPin(null)}
                            className="rounded-lg p-1 shrink-0"
                            style={{
                                background: 'var(--muted)',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            {pins.length === 0 && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 10 }}
                >
                    <div
                        className="rounded-2xl px-6 py-4 text-center"
                        style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                            No locations yet
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                            Add a location to cards to see them on the map
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
