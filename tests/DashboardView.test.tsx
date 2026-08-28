import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardView from '../components/DashboardView'
import { formatNumber } from '../utils/locale'

// Mock the dashboardAPI
vi.mock('../services/api', () => ({
  dashboardAPI: {
    getStats: vi.fn(),
    getFleetStats: vi.fn(),
  },
}))

import { dashboardAPI } from '../services/api'

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing (shows loading state)', () => {
    const mockGetStats = vi.mocked(dashboardAPI.getStats)
    mockGetStats.mockReturnValue(new Promise(() => {})) // never resolves

    const { container } = render(<DashboardView />)
    expect(container).toBeTruthy()
    expect(screen.getByText('ဒက်ရှ်ဘုတ်ဒေတာ တင်နေပါသည်...')).toBeDefined()
  })

  it('shows stats after data loads', async () => {
    const mockGetStats = vi.mocked(dashboardAPI.getStats)
    const mockStats = {
      production: {
        totalCoal: 125000,
        totalOB: 850000,
        avgSR: 6.8,
        chartData: [
          { date: '2024-01', Coal: 15000, OB: 100000 },
          { date: '2024-02', Coal: 16000, OB: 110000 },
        ],
      },
      fleet: {
        availability: 85,
        total: 50,
        operational: 42,
      },
      inventory: {
        lowStockCount: 3,
        lowStockItems: [
          { id: '1', name: 'Oil Filter', partNumber: 'OF-001', currentStock: 2, minStockLevel: 10, unit: 'pcs' },
          { id: '2', name: 'Brake Pad', partNumber: 'BP-002', currentStock: 5, minStockLevel: 20, unit: 'pcs' },
        ],
      },
    }
    mockGetStats.mockResolvedValue(mockStats)

    render(<DashboardView />)

    // Wait for the stats to render
    expect(await screen.findByText('အုပ်ချုပ်မှု ဒက်ရှ်ဘုတ်')).toBeDefined()
    expect(screen.getByText(formatNumber(125000, 0))).toBeDefined()
    expect(screen.getByText(formatNumber(850000, 0))).toBeDefined()
    expect(screen.getByText('6.8')).toBeDefined()
    expect(screen.getByText('၈၅%')).toBeDefined()
    expect(screen.getByText('၃ သတိပေးချက်')).toBeDefined()
    expect(screen.getByText('Oil Filter')).toBeDefined()
    expect(screen.getByText('Brake Pad')).toBeDefined()
    // Stock Levels Healthy is hidden when alerts exist
    expect(screen.queryByText(/စတော့အဆင့် ကောင်းမွန်သည်/i)).toBeNull()
    // Verify alert section is shown
    expect(screen.getByText(/၃ သတိပေးချက်/i)).toBeDefined()
  })

  it('shows error state when API fails', async () => {
    const mockGetStats = vi.mocked(dashboardAPI.getStats)
    mockGetStats.mockRejectedValue(new Error('Network error'))

    render(<DashboardView />)

    expect(await screen.findByText('ဒက်ရှ်ဘုတ်ဒေတာ တင်ရာတွင် မအောင်မြင်ပါ')).toBeDefined()
    expect(screen.getByText('ထပ်မံကြိုးစားရန်')).toBeDefined()
  })

  it('shows no alert badge when there are no low stock items', async () => {
    const mockGetStats = vi.mocked(dashboardAPI.getStats)
    const mockStats = {
      production: { totalCoal: 0, totalOB: 0, avgSR: 0, chartData: [] },
      fleet: { availability: 0, total: 0, operational: 0 },
      inventory: { lowStockCount: 0, lowStockItems: [] },
    }
    mockGetStats.mockResolvedValue(mockStats)

    render(<DashboardView />)

    expect(await screen.findByText('စတော့အဆင့် ကောင်းမွန်သည်')).toBeDefined()
    expect(screen.queryByText(/သတိပေးချက်/)).toBeNull()
  })
})
