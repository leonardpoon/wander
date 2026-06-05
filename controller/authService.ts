// US-01, US-02, US-03, US-04, US-05

import bcrypt from 'bcryptjs'
import {userRepository} from '../entity/userRepository'
import {SafeUser} from '../entity/User'

// US-04: const factor for bcrypt hashing
const BCRYPT_ROUNDS = 12

export const authService = {

    // US-05: if username is taken, suggest username + incrementing suffix
    async suggestUsername(base: string): Promise<string> {
        const exists = await userRepository.usernameExists(base)
        // base username is free no suggestion needed
        if (!exists) return base

        let counter = 1
        while (counter <= 99) {
            const padded = counter.toString().padStart(2, '0')
            const candidate = `${base}${padded}`
            const taken = await userRepository.usernameExists(candidate)
            if (!taken) return candidate
            counter++
        }

        // fallback if all suffixes are taken, though this is very unlikely
        throw new Error('Could not find an available username variant. Try a different name')
    },

    // US-01, US-04: register a new user
    async register(username: string, passphrase: string, displayName?: string, homeCurrency?: string): Promise<SafeUser> {

        // validate minimum passphrase length (US-04: min 4 words or 8 characters)
        const wordCount = passphrase.trim().split(/\s+/).length
        const charCount = passphrase.length
        if (wordCount < 4 && charCount < 8) {
            throw new Error('Passphrase must be at least 4 words or 8 characters long')
        }

        // check username isn't arlready taken
        const taken = await userRepository.usernameExists(username)
        if (taken) {
            throw new Error(`Username "${username}" is already taken`)
        }

        // hash the passphrase
        const passphraseHash = await bcrypt.hash(passphrase, BCRYPT_ROUNDS)

        // insert into DB and return safe user 
        return await userRepository.createUser({
            username,
            passphrase_hash: passphraseHash,
            display_name: displayName,
            home_currency: homeCurrency ?? 'SGD',
        })
    },

    // US-03: log in returning user on any device
    async login(username: string, passphrase: string): Promise<SafeUser> {

        // fetch full user row 
        const user = await userRepository.findUsername(username)
        if (!user) {
            throw new Error('Username not found. Check your username and try again.')
        }

        // compare entered passphrase against stored hash
        const match = await bcrypt.compare(passphrase, user.passphrase_hash)
        if (!match) {
            throw new Error('Incorrect passphrase. Please try again.')
        }

        // update last seen timestamp
        await userRepository.updateLastSeen(user.id)

        // return safe user 
        const {passphrase_hash, ...safeUser} = user
        return safeUser as SafeUser
    }
}