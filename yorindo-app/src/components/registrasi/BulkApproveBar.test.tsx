import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BulkApproveBar } from './BulkApproveBar'

const defaultProps = {
  aiRecommendedCount: 42,
  aiScoringStatus: 'complete' as const,
  selectedCount: 0,
  onBulkApprove: vi.fn(),
  aiRecommendedIds: ['reg-001', 'reg-002'],
  selectedIds: [],
}

describe('BulkApproveBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows AI recommendation count', () => {
    render(<BulkApproveBar {...defaultProps} />)
    expect(screen.getByText(/42/)).toBeTruthy()
  })

  it('first click → confirm state with countdown', () => {
    render(<BulkApproveBar {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/Konfirmasi\?/)).toBeTruthy()
  })

  it('second click fires onBulkApprove with AI IDs', () => {
    const onBulkApprove = vi.fn()
    render(<BulkApproveBar {...defaultProps} onBulkApprove={onBulkApprove} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onBulkApprove).toHaveBeenCalledWith(['reg-001', 'reg-002'])
  })

  it('3s timeout resets button to idle without firing', () => {
    const onBulkApprove = vi.fn()
    render(<BulkApproveBar {...defaultProps} onBulkApprove={onBulkApprove} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/Konfirmasi\?/)).toBeTruthy()
    act(() => vi.advanceTimersByTime(3100))
    expect(screen.queryByText(/Konfirmasi\?/)).toBeNull()
    expect(onBulkApprove).not.toHaveBeenCalled()
  })

  it('shows manual mode label when selectedCount > 0', () => {
    render(<BulkApproveBar {...defaultProps} selectedCount={5} selectedIds={['a','b','c','d','e']} />)
    // Text is split by <strong> — check via span content
    expect(screen.getAllByText((_, el) => el?.textContent === '5 baris dipilih').length).toBeGreaterThan(0)
    expect(screen.getByText(/Setujui 5/)).toBeTruthy()
  })

  it('shows AI scoring in-progress state', () => {
    render(
      <BulkApproveBar
        {...defaultProps}
        aiScoringStatus="in-progress"
        aiScoringProgress={{ done: 20, total: 62 }}
      />
    )
    expect(screen.getByText(/Penilaian AI/)).toBeTruthy()
  })

  it('button disabled when count is 0', () => {
    render(<BulkApproveBar {...defaultProps} aiRecommendedCount={0} aiRecommendedIds={[]} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
