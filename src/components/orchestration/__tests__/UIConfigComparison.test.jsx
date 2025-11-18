import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import { UIConfigComparison } from '../../../components/orchestration/UIConfigComparison'

// Mock fetch
global.fetch = vi.fn()

const mockRuns = [
  {
    runId: 'orch_run1',
    status: 'success',
    timestamp: '2025-11-18T10:00:00Z',
    recipeName: 'Test Recipe 1',
  },
  {
    runId: 'orch_run2',
    status: 'success',
    timestamp: '2025-11-17T10:00:00Z',
    recipeName: 'Test Recipe 2',
  },
]

const mockUIConfig1 = {
  theme: {
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
    },
    typography: {
      fontFamily: 'Inter',
    },
  },
  layout: {
    type: 'grid',
    columns: 12,
  },
  components: [
    { type: 'Card', title: 'Overview', variant: 'default' },
    { type: 'Button', title: 'Submit', variant: 'primary' },
  ],
}

const mockUIConfig2 = {
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
    },
    typography: {
      fontFamily: 'Inter',
    },
  },
  layout: {
    type: 'flex',
    columns: 12,
  },
  components: [
    { type: 'Card', title: 'Overview', variant: 'default' },
    { type: 'Input', title: 'Name', variant: 'default' },
  ],
}

describe('UIConfigComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/orchestration/runs?')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRuns,
        })
      }
      if (url.includes('/orch_run1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ uiConfig: mockUIConfig1 }),
        })
      }
      if (url.includes('/orch_run2')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ uiConfig: mockUIConfig2 }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  it('renders comparison interface', () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )
    
    expect(screen.getByText(/ui config comparison/i)).toBeInTheDocument()
  })

  it('loads orchestration runs on mount', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orchestration/runs'),
        expect.any(Object)
      )
    })
  })

  it('displays run selectors', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('auto-selects latest 2 runs', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orch_run1'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orch_run2'),
        expect.any(Object)
      )
    })
  })

  it('displays color palette comparison', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/color palette/i)).toBeInTheDocument()
      expect(screen.getByText(/primary/i)).toBeInTheDocument()
    })
  })

  it('highlights color differences', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      // Primary colors are different: #0ea5e9 vs #3b82f6
      const colorCells = screen.getAllByText(/#[0-9a-f]{6}/i)
      expect(colorCells.length).toBeGreaterThan(0)
    })
  })

  it('displays component comparison', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/components/i)).toBeInTheDocument()
      expect(screen.getByText(/card/i)).toBeInTheDocument()
    })
  })

  it('shows component presence indicators', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      // Button present in config1 but not config2
      // Input present in config2 but not config1
      const checkmarks = screen.getAllByText('✓')
      const crosses = screen.getAllByText('✗')
      
      expect(checkmarks.length).toBeGreaterThan(0)
      expect(crosses.length).toBeGreaterThan(0)
    })
  })

  it('exports comparison to JSON when button clicked', async () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.createObjectURL = mockCreateObjectURL
    
    const mockLink = {
      click: vi.fn(),
      setAttribute: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/color palette/i)).toBeInTheDocument()
    })

    const exportButton = screen.getByRole('button', { name: /export json/i })
    fireEvent.click(exportButton)

    expect(mockLink.click).toHaveBeenCalled()
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringContaining('comparison'))
  })

  it('displays layout differences', async () => {
    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      // Config1 has 'grid', config2 has 'flex'
      expect(screen.getByText(/grid/i)).toBeInTheDocument()
      expect(screen.getByText(/flex/i)).toBeInTheDocument()
    })
  })

  it('handles loading state', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    render(
      <RecoilRoot>
        <UIConfigComparison />
      </RecoilRoot>
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
