import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import Navigation from '../components/Navigation'

describe('Navigation', () => {
  it('renders main navigation with role', () => {
    // Mock window.matchMedia for dark mode detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    )
    expect(screen.getByRole('navigation')).toBeTruthy()
    expect(screen.getByText('GIS & 3D Gold Vein Prediction')).toBeInTheDocument()
  })
})
