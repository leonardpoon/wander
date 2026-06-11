// boundary/MapView.tsx
// US-20 to US-22: map view with category-coloured pins + OSRM route overlay
// Uses react-map-gl + maplibre-gl (free CARTO tiles, no API key)

import { useState, useEffect, useCallback } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import * as maplibregl from 'maplibre-gl'
import { Navigation, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCards } from '../controller/useCards'
import { mapService, MapPin, RouteResult } from '../controller/mapService'
import { Card } from '../entity/Cards'

maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js')

// Free CARTO tiles — no API key required
const LIGHT_STYLE = {
    version: 8 as const,
    sources: {
        osm: {
            type: 'raster' as const,
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
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
            attribution: '© OpenStreetMap contributors © CARTO',
        },
    },
    layers: [{
        id: 'carto-dark-tiles',
        type: 'raster' as const,
        source: 'cartoDark',
    }],
}

interface MapViewProps {
    tripId:   string
    darkMode: boolean
}

export function MapView({ tripId, darkMode }: MapViewProps) {
    const { cards } = useCards(tripId)

    const [pins,         setPins]         = useState<MapPin[]>([])
    const [route,        setRoute]        = useState<RouteResult | null>(null)
    const [showRoute,    setShowRoute]    = useState(false)
    const [selectedPin,  setSelectedPin]  = useState<MapPin | null>(null)
    const [loadingRoute, setLoadingRoute] = useState(false)

    // US-21: build pins from geocoded cards
    useEffect(() => {
        const mapPins = mapService.getMapPins(cards)
        setPins(mapPins)
    }, [cards])

    // US-22: fetch route when showRoute is toggled on
    useEffect(() => {
        if (!showRoute || pins.length < 2) {
            setRoute(null)
            return
        }

        async function fetchRoute() {
            setLoadingRoute(true)
            const result = await mapService.getRouteForCards(cards)
            setRoute(result)
            setLoadingRoute(false)
        }

        fetchRoute()
    }, [showRoute, pins])

    // compute initial viewport centre from pins
    const bounds    = mapService.getBounds(pins)
    const initLat   = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 1.3521
    const initLng   = bounds ? (bounds.minLng + bounds.maxLng) / 2 : 103.8198
    const initZoom  = pins.length > 0 ? 11 : 3

    // GeoJSON for the route polyline
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
            {/* Map */}
            <Map
                mapLib={maplibregl}
                initialViewState={{
                    latitude:  initLat,
                    longitude: initLng,
                    zoom:      initZoom,
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={darkMode ? DARK_STYLE : LIGHT_STYLE}
            >
                <NavigationControl position="top-right" />

                {/* US-21: category-coloured pins */}
                {pins.map((pin) => (
                    <Marker
                        key={pin.cardId}
                        latitude={pin.lat}
                        longitude={pin.lng}
                        onClick={(e) => {
                            e.originalEvent.stopPropagation()
                            setSelectedPin(selectedPin?.cardId === pin.cardId ? null : pin)
                        }}
                    >
                        <div
                            className="rounded-full flex items-center justify-center cursor-pointer transition-transform"
                            style={{
                                width:      28,
                                height:     28,
                                background: mapService.getCategoryColour(pin.category),
                                border:     '2px solid white',
                                boxShadow:  '0 2px 6px rgba(0,0,0,0.3)',
                                transform:  selectedPin?.cardId === pin.cardId
                                    ? 'scale(1.3)'
                                    : 'scale(1)',
                            }}
                        >
                            <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>
                                {pin.category.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </Marker>
                ))}

                {/* US-22: route polyline */}
                {routeGeoJSON && (
                    <Source id="route" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color':   '#1A6B8A',
                                'line-width':   3,
                                'line-opacity': 0.8,
                            }}
                            layout={{
                                'line-join': 'round',
                                'line-cap':  'round',
                            }}
                        />
                    </Source>
                )}
            </Map>

            {/* US-22: Show route toggle */}
            <div
                className="absolute top-4 left-4 flex items-center gap-2"
                style={{ zIndex: 10 }}
            >
                <button
                    onClick={() => setShowRoute((v) => !v)}
                    disabled={pins.length < 2}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                    style={{
                        background: showRoute ? 'var(--accent)' : 'var(--card)',
                        color:      showRoute ? 'var(--accent-foreground)' : 'var(--foreground)',
                        fontSize:   12,
                        fontWeight: 600,
                        boxShadow:  '0 2px 8px rgba(0,0,0,0.15)',
                        border:     '1px solid var(--border)',
                        opacity:    pins.length < 2 ? 0.5 : 1,
                    }}
                >
                    <Navigation size={13} />
                    {loadingRoute ? 'Calculating…' : 'Show route'}
                </button>

                {/* Route stats */}
                {route && showRoute && (
                    <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{
                            background: 'var(--card)',
                            fontSize:   12,
                            color:      'var(--muted-foreground)',
                            boxShadow:  '0 2px 8px rgba(0,0,0,0.15)',
                            border:     '1px solid var(--border)',
                        }}
                    >
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                            {route.distanceKm} km
                        </span>
                        <span>·</span>
                        <span>{route.durationMins} mins driving</span>
                    </div>
                )}
            </div>

            {/* US-21: Pin detail popover */}
            {selectedPin && (
                <div
                    className="absolute bottom-6 left-1/2 rounded-2xl p-4"
                    style={{
                        transform:  'translateX(-50%)',
                        zIndex:     10,
                        background: 'var(--card)',
                        border:     '1px solid var(--border)',
                        boxShadow:  '0 8px 24px rgba(0,0,0,0.15)',
                        minWidth:   280,
                        maxWidth:   360,
                    }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            {/* Category chip */}
                            <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 mb-2"
                                style={{
                                    background: `${mapService.getCategoryColour(selectedPin.category)}18`,
                                    color:      mapService.getCategoryColour(selectedPin.category),
                                    fontSize:   10,
                                    fontWeight: 600,
                                }}
                            >
                                {selectedPin.category}
                            </span>

                            <p
                                style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 700,
                                    fontSize:   14,
                                    color:      'var(--foreground)',
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
                        </div>

                        <button
                            onClick={() => setSelectedPin(null)}
                            className="rounded-lg p-1 shrink-0"
                            style={{
                                background: 'var(--muted)',
                                color:      'var(--muted-foreground)',
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {pins.length === 0 && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 10 }}
                >
                    <div
                        className="rounded-2xl px-6 py-4 text-center"
                        style={{
                            background: 'var(--card)',
                            border:     '1px solid var(--border)',
                            boxShadow:  '0 4px 12px rgba(0,0,0,0.1)',
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
