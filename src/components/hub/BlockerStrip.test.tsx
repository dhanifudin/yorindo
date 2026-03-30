import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlockerStrip } from './BlockerStrip'

describe('BlockerStrip', () => {
  it('is hidden when no items', () => {
    const { container } = render(<BlockerStrip items={[]} />)
    const strip = container.firstElementChild
    expect(strip?.className).toContain('hidden')
  })

  it('renders ghost buttons when items present', () => {
    render(
      <BlockerStrip
        items={[
          { id: '1', label: '5 pendaftar menunggu', onClick: vi.fn() },
          { id: '2', label: 'Cek laporan', onClick: vi.fn() },
        ]}
      />,
    )
    expect(screen.getByText('5 pendaftar menunggu')).toBeTruthy()
    expect(screen.getByText('Cek laporan')).toBeTruthy()
  })

  it('has role="status" and aria-live="polite"', () => {
    const { container } = render(<BlockerStrip items={[]} />)
    const strip = container.firstElementChild
    expect(strip?.getAttribute('role')).toBe('status')
    expect(strip?.getAttribute('aria-live')).toBe('polite')
  })

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn()
    render(<BlockerStrip items={[{ id: '1', label: 'Click me', onClick }]} />)
    fireEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('strip is visible (no hidden class) when items present', () => {
    const { container } = render(
      <BlockerStrip items={[{ id: '1', label: 'Item', onClick: vi.fn() }]} />,
    )
    const strip = container.firstElementChild
    expect(strip?.className).not.toContain('hidden')
  })
})
