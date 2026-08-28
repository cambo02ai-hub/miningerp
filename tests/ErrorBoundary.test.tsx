import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

function Buggy(): React.ReactNode {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders fallback on error', () => {
    render(
      <ErrorBoundary>
        <Buggy />
      </ErrorBoundary>
    )
    expect(screen.getByText('အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်')).toBeTruthy()
  })
})
