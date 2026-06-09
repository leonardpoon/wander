// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { userRepository } from '../../../entity/userRepository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { username, passphrase, displayName } = req.body

    try {
        const taken = await userRepository.usernameExists(username)
        if (taken) {
            return res.status(400).json({ error: `Username "${username}" is already taken` })
        }

        const passphraseHash = await bcrypt.hash(passphrase, 12)

        const user = await userRepository.createUser({
            username,
            passphrase_hash: passphraseHash,
            display_name:    displayName ?? null,
            home_currency:   'SGD',
        })

        return res.status(200).json(user)
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' })
    }
}