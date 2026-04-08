import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConfirmationStats } from './ConfirmationStats'

describe('ConfirmationStats', () => {
  it('renders all 3 stat cards with values', async () => {
    render(
      <ConfirmationStats
        ticketSent={180}
        pendingConfirmation={45}
        waitlisted={20}
        isLoading={false}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('180')).toBeTruthy()
      expect(screen.getByText('45')).toBeTruthy()
      expect(screen.getByText('20')).toBeTruthy()
    })
  })

  it('shows labels for each stat', async () => {
    render(
      <ConfirmationStats
        ticketSent={0}
        pendingConfirmation={0}
        waitlisted={0}
        isLoading={false}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('Tiket Terkirim')).toBeTruthy()
      expect(screen.getByText('Menunggu Konfirmasi')).toBeTruthy()
      expect(screen.getByText('Daftar Tunggu')).toBeTruthy()
    })
  })

  it('renders skeletons when loading', async () => {
    const { container } = render(
      <ConfirmationStats ticketSent={0} pendingConfirmation={0} waitlisted={0} isLoading={true} />
    )
    await waitFor(() => {
      expect(container.querySelectorAll('[class*="skeleton"], [class*="animate"]').length).toBeGreaterThan(0)
    })
  })
})
