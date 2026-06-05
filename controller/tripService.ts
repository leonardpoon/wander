// US-06, US-07, US-08, US-09, US-10

import bcrypt from 'bcryptjs'
import {tripRepository} from '../entity/TripRepository'
import {destinationRepository} from '../entity/destinationRepository'
import {SafeTrip} from '../entity/Trip'
import {Destination, CreateDestinationPayload} from '../entity/Destination'
import {CreateColumnPayload} from '../entity/Column'


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
    async crateTrip(payload: {
        owner_id: string
        name: string
        destinations: {
            name: string
            countryCode: string
            localCurrency: string
            colourHex: string
            startDate: string
            endDate: string
        }[]
        primaryCurrency?: string
        // US-09: 4 digit pin for joining via room code
        pin: string
    }): Promise<{trip: SafeTrip, destinations: Destination[]}> {

        // validate PIN is 4 digits
        if (!/^\d{4}$/.test(payload.pin)) {
            throw new Error('PIN must be exactly 4 digits')
        }

        // validate at least one destination
        if (!payload.destinations.length) {
            throw new Error('At least one destination is required')
        }

        // Derive trip start and end from last destination dates
        const tripStartDate = payload.destinations[0].startDate
        const tripEndDate = payload.destinations[payload.destinations.length - 1].endDate

        // validate date range
        if (new Date(tripStartDate) > new Date(tripEndDate)) {
            throw new Error('Trip start date must be before end date')
        }

        // US-07: fetch Unsplash photo for primary destination
        const photoUrl = await fetchUnsplashPhoto(
            payload.destinations[0].name,
            payload.destinations[0].startDate,
            payload.destinations[0].countryCode 
        )

        // US-09: generate unique room code
        const roomCode = await generateUniqueRoomCode()
        const pinHash = await bcrypt.hash(payload.pin, BCRYPT_ROUNDS)

        // insert trip row
        const trip = await tripRepository.createTrip({
            owner_id: payload.owner_id,
            name: payload.name,
            start_date: tripStartDate,
            end_date: tripEndDate,
            primary_currency: payload.primaryCurrency ?? 'SGD',
            photo_url: photoUrl,
            room_code: roomCode,
            pin_hash: pinHash,
        })

        // US-08: insert destination in order
        const destinationPayloads: CreateDestinationPayload[] = payload.destinations.map(
            (dest, index) => ({
                trip_id: trip.id,
                name: dest.name,
                country_code: dest.countryCode,
                local_currency: dest.localCurrency,
                colour_hex: dest.colourHex,
                position: index,
                start_date: dest.startDate,
                end_date: dest.endDate,
            })
        )

        const destinations = await destinationRepository.createDestinations(destinationPayloads)

        // US-06: auto-generate one kanban column per date per destination
        const columnPayloads: CreateColumnPayload[] = []
        let globalPosition = 0

        for (const dest of destinations) {
            const dates = getDateRange(dest.start_date, dest.end_date)
            for (const date of dates) {
                columnPayloads.push({
                    trip_id: trip.id,
                    destination_id: dest.id,
                    date,
                    position: globalPosition,
                })
                globalPosition++
            }
        }
        await tripRepository.createColumns(columnPayloads)

        // add owner as first trip member
        await tripRepository.addMember(trip.id, payload.owner_id, 'owner')

        return {trip, destinations}
    },

    // US-09: verify PIN when joining via room code
    async verifyPin(roomCode: string, pin: string): Promise<SafeTrip | null> {
        const trip = await tripRepository.findByRoomCode(roomCode)
        if (!trip) {
            throw new Error('Room code not found. Check the code and try again.')
        }

        const match = await bcrypt.compare(pin, trip.pin_hash)
        if (!match) {
            throw new Error('Incorrect PIN. Please try again.')
        }

        // return safe trip
        const {pin_hash, ...safeTrip} = trip
        return safeTrip as SafeTrip
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

}