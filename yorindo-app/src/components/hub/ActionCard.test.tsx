import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ActionCard } from './ActionCard'

describe('ActionCard', () => {
  it('shows "Belum ada blast" when blastCount = 0', async () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="bad" regHealth="good" blastCount={0} eventStatus="published" />)
    await waitFor(() => expect(screen.getByText('Belum ada blast')).toBeTruthy())
  })

  it('shows blast follow-up CTA when blastHealth = bad but blastCount > 0', async () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="bad" regHealth="good" blastCount={100} eventStatus="published" />)
    await waitFor(() => expect(screen.getByText('Konversi blast rendah')).toBeTruthy())
  })

  it('shows registration review CTA when regHealth = bad and blastHealth != bad', async () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="good" regHealth="bad" blastCount={200} eventStatus="published" />)
    await waitFor(() => expect(screen.getByText('Persetujuan tertunda')).toBeTruthy())
  })

  it('renders null when all health is good', () => {
    const { container } = render(
      <ActionCard baseHref="/app/events/1" blastHealth="good" regHealth="good" blastCount={200} eventStatus="published" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders null when all health is warn', () => {
    const { container } = render(
      <ActionCard baseHref="/app/events/1" blastHealth="warn" regHealth="warn" blastCount={200} eventStatus="published" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows disabled CTA when event is draft and blastCount = 0', async () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="bad" regHealth="good" blastCount={0} eventStatus="draft" />)
    await waitFor(() => expect(screen.getByText('Event belum dipublikasikan')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Kirim Undangan')).toBeDisabled())
  })
})
