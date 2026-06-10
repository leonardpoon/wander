const FALLBACK_TRAVEL_IMAGES = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
]

interface NominatimResult {
    lat: string
    lon: string
}

function getSeason(startDate: string, countryCode: string): string {
    const month = new Date(`${startDate}T00:00:00`).getMonth() + 1
    const southernHemisphere = ['AU', 'NZ', 'AR', 'CL', 'ZA', 'BR', 'UY', 'PY', 'BO', 'PE']
    const isSouthern = southernHemisphere.includes(countryCode.toUpperCase())

    const northernSeason =
        month >= 3 && month <= 5 ? 'spring' :
        month >= 6 && month <= 8 ? 'summer' :
        month >= 9 && month <= 11 ? 'autumn' :
        'winter'

    const seasonMap: Record<string, string> = {
        spring: 'autumn',
        summer: 'winter',
        autumn: 'spring',
        winter: 'summer',
    }

    return isSouthern ? seasonMap[northernSeason] : northernSeason
}

export async function geocodeDestination(
    destination: string,
    countryCode?: string
): Promise<{ lat: number; lng: number } | null> {
    try {
        const query = encodeURIComponent(countryCode ? `${destination}, ${countryCode}` : destination)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'Wander/1.0 travel planner',
                },
            }
        )

        if (!response.ok) return null

        const results: NominatimResult[] = await response.json()
        if (!results.length) return null

        return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
        }
    } catch {
        return null
    }
}

export async function fetchDestinationPhoto(
    destination: string,
    startDate: string,
    countryCode: string
): Promise<string> {
    const fallbackIndex = Math.abs(
        destination.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    ) % FALLBACK_TRAVEL_IMAGES.length

    try {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY ?? process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
        if (!accessKey) return FALLBACK_TRAVEL_IMAGES[fallbackIndex]

        const season = getSeason(startDate, countryCode)
        const query = encodeURIComponent(`${destination} ${season} travel landscape`)
        const url = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${accessKey}`

        const response = await fetch(url)
        if (!response.ok) return FALLBACK_TRAVEL_IMAGES[fallbackIndex]

        const data = await response.json()
        return data?.urls?.regular ?? FALLBACK_TRAVEL_IMAGES[fallbackIndex]
    } catch {
        return FALLBACK_TRAVEL_IMAGES[fallbackIndex]
    }
}
