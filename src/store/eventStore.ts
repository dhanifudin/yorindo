import { create } from 'zustand'

interface EventStore {
  selectedEventId: string | null
  setSelectedEvent: (id: string) => void
}

export const useEventStore = create<EventStore>((set) => ({
  selectedEventId: null,
  setSelectedEvent: (id) => set({ selectedEventId: id }),
}))
