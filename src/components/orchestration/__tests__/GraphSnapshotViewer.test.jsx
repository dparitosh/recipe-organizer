import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GraphSnapshotViewer } from '../../../components/orchestration/GraphSnapshotViewer'

// Mock Cytoscape
vi.mock('cytoscape', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    zoom: vi.fn(),
    center: vi.fn(),
    fit: vi.fn(),
    destroy: vi.fn(),
    nodes: vi.fn(() => ({
      unselect: vi.fn(),
    })),
    $: vi.fn(() => ({
      select: vi.fn(),
      data: vi.fn(() => ({
        id: 'node1',
        label: 'Test Node',
        type: 'Formulation',
      })),
    })),
  })),
}))

const mockGraphData = {
  nodes: [
    { id: '1', label: 'Formulation 1', type: 'Formulation', properties: { name: 'Test' } },
    { id: '2', label: 'Water', type: 'Ingredient', properties: { percentage: 85 } },
    { id: '3', label: 'Sugar', type: 'Ingredient', properties: { percentage: 10 } },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', type: 'CONTAINS' },
    { id: 'e2', source: '1', target: '3', type: 'CONTAINS' },
  ],
}

describe('GraphSnapshotViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders graph container', () => {
    render(<GraphSnapshotViewer graphData={mockGraphData} />)
    
    const container = screen.getByTestId('cytoscape-container') || 
                     document.querySelector('[style*="height"]')
    expect(container).toBeTruthy()
  })

  it('displays empty state when no graph data', () => {
    render(<GraphSnapshotViewer graphData={null} />)
    
    expect(screen.getByText(/no graph data available/i)).toBeInTheDocument()
  })

  it('displays empty state when nodes array is empty', () => {
    render(<GraphSnapshotViewer graphData={{ nodes: [], edges: [] }} />)
    
    expect(screen.getByText(/no graph data available/i)).toBeInTheDocument()
  })

  it('renders legend with node types', () => {
    render(<GraphSnapshotViewer graphData={mockGraphData} />)
    
    expect(screen.getByText(/formulation/i)).toBeInTheDocument()
    expect(screen.getByText(/ingredient/i)).toBeInTheDocument()
  })

  it('displays zoom controls', () => {
    render(<GraphSnapshotViewer graphData={mockGraphData} />)
    
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i }) ||
                        screen.getByText('+')
    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i }) ||
                         screen.getByText('−')
    
    expect(zoomInButton).toBeInTheDocument()
    expect(zoomOutButton).toBeInTheDocument()
  })

  it('handles graph with only nodes (no edges)', () => {
    const graphWithNoEdges = {
      nodes: mockGraphData.nodes,
      edges: [],
    }

    const { container } = render(<GraphSnapshotViewer graphData={graphWithNoEdges} />)
    expect(container).toBeTruthy()
  })

  it('displays correct node count in legend', () => {
    render(<GraphSnapshotViewer graphData={mockGraphData} />)
    
    // Should show count of different node types
    expect(screen.getByText(/3/)).toBeInTheDocument() // Total nodes or specific type count
  })
})
