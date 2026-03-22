import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiScoreBadge } from './AiScoreBadge'

describe('AiScoreBadge', () => {
  it('shows green ✓ for score ≥ 80', () => {
    render(<AiScoreBadge score={92} />)
    const badge = screen.getByText(/✓/)
    expect(badge.className).toContain('text-green-700')
  })

  it('shows amber ~ for score 50–79', () => {
    render(<AiScoreBadge score={61} />)
    const badge = screen.getByText(/~/)
    expect(badge.className).toContain('text-amber-700')
  })

  it('shows red ✗ for score < 50', () => {
    render(<AiScoreBadge score={34} />)
    const badge = screen.getByText(/✗/)
    expect(badge.className).toContain('text-red-700')
  })

  it('shows loading state for in-progress', () => {
    render(<AiScoreBadge score={0} status="in-progress" />)
    expect(screen.getByText(/Menilai/)).toBeTruthy()
  })

  it('shows failed state', () => {
    render(<AiScoreBadge score={0} status="failed" />)
    expect(screen.getByText(/Gagal/)).toBeTruthy()
  })

  it('has aria-label with score and level', () => {
    render(<AiScoreBadge score={85} />)
    const badge = screen.getByLabelText(/Skor AI: 85/)
    expect(badge).toBeTruthy()
  })
})
