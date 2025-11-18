import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UIMetricsDashboard } from '../../../components/orchestration/UIMetricsDashboard'

const mockUIConfig = {
  layout: {
    type: 'grid',
    sections: ['header', 'content', 'footer'],
    columns: 12,
    gridSystem: 'CSS Grid',
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
    },
  },
  theme: {
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#f59e0b',
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      baseFontSize: '16px',
      headingScale: 1.25,
    },
    spacing: {
      base: 4,
      scale: 1.5,
    },
  },
  components: [
    { type: 'Card', title: 'Overview', variant: 'default', position: { row: 1, col: 1 } },
    { type: 'Button', title: 'Submit', variant: 'primary', position: { row: 2, col: 1 } },
    { type: 'Input', title: 'Name', variant: 'default', position: { row: 3, col: 1 } },
  ],
  accessibility: {
    wcagLevel: 'AA',
    features: ['keyboard-navigation', 'screen-reader-support', 'high-contrast-mode'],
    contrastRatios: {
      normalText: 4.5,
      largeText: 3.0,
    },
  },
  performance: {
    bundleSize: '245kb',
    loadTime: '1.2s',
    renderTime: '0.3s',
  },
}

describe('UIMetricsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with UI config data', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/ui metrics dashboard/i)).toBeInTheDocument()
  })

  it('displays layout information', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/layout/i)).toBeInTheDocument()
    expect(screen.getByText(/grid/i)).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('displays theme colors with swatches', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/theme/i)).toBeInTheDocument()
    expect(screen.getByText(/primary/i)).toBeInTheDocument()
    expect(screen.getByText('#0ea5e9')).toBeInTheDocument()
    expect(screen.getByText('#64748b')).toBeInTheDocument()
  })

  it('renders color swatches as visual elements', () => {
    const { container } = render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    // Check for color swatch elements with background colors
    const swatches = container.querySelectorAll('[style*="background"]')
    expect(swatches.length).toBeGreaterThan(0)
  })

  it('displays typography settings', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/typography/i)).toBeInTheDocument()
    expect(screen.getByText(/Inter/i)).toBeInTheDocument()
    expect(screen.getByText(/16px/)).toBeInTheDocument()
  })

  it('displays component inventory', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/components/i)).toBeInTheDocument()
    expect(screen.getByText(/card/i)).toBeInTheDocument()
    expect(screen.getByText(/button/i)).toBeInTheDocument()
    expect(screen.getByText(/input/i)).toBeInTheDocument()
  })

  it('shows component count', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/3/)).toBeInTheDocument() // 3 total components
  })

  it('displays component variants as badges', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/default/i)).toBeInTheDocument()
    expect(screen.getByText(/primary/i)).toBeInTheDocument()
  })

  it('displays accessibility information', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/accessibility/i)).toBeInTheDocument()
    expect(screen.getByText(/WCAG/i)).toBeInTheDocument()
    expect(screen.getByText(/AA/)).toBeInTheDocument()
  })

  it('displays accessibility features list', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/keyboard-navigation/i)).toBeInTheDocument()
    expect(screen.getByText(/screen-reader-support/i)).toBeInTheDocument()
  })

  it('displays contrast ratios', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/4.5/)).toBeInTheDocument()
    expect(screen.getByText(/3.0/)).toBeInTheDocument()
  })

  it('displays performance metrics when available', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/performance/i)).toBeInTheDocument()
    expect(screen.getByText(/245kb/i)).toBeInTheDocument()
    expect(screen.getByText(/1.2s/i)).toBeInTheDocument()
  })

  it('displays breakpoints', () => {
    render(<UIMetricsDashboard uiConfig={mockUIConfig} />)
    
    expect(screen.getByText(/640px/)).toBeInTheDocument()
    expect(screen.getByText(/768px/)).toBeInTheDocument()
    expect(screen.getByText(/1024px/)).toBeInTheDocument()
  })

  it('handles missing sections gracefully', () => {
    const minimalConfig = {
      layout: { type: 'flex' },
    }

    const { container } = render(<UIMetricsDashboard uiConfig={minimalConfig} />)
    expect(container).toBeTruthy()
  })

  it('displays empty state when no UI config provided', () => {
    render(<UIMetricsDashboard uiConfig={null} />)
    
    expect(screen.getByText(/no ui config data available/i)).toBeInTheDocument()
  })

  it('handles undefined UI config', () => {
    render(<UIMetricsDashboard />)
    
    expect(screen.getByText(/no ui config data available/i)).toBeInTheDocument()
  })
})
