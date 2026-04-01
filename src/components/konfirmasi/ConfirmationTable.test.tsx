import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmationTable, type ConfirmationRegistration } from './ConfirmationTable'

const sampleRegistrations: ConfirmationRegistration[] = [
  {
    id: 'reg-1',
    contact: { name: 'Budi Santoso', company: 'PT Maju' },
    channel: 'whatsapp',
    ticketSentAt: '2026-04-01T10:00:00Z',
    confirmationStatus: 'confirmed',
  },
  {
    id: 'reg-2',
    contact: { name: 'Siti Rahma', company: 'CV Nusantara' },
    channel: 'email',
    ticketSentAt: null,
    confirmationStatus: 'pending',
  },
  {
    id: 'reg-3',
    contact: { name: 'Agus Hartono', company: 'PT Lain' },
    channel: 'whatsapp',
    ticketSentAt: null,
    confirmationStatus: 'waitlisted',
  },
]

describe('ConfirmationTable', () => {
  it('renders all registration rows', () => {
    render(
      <ConfirmationTable
        registrations={sampleRegistrations}
        onResend={vi.fn()}
        onPromote={vi.fn()}
        isPending={false}
      />
    )
    expect(screen.getByText('Budi Santoso')).toBeTruthy()
    expect(screen.getByText('Siti Rahma')).toBeTruthy()
    expect(screen.getByText('Agus Hartono')).toBeTruthy()
  })

  it('shows "Kirim Ulang Tiket" for confirmed and pending rows', () => {
    render(
      <ConfirmationTable
        registrations={sampleRegistrations}
        onResend={vi.fn()}
        onPromote={vi.fn()}
        isPending={false}
      />
    )
    const resendBtns = screen.getAllByText('Kirim Ulang Tiket')
    expect(resendBtns.length).toBe(2) // confirmed + pending
  })

  it('shows "Promosi ke Approved" only for waitlisted', () => {
    render(
      <ConfirmationTable
        registrations={sampleRegistrations}
        onResend={vi.fn()}
        onPromote={vi.fn()}
        isPending={false}
      />
    )
    expect(screen.getByText('Promosi ke Approved')).toBeTruthy()
  })

  it('calls onResend when button clicked', async () => {
    const user = userEvent.setup()
    const onResend = vi.fn()
    render(
      <ConfirmationTable
        registrations={[sampleRegistrations[0]]}
        onResend={onResend}
        onPromote={vi.fn()}
        isPending={false}
      />
    )
    await user.click(screen.getByText('Kirim Ulang Tiket'))
    expect(onResend).toHaveBeenCalledWith('reg-1')
  })

  it('calls onPromote when button clicked', async () => {
    const user = userEvent.setup()
    const onPromote = vi.fn()
    render(
      <ConfirmationTable
        registrations={[sampleRegistrations[2]]}
        onResend={vi.fn()}
        onPromote={onPromote}
        isPending={false}
      />
    )
    await user.click(screen.getByText('Promosi ke Approved'))
    expect(onPromote).toHaveBeenCalledWith('reg-3')
  })

  it('shows empty state when no registrations', () => {
    render(
      <ConfirmationTable registrations={[]} onResend={vi.fn()} onPromote={vi.fn()} isPending={false} />
    )
    expect(screen.getByText(/Belum ada data/)).toBeTruthy()
  })
})
