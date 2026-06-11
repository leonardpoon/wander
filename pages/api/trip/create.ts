// pages/api/trip/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { tripRepository } from '../../../entity/TripRepository'
import { destinationRepository } from '../../../entity/destinationRepository'
import { todoRepository } from '../../../entity/todoRepository'
import { CreateDestinationPayload } from '../../../entity/Destination'
import { CreateColumnPayload } from '../../../entity/Column'
import { fetchDestinationPhoto, geocodeDestination } from '../../../controller/destinationAssets'

function generateRoomCode(): string {
    const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const random = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    return `WND-${random}`
}

function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    const end     = new Date(endDate)
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }
    return dates
}

async function generateUniqueRoomCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
        const code     = generateRoomCode()
        const existing = await tripRepository.findByRoomCode(code)
        if (!existing) return code
    }
    throw new Error('Failed to generate unique room code')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { owner_id, name, destinations, primaryCurrency, pin } = req.body

    try {
        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' })
        }

        const tripStartDate = destinations[0].startDate
        const tripEndDate   = destinations[destinations.length - 1].endDate
        const roomCode      = await generateUniqueRoomCode()
        const pinHash       = await bcrypt.hash(pin, 12)
        const firstDestination = destinations[0]
        const photoUrl = await fetchDestinationPhoto(
            firstDestination.name,
            firstDestination.startDate,
            firstDestination.countryCode
        )

        const trip = await tripRepository.createTrip({
            owner_id,
            name,
            start_date:       tripStartDate,
            end_date:         tripEndDate,
            primary_currency: primaryCurrency ?? 'SGD',
            photo_url:        photoUrl,
            room_code:        roomCode,
            pin_hash:         pinHash,
        })

        const destPayloads: CreateDestinationPayload[] = await Promise.all(
            destinations.map(async (dest: any, index: number) => {
                const coords = await geocodeDestination(dest.name, dest.countryCode)

                return {
                    trip_id:        trip.id,
                    name:           dest.name,
                    country_code:   dest.countryCode,
                    local_currency: dest.localCurrency,
                    colour_hex:     dest.colourHex,
                    position:       index,
                    start_date:     dest.startDate,
                    end_date:       dest.endDate,
                    lat:            coords?.lat ?? null,
                    lng:            coords?.lng ?? null,
                }
            })
        )

        const createdDests = await destinationRepository.createDestinations(destPayloads)

        const columnPayloads: CreateColumnPayload[] = []
        let globalPosition = 0

        for (const dest of createdDests) {
            const dates = getDateRange(dest.start_date, dest.end_date)
            for (const date of dates) {
                columnPayloads.push({
                    trip_id:        trip.id,
                    destintation_id: dest.id,
                    date,
                    position:       globalPosition,
                })
                globalPosition++
            }
        }

        await tripRepository.createColumns(columnPayloads)
        await tripRepository.addMember(trip.id, owner_id, 'owner')
        await Promise.all(['To Do', 'In Progress', 'Awaiting', 'Done'].map((label, position) =>
            todoRepository.createColumn({
                trip_id: trip.id,
                label,
                position,
            })
        ))

        const { pin_hash, ...safeTrip } = trip as any
        return res.status(200).json({ trip: safeTrip, destinations: createdDests })
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create trip' })
    }
}
