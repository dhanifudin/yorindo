import { create } from 'zustand'

interface FilterStore {
  flagFilter: '' | 'flagged' | 'unflagged'
  missingEmail: boolean
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  flagFilter: '',
  missingEmail: false,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({ flagFilter: '', missingEmail: false }),
}))
