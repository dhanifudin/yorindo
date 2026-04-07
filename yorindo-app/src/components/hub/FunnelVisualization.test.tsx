import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FunnelVisualization } from './FunnelVisualization'

const defaultProps = {
  blastCount: 2000,
  registrationCount: 400,
  approvedCount: 280,
  attendedCount: 0,
  eventStatus: 'published' as const,
  eventId: 'event-001',
}

describe('FunnelVisualization', () => {
  it('renders all 4 stage labels', async () => {
    render(<FunnelVisualization {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Diundang')).toBeTruthy()
      expect(screen.getByText('Mendaftar')).toBeTruthy()
      expect(screen.getByText('Disetujui')).toBeTruthy()
      expect(screen.getByText('Hadir')).toBeTruthy()
    })
  })

  it('renders count values', async () => {
    render(<FunnelVisualization {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('2.000')).toBeTruthy()  // id-ID locale
      expect(screen.getByText('400')).toBeTruthy()
      expect(screen.getByText('280')).toBeTruthy()
      expect(screen.getByText('0')).toBeTruthy()
    })
  })

  it('shows "Kirim undangan" CTA when blastCount = 0', async () => {
    render(<FunnelVisualization {...defaultProps} blastCount={0} />)
    await waitFor(() => expect(screen.getByText('Kirim undangan')).toBeTruthy())
  })

  it('does NOT show CTA when blastCount > 0', async () => {
    render(<FunnelVisualization {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText('Kirim undangan')).toBeNull())
  })

  it('renders role="meter" for each bar', async () => {
    render(<FunnelVisualization {...defaultProps} />)
    await waitFor(() => {
      const meters = screen.getAllByRole('meter')
      expect(meters.length).toBe(4)
    })
  })
})

describe('ConversionBadge health computation (via getHealth)', () => {
  // Import from benchmarks and test directly
  it('20% blast→registration = good', async () => {
    const { getHealth } = await import('@/lib/benchmarks')
    expect(getHealth(0.20, 'blastToRegistration')).toBe('good')
  })

  it('15% blast→registration = warn', async () => {
    const { getHealth } = await import('@/lib/benchmarks')
    expect(getHealth(0.15, 'blastToRegistration')).toBe('warn')
  })

  it('5% blast→registration = bad', async () => {
    const { getHealth } = await import('@/lib/benchmarks')
    expect(getHealth(0.05, 'blastToRegistration')).toBe('bad')
  })

  it('70% registration→approval = good', async () => {
    const { getHealth } = await import('@/lib/benchmarks')
    expect(getHealth(0.70, 'registrationToApproval')).toBe('good')
  })

  it('45% registration→approval = bad', async () => {
    const { getHealth } = await import('@/lib/benchmarks')
    expect(getHealth(0.45, 'registrationToApproval')).toBe('bad')
  })
})
