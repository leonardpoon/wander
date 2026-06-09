// US-06, US-07, US-08, US-09, US-10

import bcrypt from 'bcryptjs'
import {tripRepository} from '../entity/TripRepository'
import {destinationRepository} from '../entity/destinationRepository'
import {SafeTrip} from '../entity/Trip'
import {Destination, CreateDestinationPayload} from '../entity/Destination'
import {CreateColumnPayload} from '../entity/Column'
import { TripColumn } from '../entity/Column'


const BCRYPT_ROUNDS = 12
const ROOM_CODE_PREFIX = 'WND'

// US-09: henerate a unique room code for trip sharing
function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const random = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${ROOM_CODE_PREFIX}-${random}`
}

// US-06: generate all dates between start and end inclusive
function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    const end= new Date(endDate)

    while(current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }

    return dates
}

// US-07: Derive season from trip start date
function getSeason(startDate: string, countryCode: string): string {
    const month = new Date(startDate).getMonth() + 1 

    // southern hemisphere, seasons are flipped
    const southernHemisphere = ['AU', 'NZ', 'AR', 'CL', 'ZA', 'BR', 'UY', 'PY', 'BO', 'PE']
    const isSouthern = southernHemisphere.includes(countryCode.toUpperCase())

    const northernSeason =
        month >= 3 && month <= 5 ? 'spring' :
        month >= 6 && month <= 8 ? 'summer' :
        month >= 9 && month <= 11 ? 'autumn' :
        'winter'

    // Flip season for southern hemisphere
    const seasonMap: Record<string, string> = {
        spring: 'autumn',
        summer: 'winter',
        autumn: 'spring',
        winter: 'summer'
    }

    return isSouthern ? seasonMap[northernSeason] : northernSeason
}

// US-07: fetch photo for destination using Unsplash API
async function fetchUnsplashPhoto(destination: string, startDate: string, countryCode: string): Promise<string | null> {
    try {
        const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
        if (!accessKey) return null

        const season = getSeason(startDate, countryCode)
        const query = encodeURIComponent(`${destination} ${season} travel landscape`)
        const url = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${accessKey}`

        const response = await fetch(url)
        if (!response.ok) return null

        const data = await response.json()
        return data?.urls?.regular ?? null
    } catch {
        return null
    }
}

// US-09: ensure room code is unique 
async function generateUniqueRoomCode(): Promise<string> {
    let attempts = 0
    while (attempts < 20) {
        const code = generateRoomCode()
        const exisiting = await tripRepository.findByRoomCode(code)
        if (!exisiting) return code
        attempts++
    }

    throw new Error('Failed to generate unique room code. Please try again.')
}

export const tripService = {

    // US-06, US-07, US-08, US-09
    async createTrip(payload: {
        owner_id:     string
        name:         string
        destinations: {
            name:          string
            countryCode:   string
            localCurrency: string
            colourHex:     string
            startDate:     string
            endDate:       string
        }[]
        primaryCurrency?: string
        pin:          string
    }): Promise<{ trip: SafeTrip; destinations: Destination[] }> {
        const response = await fetch('/api/trip/create', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Failed to create trip')
        return data
},

    // US-09: verify PIN when joining via room code
    async verifyPin(roomCode: string, pin: string): Promise<SafeTrip | null> {
        const response = await fetch('/api/trip/verify-pin', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ roomCode, pin }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Verification failed')
        return data as SafeTrip
    },

    // US-10: delete trip 
    async deleteTrip(tripId: string, owner_id: string): Promise<void> {
        const trip = await tripRepository.findById(tripId)
        if (!trip) throw new Error('Trip not found.')
        if (trip.owner_id !== owner_id) throw new Error('Only the trip owner can delete the trip.')
        await tripRepository.deleteTrip(tripId)
    },

    // fetch all trips for a user
    async getUserTrips(userId: string): Promise<SafeTrip[]> {
        return await tripRepository.findByUser(userId)
    },
    // fetch a single trip by ID
    async getTripById(tripId: string): Promise<SafeTrip> {
    const trip = await tripRepository.findById(tripId)
    if (!trip) throw new Error('Trip not found')
    // trip is a full Trip with pin_hash — strip it before returning
    const { pin_hash, ...safeTrip } = trip as any
    return {
        ...safeTrip,
        accent_color:        safeTrip.theme_colour,
        hero_image_url:      safeTrip.photo_url,
        home_currency:       safeTrip.home_currency ?? null,
        primary_destination: null,
    } as SafeTrip
},

    // fetch destinations for a trip
    async getDestinations(tripId: string): Promise<Destination[]> {
        return await destinationRepository.findByTrip(tripId)
    },

    // fetch columns for a trip
    async getColumns(tripId: string): Promise<TripColumn[]> {
        return await tripRepository.findColumns(tripId)
    },

    // alias for getUserTrips — used in index.tsx
    async getTripsByUser(userId: string): Promise<SafeTrip[]> {
        return await this.getUserTrips(userId)
    },

}
