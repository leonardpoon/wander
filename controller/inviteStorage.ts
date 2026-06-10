interface StoredTripInvite {
    roomCode: string
    pin: string
}

function getInviteKey(tripId: string): string {
    return `wander_trip_invite_${tripId}`
}

export function saveTripInvite(tripId: string, roomCode: string | null | undefined, pin: string): void {
    if (typeof window === 'undefined' || !roomCode || !pin) return

    const invite: StoredTripInvite = { roomCode, pin }
    localStorage.setItem(getInviteKey(tripId), JSON.stringify(invite))
}

export function getTripInvite(tripId: string): StoredTripInvite | null {
    if (typeof window === 'undefined') return null

    const rawInvite = localStorage.getItem(getInviteKey(tripId))
    if (!rawInvite) return null

    try {
        return JSON.parse(rawInvite) as StoredTripInvite
    } catch {
        localStorage.removeItem(getInviteKey(tripId))
        return null
    }
}
