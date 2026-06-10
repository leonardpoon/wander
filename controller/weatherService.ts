// controller/weatherService.ts
// US-19: weather forecast pipeline
// Fetches from Open-Meteo (free, no API key) and writes to raw.weather_events
// WMO weather codes mapped to human-readable labels + icon slugs

import { supabase } from '../entity/supabaseClient'

// ─── WMO Weather Code Map ────────────────────────────────────────────────────
// Open-Meteo returns WMO 4677 weather codes. We map them to a label and
// an icon slug that the UI uses to pick the right weather icon.
// Full spec: https://open-meteo.com/en/docs#weathervariables

const WMO_CODES: Record<number, { label: string; icon: string }> = {
    0:  { label: 'Clear sky',              icon: 'clear' },
    1:  { label: 'Mainly clear',           icon: 'clear' },
    2:  { label: 'Partly cloudy',          icon: 'partly-cloudy' },
    3:  { label: 'Overcast',               icon: 'cloudy' },
    45: { label: 'Fog',                    icon: 'fog' },
    48: { label: 'Icy fog',                icon: 'fog' },
    51: { label: 'Light drizzle',          icon: 'drizzle' },
    53: { label: 'Moderate drizzle',       icon: 'drizzle' },
    55: { label: 'Dense drizzle',          icon: 'drizzle' },
    61: { label: 'Slight rain',            icon: 'rain' },
    63: { label: 'Moderate rain',          icon: 'rain' },
    65: { label: 'Heavy rain',             icon: 'rain' },
    71: { label: 'Slight snow',            icon: 'snow' },
    73: { label: 'Moderate snow',          icon: 'snow' },
    75: { label: 'Heavy snow',             icon: 'snow' },
    77: { label: 'Snow grains',            icon: 'snow' },
    80: { label: 'Slight showers',         icon: 'showers' },
    81: { label: 'Moderate showers',       icon: 'showers' },
    82: { label: 'Violent showers',        icon: 'showers' },
    85: { label: 'Slight snow showers',    icon: 'snow' },
    86: { label: 'Heavy snow showers',     icon: 'snow' },
    95: { label: 'Thunderstorm',           icon: 'thunder' },
    96: { label: 'Thunderstorm w/ hail',   icon: 'thunder' },
    99: { label: 'Thunderstorm w/ hail',   icon: 'thunder' },
}

function decodeWMO(code: number): { label: string; icon: string } {
    return WMO_CODES[code] ?? { label: 'Unknown', icon: 'unknown' }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeatherForecast {
    date:     string    // YYYY-MM-DD
    temp_max: number
    temp_min: number
    label:    string    // human readable condition
    icon:     string    // icon slug for UI
}

export interface DestinationWeather {
    destination: string
    lat:         number
    lng:         number
    forecasts:   WeatherForecast[]
}

// ─── Open-Meteo Fetch ────────────────────────────────────────────────────────
// Fetches a 7-day forecast for a given lat/lng.
// Returns structured forecasts and also writes raw rows to raw.weather_events
// so the dbt pipeline has data to work with.

async function fetchForecast(
    destination: string,
    lat: number,
    lng: number
): Promise<WeatherForecast[]> {
    const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${lat}`,
        `&longitude=${lng}`,
        '&daily=weather_code,temperature_2m_max,temperature_2m_min',
        '&timezone=auto',
        '&forecast_days=7',
    ].join('')

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`)

    const raw = await response.json()

    const { time, weather_code, weathercode, temperature_2m_max, temperature_2m_min } = raw.daily
    const weatherCodes = weather_code ?? weathercode

    // build forecast array
    const forecasts: WeatherForecast[] = (time as string[]).map(
        (date: string, i: number) => {
            const { label, icon } = decodeWMO(weatherCodes[i])
            return {
                date,
                temp_max: Math.round(temperature_2m_max[i]),
                temp_min: Math.round(temperature_2m_min[i]),
                label,
                icon,
            }
        }
    )

    // write raw rows to raw.weather_events for the dbt pipeline
    // fire and forget — we don't await this, UI shouldn't wait for DB write
    writeRawWeatherEvents(destination, forecasts, raw).catch(console.error)

    return forecasts
}

// ─── Raw Pipeline Write ───────────────────────────────────────────────────────
// Inserts one row per forecast date into raw.weather_events.
// dbt reads from here in the staging layer.

async function writeRawWeatherEvents(
    destination: string,
    forecasts: WeatherForecast[],
    rawPayload: unknown
): Promise<void> {
    const rows = forecasts.map((f) => ({
        destination,
        forecast_date: f.date,
        temp_max:      f.temp_max,
        temp_min:      f.temp_min,
        condition:     f.label,
        raw_payload:   rawPayload,
    }))

    const { error } = await supabase
        .schema('raw')
        .from('weather_events')
        .insert(rows)

    if (error) console.error('Failed to write raw weather events:', error.message)
}

// ─── Pipeline Run Logging ─────────────────────────────────────────────────────
// US-45: every pipeline execution is logged to public.pipeline_runs
// Powers the data freshness indicator in the UI

async function logPipelineRun(
    pipelineName: string,
    status: 'success' | 'failed',
    rowsInserted: number,
    errorMessage?: string
): Promise<void> {
    const { error } = await supabase
        .from('pipeline_runs')
        .insert({
            pipeline_name: pipelineName,
            finished_at:   new Date().toISOString(),
            status,
            rows_inserted: rowsInserted,
            error_message: errorMessage ?? null,
        })

    if (error) console.error('Failed to log pipeline run:', error.message)
}

// ─── Weather Service ──────────────────────────────────────────────────────────

export const weatherService = {

    // US-19: fetch weather for a single destination
    async getWeatherForDestination(
        destination: string,
        lat: number,
        lng: number
    ): Promise<WeatherForecast[]> {
        try {
            const forecasts = await fetchForecast(destination, lat, lng)
            await logPipelineRun('weather', 'success', forecasts.length)
            return forecasts
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            await logPipelineRun('weather', 'failed', 0, message)
            throw err
        }
    },

    // US-19: fetch weather for multiple destinations in parallel
    // Used on the board load to populate weather strips for all columns
    async getWeatherForTrip(
        destinations: { name: string; lat: number; lng: number }[]
    ): Promise<DestinationWeather[]> {
        const results = await Promise.allSettled(
            destinations.map(async (d) => {
                const forecasts = await fetchForecast(d.name, d.lat, d.lng)
                return { destination: d.name, lat: d.lat, lng: d.lng, forecasts }
            })
        )

        // return successful fetches only — partial weather is fine
        // a failed destination just won't show a weather strip
        return results
            .filter((r): r is PromiseFulfilledResult<DestinationWeather> =>
                r.status === 'fulfilled'
            )
            .map((r) => r.value)
    },

    // US-19: get the forecast for a specific date within a destination's forecasts
    // Used by the board column header to show the right day's weather
    getForecastForDate(
        forecasts: WeatherForecast[],
        date: string   // YYYY-MM-DD
    ): WeatherForecast | null {
        return forecasts.find((f) => f.date === date) ?? null
    },

    // decode a WMO code directly — useful for the UI if it stores raw codes
    decodeWMO,
}
