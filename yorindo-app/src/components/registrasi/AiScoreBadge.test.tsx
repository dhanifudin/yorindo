import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AiScoreBadge } from './AiScoreBadge'

describe('AiScoreBadge', () => {
  it('shows green ✓ for score ≥ 80', async () => {
    render(<AiScoreBadge score={92} />)
    await waitFor(() => {
      const badge = screen.getByText(/✓/)
      expect(badge.className).toContain('text-green-700')
    })
  })

  it('shows amber ~ for score 50–79', async () => {
    render(<AiScoreBadge score={61} />)
    await waitFor(() => {
      const badge = screen.getByText(/~/)
      expect(badge.className).toContain('text-amber-700')
    })
  })

  it('shows red ✗ for score < 50', async () => {
    render(<AiScoreBadge score={34} />)
    await waitFor(() => {
      const badge = screen.getByText(/✗/)
      expect(badge.className).toContain('text-red-700')
    })
  })

  it('shows loading state for in-progress', async () => {
    render(<AiScoreBadge score={0} status="in-progress" />)
    await waitFor(() => expect(screen.getByText(/Menilai/)).toBeTruthy())
  })

  it('shows failed state', async () => {
    render(<AiScoreBadge score={0} status="failed" />)
    await waitFor(() => expect(screen.getByText(/Gagal/)).toBeTruthy())
  })

  it('has aria-label with score and level', async () => {
    render(<AiScoreBadge score={85} />)
    await waitFor(() => {
      const badge = screen.getByLabelText(/Skor AI: 85/)
      expect(badge).toBeTruthy()
    })
  })
})
