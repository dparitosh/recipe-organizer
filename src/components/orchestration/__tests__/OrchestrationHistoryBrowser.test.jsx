import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import { OrchestrationHistoryBrowser } from '../../../components/orchestration/OrchestrationHistoryBrowser'
import * as orchestrationService from '../../../lib/services/orchestration-service'

// Mock the orchestration service
vi.mock('../../../lib/services/orchestration-service', () => ({
  listRuns: vi.fn(),
  getRunDetails: vi.fn(),
}))

const mockRuns = [
  {
    runId: 'orch_test123',
    status: 'success',
    timestamp: '2025-11-18T10:30:00Z',
    totalDuration: 45.2,
    recipeName: 'Sports Drink v1',
    agentCount: 5,
    successCount: 5,
  },
  {
    runId: 'orch_test456',
    status: 'partial',
    timestamp: '2025-11-17T15:20:00Z',
    totalDuration: 52.8,
    recipeName: 'Protein Bar v2',
    agentCount: 5,
    successCount: 4,
  },
]

const mockRunDetail = {
  run: { runId: 'orch_test123', status: 'success', timestamp: '2025-11-18T10:30:00Z' },
  recipe: { name: 'Sports Drink v1' },
  agents: [],
}

describe('OrchestrationHistoryBrowser', () => {
  const mockOnSelectRun = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    orchestrationService.listRuns.mockResolvedValue(mockRuns)
    orchestrationService.getRunDetails.mockResolvedValue(mockRunDetail)
  })

  it('renders loading state initially', () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )
    
    expect(screen.getByText(/loading orchestration history/i)).toBeInTheDocument()
  })

  it('loads and displays orchestration runs', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('Sports Drink v1')).toBeInTheDocument()
      expect(screen.getByText('Protein Bar v2')).toBeInTheDocument()
    })

    expect(orchestrationService.listRuns).toHaveBeenCalledWith({
      status: 'all',
      limit: 50,
      offset: 0,
    })
  })

  it('displays correct status badges', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      const successBadges = screen.getAllByText('success')
      const partialBadges = screen.getAllByText('partial')
      
      expect(successBadges.length).toBeGreaterThan(0)
      expect(partialBadges.length).toBeGreaterThan(0)
    })
  })

  it('filters by status when filter button clicked', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('Sports Drink v1')).toBeInTheDocument()
    })

    const successButton = screen.getByRole('button', { name: /success/i })
    fireEvent.click(successButton)

    await waitFor(() => {
      expect(orchestrationService.listRuns).toHaveBeenCalledWith({
        status: 'success',
        limit: 50,
        offset: 0,
      })
    })
  })

  it('calls onSelectRun when View button clicked', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('Sports Drink v1')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /view/i })
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(orchestrationService.getRunDetails).toHaveBeenCalledWith('orch_test123')
      expect(mockOnSelectRun).toHaveBeenCalledWith(mockRunDetail)
    })
  })

  it('displays error state when loading fails', async () => {
    orchestrationService.listRuns.mockRejectedValue(new Error('Network error'))

    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/error loading orchestration history/i)).toBeInTheDocument()
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('displays empty state when no runs found', async () => {
    orchestrationService.listRuns.mockResolvedValue([])

    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/no orchestration runs found/i)).toBeInTheDocument()
    })
  })

  it('displays agent count correctly', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('5/5')).toBeInTheDocument()
      expect(screen.getByText('4/5')).toBeInTheDocument()
    })
  })

  it('truncates run ID to 8 characters', async () => {
    render(
      <RecoilRoot>
        <OrchestrationHistoryBrowser onSelectRun={mockOnSelectRun} />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText('orch_tes')).toBeInTheDocument()
    })
  })
})
