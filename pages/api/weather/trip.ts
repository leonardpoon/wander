import type { NextApiRequest, NextApiResponse } from 'next'
import { geocodeDestination } from '../../../controller/destinationAssets'

const WMO_CODES: Record<number, { label: string; icon: string }> = {
    0:  { label: 'Clear sky',            icon: 'clear' },
    1:  { label: 'Mainly clear',         icon: 'clear' },
    2:  { label: 'Partly cloudy',        icon: 'partly-cloudy' },
    3:  { label: 'Overcast',             icon: 'cloudy' },
    45: { label: 'Fog',                  icon: 'fog' },
    48: { label: 'Icy fog',              icon: 'fog' },
    51: { label: 'Light drizzle',        icon: 'drizzle' },
    53: { label: 'Moderate drizzle',     icon: 'drizzle' },
    55: { label: 'Dense drizzle',        icon: 'drizzle' },
    61: { label: 'Slight rain',          icon: 'rain' },
    63: { label: 'Moderate rain',        icon: 'rain' },
    65: { label: 'Heavy rain',           icon: 'rain' },
    71: { label: 'Slight snow',          icon: 'snow' },
    73: { label: 'Moderate snow',        icon: 'snow' },
    75: { label: 'Heavy snow',           icon: 'snow' },
    77: { label: 'Snow grains',          icon: 'snow' },
    80: { label: 'Slight showers',       icon: 'showers' },
    81: { label: 'Moderate showers',     icon: 'showers' },
    82: { label: 'Violent showers',      icon: 'showers' },
    85: { label: 'Slight snow showers',  icon: 'snow' },
    86: { label: 'Heavy snow showers',   icon: 'snow' },
    95: { label: 'Thunderstorm',         icon: 'thunder' },
    96: { label: 'Thunderstorm w/ hail', icon: 'thunder' },
    99: { label: 'Thunderstorm w/ hail', icon: 'thunder' },
}

interface WeatherDestinationInput {
    name: string
    countryCode?: string | null
    lat?: number | null
    lng?: number | null
}

function decodeWMO(code: number): { label: string; icon: string } {
    return WMO_CODES[code] ?? { label: 'Unknown', icon: 'unknown' }
}

async function fetchForecast(destination: string, lat: number, lng: number) {
    const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${lat}`,
        `&longitude=${lng}`,
        '&daily=weather_code,temperature_2m_max,temperature_2m_min',
        '&timezone=auto',
        '&forecast_days=16',
    ].join('')

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`)

    const raw = await response.json()
    const { time, weather_code, weathercode, temperature_2m_max, temperature_2m_min } = raw.daily ?? {}
    const weatherCodes = weather_code ?? weathercode

    if (!Array.isArray(time) || !Array.isArray(weatherCodes)) {
        throw new Error('Open-Meteo response missing daily forecast data')
    }

    return {
        destination,
        lat,
        lng,
        forecasts: (time as string[]).map((date, index) => {
            const { label, icon } = decodeWMO(weatherCodes[index])

            return {
                date,
                temp_max: Math.round(temperature_2m_max[index]),
                temp_min: Math.round(temperature_2m_min[index]),
                label,
                icon,
            }
        }),
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const destinations = req.body?.destinations as WeatherDestinationInput[] | undefined
    if (!Array.isArray(destinations)) {
        return res.status(400).json({ error: 'destinations must be an array' })
    }

    const results = await Promise.allSettled(
        destinations.map(async (destination) => {
            const coords = destination.lat != null && destination.lng != null
                ? { lat: Number(destination.lat), lng: Number(destination.lng) }
                : await geocodeDestination(destination.name, destination.countryCode ?? undefined)

            if (!coords) throw new Error(`Could not geocode ${destination.name}`)
            return fetchForecast(destination.name, coords.lat, coords.lng)
        })
    )

    const weather = results
        .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchForecast>>> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)

    return res.status(200).json({ weather })
}
