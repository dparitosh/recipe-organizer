import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import { NutritionLabelHistory } from '../../../components/nutrition/NutritionLabelHistory'

// Mock fetch
global.fetch = vi.fn()

const mockLabels = [
  {
    labelId: 'nutr_v2',
    version: 2,
    servingSize: 100.0,
    servingSizeUnit: 'g',
    calories: 250.0,
    nutrients: {
      protein: { name: 'Protein', amount: 10.0, unit: 'g' },
    },
    generatedAt: '2025-11-18T15:30:00Z',
  },
  {
    labelId: 'nutr_v1',
    version: 1,
    servingSize: 100.0,
    servingSizeUnit: 'g',
    calories: 245.0,
    nutrients: {
      protein: { name: 'Protein', amount: 9.5, unit: 'g' },
    },
    generatedAt: '2025-11-17T10:15:00Z',
  },
]

describe('NutritionLabelHistory', () => {
  const formulationId = 'form_123'

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ labels: mockLabels, total_labels: 2 }),
    })
  })

  it('renders loading state initially', () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('loads and displays nutrition labels', async () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument()
      expect(screen.getByText('v1')).toBeInTheDocument()
      expect(screen.getByText('250')).toBeInTheDocument()
      expect(screen.getByText('245')).toBeInTheDocument()
    })
  })

  it('displays change indicators for calories', async () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      // Version 2 has higher calories than version 1, should show increase indicator
      const increaseIndicators = screen.getAllByText('↑')
      expect(increaseIndicators.length).toBeGreaterThan(0)
    })
  })

  it('calls correct API endpoint', async () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/formulations/${formulationId}/nutrition-labels`),
        expect.any(Object)
      )
    })
  })

  it('handles API errors gracefully', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    })

    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no labels exist', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ labels: [], total_labels: 0 }),
    })

    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/no nutrition labels found/i)).toBeInTheDocument()
    })
  })

  it('opens comparison dialog when compare button clicked', async () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument()
    })

    const compareButtons = screen.getAllByRole('button', { name: /compare/i })
    fireEvent.click(compareButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/comparing version/i)).toBeInTheDocument()
    })
  })

  it('exports CSV when export button clicked', async () => {
    const mockCreateObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    
    const mockLink = {
      click: vi.fn(),
      setAttribute: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument()
    })

    const exportButton = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(exportButton)

    expect(mockLink.click).toHaveBeenCalled()
  })

  it('formats serving size correctly', async () => {
    render(
      <RecoilRoot>
        <NutritionLabelHistory formulationId={formulationId} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getAllByText('100g').length).toBeGreaterThan(0)
    })
  })
})
