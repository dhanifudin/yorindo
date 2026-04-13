import { create } from 'zustand'

interface FilterStore {
  serviceType: string
  city: string
  jobTitle: string
  page: number
  missingEmail: boolean
  missingPhone: boolean
  flagged: boolean
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  serviceType: '',
  city: '',
  jobTitle: '',
  page: 1,
  missingEmail: false,
  missingPhone: false,
  flagged: false,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({
    serviceType: '',
    city: '',
    jobTitle: '',
    page: 1,
    missingEmail: false,
    missingPhone: false,
    flagged: false,
  }),
}))
