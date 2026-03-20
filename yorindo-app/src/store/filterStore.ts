import { create } from 'zustand'

interface FilterStore {
  industry: string
  city: string
  companySize: string
  flagFilter: '' | 'flagged' | 'unflagged'
  page: number
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  industry: '',
  city: '',
  companySize: '',
  flagFilter: '',
  page: 1,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({ industry: '', city: '', companySize: '', flagFilter: '', page: 1 }),
}))
