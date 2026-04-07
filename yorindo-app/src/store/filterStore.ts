import { create } from 'zustand'

interface FilterStore {
  serviceType: string
  city: string
  jobTitle: string
  page: number
  flagFilter: '' | 'flagged' | 'unflagged'
  missingEmail: boolean
  missingPhone: boolean
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  serviceType: '',
  city: '',
  jobTitle: '',
  page: 1,
  flagFilter: '',
  missingEmail: false,
  missingPhone: false,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({
    serviceType: '',
    city: '',
    jobTitle: '',
    page: 1,
    flagFilter: '',
    missingEmail: false,
    missingPhone: false,
  }),
}))
