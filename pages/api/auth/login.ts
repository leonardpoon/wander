// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { userRepository } from '../../../entity/userRepository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { username, passphrase } = req.body

    try {
        const user = await userRepository.findUsername(username)
        if (!user) {
            return res.status(400).json({ error: 'Username not found' })
        }

        const match = await bcrypt.compare(passphrase, user.passphrase_hash)
        if (!match) {
            return res.status(400).json({ error: 'Incorrect passphrase' })
        }

        await userRepository.updateLastSeen(user.id)

        const { passphrase_hash, ...safeUser } = user
        return res.status(200).json(safeUser)
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' })
    }
}