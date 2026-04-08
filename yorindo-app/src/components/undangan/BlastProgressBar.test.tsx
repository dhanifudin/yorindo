import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BlastProgressBar, type BlastJobStatus } from './BlastProgressBar'

describe('BlastProgressBar', () => {
  it('renders null when no job', () => {
    const { container } = render(<BlastProgressBar job={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when job is completed', () => {
    const job: BlastJobStatus = { jobId: '1', status: 'completed', sent: 100, total: 100 }
    const { container } = render(<BlastProgressBar job={job} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when job is failed', () => {
    const job: BlastJobStatus = { jobId: '1', status: 'failed', sent: 50, total: 100 }
    const { container } = render(<BlastProgressBar job={job} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows progress bar when job is running', async () => {
    const job: BlastJobStatus = { jobId: '1', status: 'running', sent: 50, total: 100 }
    render(<BlastProgressBar job={job} />)
    await waitFor(() => expect(screen.getByText(/50%/)).toBeTruthy())
  })

  it('shows queued label when status is queued', async () => {
    const job: BlastJobStatus = { jobId: '1', status: 'queued', sent: 0, total: 247 }
    render(<BlastProgressBar job={job} />)
    await waitFor(() => expect(screen.getByText(/antrian/i)).toBeTruthy())
  })

  it('renders progressbar role', async () => {
    const job: BlastJobStatus = { jobId: '1', status: 'running', sent: 75, total: 100 }
    render(<BlastProgressBar job={job} />)
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeTruthy())
  })
})
