// pages/api/trip/verify-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { tripRepository } from '../../../entity/TripRepository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { roomCode, pin } = req.body

    try {
        const trip = await tripRepository.findByRoomCode(roomCode)
        if (!trip) {
            return res.status(400).json({ error: 'Room code not found' })
        }

        const match = await bcrypt.compare(pin, trip.pin_hash)
        if (!match) {
            return res.status(400).json({ error: 'Incorrect PIN' })
        }

        const { pin_hash, ...safeTrip } = trip
        return res.status(200).json(safeTrip)
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Verification failed' })
    }
}
