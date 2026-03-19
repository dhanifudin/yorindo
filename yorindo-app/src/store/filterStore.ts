import { create } from 'zustand'

interface FilterStore {
  industry: string
  city: string
  companySize: string
  page: number
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  industry: '',
  city: '',
  companySize: '',
  page: 1,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({ industry: '', city: '', companySize: '', page: 1 }),
}))
