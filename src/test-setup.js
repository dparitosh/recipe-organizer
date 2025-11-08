import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.clearAllMocks()
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
