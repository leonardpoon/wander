// controller/mapService.ts
// US-20 to US-22: map view + route calculation via OSRM
// OSRM is free, no API key, uses OpenStreetMap data
// mapcn handles the actual map rendering in the boundary layer
// this service is purely data — coordinates, routes, card pin grouping

import { Card } from '../entity/Cards'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapPin {
    cardId:       string
    title:        string
    category:     string
    lat:          number
    lng:          number
    locationName: string | null
}

export interface RouteStep {
    lat: number
    lng: number
}

export interface RouteResult {
    coordinates:    RouteStep[]   // full polyline for the route overlay
    distanceKm:     number
    durationMins:   number
}

// ─── OSRM Route Fetch ────────────────────────────────────────────────────────
// OSRM public API: router.project-osrm.org
// Takes an ordered list of coordinates and returns a driving route.
// We use the 'driving' profile — fine for general trip routing.
// Rate limit: reasonable for our use case (called once per map open, not on every pan)

async function fetchRoute(waypoints: RouteStep[]): Promise<RouteResult | null> {
    if (waypoints.length < 2) return null

    // OSRM expects coordinates as lng,lat (note: reversed from lat,lng convention)
    const coords = waypoints
        .map((wp) => `${wp.lng},${wp.lat}`)
        .join(';')

    const url = [
        'https://router.project-osrm.org/route/v1/driving/',
        coords,
        '?overview=full',
        '&geometries=geojson',
    ].join('')

    try {
        const response = await fetch(url)
        if (!response.ok) return null

        const data = await response.json()
        if (!data.routes?.length) return null

        const route = data.routes[0]

        // GeoJSON coordinates come back as [lng, lat] pairs — flip them
        const coordinates: RouteStep[] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
        )

        return {
            coordinates,
            distanceKm:   Math.round((route.distance / 1000) * 10) / 10,
            durationMins: Math.round(route.duration / 60),
        }
    } catch {
        // route fetch failure should never break the map view
        // map still renders with pins, just no route line
        return null
    }
}

// ─── Map Service ─────────────────────────────────────────────────────────────

export const mapService = {

    // US-21: convert geocoded cards into map pins
    // Only cards with lat/lng are included — ungeocoeded cards are skipped
    getMapPins(cards: Card[]): MapPin[] {
        return cards
            .filter((c) => c.lat !== null && c.lng !== null)
            .map((c) => ({
                cardId:       c.id,
                title:        c.title,
                category:     c.category,
                lat:          c.lat!,
                lng:          c.lng!,
                locationName: c.location_name,
            }))
    },

    // US-22: calculate a route between all pinned cards in position order
    // Cards are sorted by column position then card position
    // so the route follows the itinerary order
    async getRouteForCards(cards: Card[]): Promise<RouteResult | null> {
        const pins = this.getMapPins(cards)
        if (pins.length < 2) return null

        const waypoints: RouteStep[] = pins.map((p) => ({
            lat: p.lat,
            lng: p.lng,
        }))

        return await fetchRoute(waypoints)
    },

    // US-21: compute the bounding box for a set of pins
    // mapcn uses this to auto-fit the map viewport to show all pins
    getBounds(pins: MapPin[]): {
        minLat: number
        maxLat: number
        minLng: number
        maxLng: number
    } | null {
        if (pins.length === 0) return null

        return {
            minLat: Math.min(...pins.map((p) => p.lat)),
            maxLat: Math.max(...pins.map((p) => p.lat)),
            minLng: Math.min(...pins.map((p) => p.lng)),
            maxLng: Math.max(...pins.map((p) => p.lng)),
        }
    },

    // US-21: group pins by category for colour-coded markers
    // mapcn marker colour is set per pin — we map category to a hex colour
    // matching the design system tokens in globals.css
    getCategoryColour(category: string): string {
        const colours: Record<string, string> = {
            travel:   '#6366f1',   // --color-category-travel
            sightsee: '#10b981',   // --color-category-sightsee
            shopping: '#f59e0b',   // --color-category-shopping
            eating:   '#ef4444',   // --color-category-eating
        }
        return colours[category] ?? '#6366f1'
    },

    // US-20: check if a trip has any geocoded cards
    // Used to decide whether to show the map view toggle at all
    hasMapData(cards: Card[]): boolean {
        return cards.some((c) => c.lat !== null && c.lng !== null)
    },
}