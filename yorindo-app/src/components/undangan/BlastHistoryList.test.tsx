import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlastHistoryList, type BlastRecord } from './BlastHistoryList'

const sampleBlasts: BlastRecord[] = [
  {
    id: '1',
    channel: 'whatsapp',
    recipientCount: 312,
    sentAt: '2026-03-20T09:00:00Z',
    status: 'completed',
  },
  {
    id: '2',
    channel: 'email',
    recipientCount: 89,
    sentAt: '2026-03-18T14:30:00Z',
    status: 'failed',
  },
]

describe('BlastHistoryList', () => {
  it('renders blast records with channel and count', async () => {
    render(<BlastHistoryList blasts={sampleBlasts} isLoading={false} onKirimUndangan={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('whatsapp')).toBeTruthy()
      expect(screen.getByText(/312/)).toBeTruthy()
      expect(screen.getByText(/89/)).toBeTruthy()
    })
  })

  it('shows status badges', async () => {
    render(<BlastHistoryList blasts={sampleBlasts} isLoading={false} onKirimUndangan={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Selesai')).toBeTruthy()
      expect(screen.getByText('Gagal')).toBeTruthy()
    })
  })

  it('shows empty state when no blasts', async () => {
    render(<BlastHistoryList blasts={[]} isLoading={false} onKirimUndangan={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/Belum ada undangan terkirim/)).toBeTruthy())
  })

  it('calls onKirimUndangan from empty state CTA', async () => {
    const user = userEvent.setup()
    const onKirim = vi.fn()
    render(<BlastHistoryList blasts={[]} isLoading={false} onKirimUndangan={onKirim} />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Kirim Undangan/i })
      expect(btn).toBeTruthy()
    })
    await user.click(screen.getByRole('button', { name: /Kirim Undangan/i }))
    expect(onKirim).toHaveBeenCalledOnce()
  })

  it('shows loading skeletons', async () => {
    const { container } = render(
      <BlastHistoryList blasts={undefined} isLoading={true} onKirimUndangan={vi.fn()} />
    )
    // Skeletons render as divs; check container is not empty
    await waitFor(() => expect(container.firstChild).toBeTruthy())
  })
})
