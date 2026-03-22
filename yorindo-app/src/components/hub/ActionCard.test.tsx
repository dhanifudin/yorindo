import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionCard } from './ActionCard'

describe('ActionCard', () => {
  it('shows "Belum ada blast" when blastCount = 0', () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="bad" regHealth="good" blastCount={0} />)
    expect(screen.getByText('Belum ada blast')).toBeTruthy()
  })

  it('shows blast follow-up CTA when blastHealth = bad but blastCount > 0', () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="bad" regHealth="good" blastCount={100} />)
    expect(screen.getByText('Konversi blast rendah')).toBeTruthy()
  })

  it('shows registration review CTA when regHealth = bad and blastHealth != bad', () => {
    render(<ActionCard baseHref="/app/events/1" blastHealth="good" regHealth="bad" blastCount={200} />)
    expect(screen.getByText('Persetujuan tertunda')).toBeTruthy()
  })

  it('renders null when all health is good', () => {
    const { container } = render(
      <ActionCard baseHref="/app/events/1" blastHealth="good" regHealth="good" blastCount={200} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders null when all health is warn', () => {
    const { container } = render(
      <ActionCard baseHref="/app/events/1" blastHealth="warn" regHealth="warn" blastCount={200} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
