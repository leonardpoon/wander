// Zustand store — holds trips and destinations in memory
// Single source of truth for trip state across the app

import { create } from 'zustand'
import { SafeTrip } from '../entity/Trip'
import { Destination } from '../entity/Destination'
import { TripColumn } from '../entity/Column'

interface TripState {
  trips: SafeTrip[]                          // all trips for current user
  activeTrip: SafeTrip | null                // currently open trip
  destinations: Destination[]                // destinations for active trip
  columns: TripColumn[]                      // columns for active trip board
  isLoading: boolean
  error: string | null

  // Actions
  setTrips: (trips: SafeTrip[]) => void
  addTrip: (trip: SafeTrip) => void
  removeTrip: (tripId: string) => void
  setActiveTrip: (trip: SafeTrip | null) => void
  setDestinations: (destinations: Destination[]) => void
  setColumns: (columns: TripColumn[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  activeTrip: null,
  destinations: [],
  columns: [],
  isLoading: false,
  error: null,

  setTrips: (trips) => set({ trips }),
  addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] })),
  removeTrip: (tripId) => set((state) => ({
    trips: state.trips.filter((t) => t.id !== tripId)
  })),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  setDestinations: (destinations) => set({ destinations }),
  setColumns: (columns) => set({ columns }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))