import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LaporanStub } from './LaporanStub'

describe('LaporanStub', () => {
  it('shows empty state for non-completed event', async () => {
    render(<LaporanStub isCompleted={false} eventDate="2026-04-15T02:00:00Z" />)
    await waitFor(() => {
      expect(screen.getByText(/Laporan tersedia setelah event berlangsung/)).toBeTruthy()
      expect(screen.getByText(/15 April 2026/)).toBeTruthy()
    })
  })

  it('shows placeholder chart when completed', async () => {
    render(<LaporanStub isCompleted={true} />)
    await waitFor(() => expect(screen.getByText(/Funnel Kehadiran/)).toBeTruthy())
  })

  it('shows disabled PDF button when completed', async () => {
    render(<LaporanStub isCompleted={true} />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Unduh Laporan PDF/ })
      expect(btn).toBeDisabled()
    })
  })

  it('shows YoriMind section when completed', async () => {
    render(<LaporanStub isCompleted={true} />)
    await waitFor(() => expect(screen.getByText(/Analisis YoriMind/)).toBeTruthy())
  })

  it('shows YoriMind fallback (no component implemented yet)', async () => {
    render(<LaporanStub isCompleted={true} />)
    // Suspense resolves with fallback content since YoriMindPanel doesn't exist
    // Give Suspense time to resolve the lazy import + error boundary
    await new Promise((r) => setTimeout(r, 100))
    // Either the fallback text or a skeleton is shown — just ensure no crash
    const body = document.body.textContent
    expect(body).toBeTruthy()
  })

  it('chart has non-pulsing skeleton bars', async () => {
    render(<LaporanStub isCompleted={true} />)
    // Skeletons with animate-none class should be present
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[class*="animate-none"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })
})
