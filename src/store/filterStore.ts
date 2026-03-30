import { create } from 'zustand'

interface FilterStore {
  industry: string
  city: string
  companySize: string
  page: number
  flagFilter: '' | 'flagged' | 'unflagged'
  missingEmail: boolean
  missingPhone: boolean
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  industry: '',
  city: '',
  companySize: '',
  page: 1,
  flagFilter: '',
  missingEmail: false,
  missingPhone: false,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({
    industry: '',
    city: '',
    companySize: '',
    page: 1,
    flagFilter: '',
    missingEmail: false,
    missingPhone: false,
  }),
}))
