'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VendorForm } from './VendorForm'
import type { Vendor } from '@/types/api'

vi.mock('@/hooks/useVendors', () => ({
  useCreateVendor: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVendor: () => ({ mutate: vi.fn(), isPending: false }),
}))

const mockVendor: Vendor = {
  id: 'vendor-001',
  name: 'Alibaba Cloud',
  contact_email: 'contact@alibaba.com',
  website: 'https://alibaba.com',
  logo_url: 'https://cdn.alibaba.com/logo.png',
  industry: 'teknologi',
  notes: 'Catatan internal test',
  linked_event_count: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('VendorForm', () => {
  describe('VendorForm — edit mode pre-population (AC1)', () => {
    it('pre-fills all fields with vendor values when opened in edit mode', async () => {
      render(<VendorForm open={true} onOpenChange={vi.fn()} vendor={mockVendor} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Alibaba Cloud')).toBeInTheDocument()
        expect(screen.getByDisplayValue('contact@alibaba.com')).toBeInTheDocument()
        expect(screen.getByDisplayValue('https://alibaba.com')).toBeInTheDocument()
        expect(screen.getByDisplayValue('https://cdn.alibaba.com/logo.png')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Catatan internal test')).toBeInTheDocument()
      })

      const industrySelect = screen.getByRole('combobox')
      expect((industrySelect as HTMLSelectElement).value).toBe('teknologi')
    })
  })

  describe('VendorForm — create mode (AC2)', () => {
    it('opens with empty fields when no vendor prop is provided', async () => {
      render(<VendorForm open={true} onOpenChange={vi.fn()} />)

      // Tunggu form benar-benar muncul (penting karena Dialog + React Hook Form)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Contoh: Alibaba Cloud')).toBeInTheDocument()
      })

      // Assertions dengan cara yang lebih aman
      expect((screen.getByPlaceholderText('Contoh: Alibaba Cloud') as HTMLInputElement).value).toBe('')
      expect((screen.getByPlaceholderText('sponsor@perusahaan.com') as HTMLInputElement).value).toBe('')
      expect((screen.getByPlaceholderText('https://perusahaan.com') as HTMLInputElement).value).toBe('')
      expect((screen.getByPlaceholderText('https://cdn.perusahaan.com/logo.png') as HTMLInputElement).value).toBe('')

      // Catatan (textarea) — pakai regex biar lebih fleksibel
      const notesTextarea = screen.getByPlaceholderText(/Catatan untuk tim Yorindo/i) as HTMLTextAreaElement
      expect(notesTextarea).toBeInTheDocument()
      expect(notesTextarea.value).toBe('')

      const industrySelect = screen.getByRole('combobox')
      expect((industrySelect as HTMLSelectElement).value).toBe('')
    })
  })

  describe('VendorForm — re-open behavior (AC3)', () => {
    it('shows original vendor values after closing and re-opening', async () => {
      const onOpenChange = vi.fn()
      const { rerender } = render(
        <VendorForm open={true} onOpenChange={onOpenChange} vendor={mockVendor} />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Alibaba Cloud')).toBeInTheDocument()
      })

      // Close dialog
      rerender(<VendorForm open={false} onOpenChange={onOpenChange} vendor={mockVendor} />)

      // Re-open
      rerender(<VendorForm open={true} onOpenChange={onOpenChange} vendor={mockVendor} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Alibaba Cloud')).toBeInTheDocument()
        expect(screen.getByDisplayValue('contact@alibaba.com')).toBeInTheDocument()
      })
    })

    it('shows updated values when a different vendor is passed on re-open', async () => {
      const otherVendor: Vendor = {
        ...mockVendor,
        id: 'vendor-002',
        name: 'Telkom Indonesia',
        contact_email: 'telkom@telkom.co.id',
        industry: 'telekomunikasi',
        notes: '',
      }

      const onOpenChange = vi.fn()
      const { rerender } = render(
        <VendorForm open={true} onOpenChange={onOpenChange} vendor={mockVendor} />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Alibaba Cloud')).toBeInTheDocument()
      })

      // Simulate close then open with different vendor
      rerender(<VendorForm open={false} onOpenChange={onOpenChange} vendor={otherVendor} />)
      rerender(<VendorForm open={true} onOpenChange={onOpenChange} vendor={otherVendor} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Telkom Indonesia')).toBeInTheDocument()
        expect(screen.getByDisplayValue('telkom@telkom.co.id')).toBeInTheDocument()
      })

      // Pastikan nilai lama tidak muncul lagi
      expect(screen.queryByDisplayValue('Alibaba Cloud')).not.toBeInTheDocument()
    })
  })
})