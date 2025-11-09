import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { orchestrationService } from '../orchestration-service'
import { envService } from '../env-service'

const basePayload = {
  userRequest: 'Create a berry electrolyte drink',
  result: {
    id: 'orch-123',
    status: 'success',
    recipe: {},
    calculation: {},
    graph: {},
    validation: {},
    uiConfig: {},
    agentHistory: [],
    totalDuration: 1200,
    timestamp: '2025-11-09T12:00:00.000Z',
  },
}

describe('orchestrationService.persistRun', () => {
  beforeEach(() => {
    envService.setBackendUrl('http://mock.backend')
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('posts orchestration runs to the backend and returns the response body', async () => {
    const mockResponseBody = {
      runId: 'orch-123',
      nodesCreated: 10,
      relationshipsCreated: 12,
      propertiesSet: 48,
    }

    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue(mockResponseBody),
    })

    const result = await orchestrationService.persistRun(basePayload)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://mock.backend/api/orchestration/runs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(basePayload),
      })
    )

    expect(result).toEqual(mockResponseBody)
  })

  it('throws an error when the backend responds with a non-OK status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockResolvedValue({ detail: 'Failed to write orchestration run' }),
      text: vi.fn(),
    })

    await expect(orchestrationService.persistRun(basePayload)).rejects.toThrow(
      'Failed to write orchestration run'
    )
  })

  it('throws when required payload fields are missing', async () => {
    await expect(orchestrationService.persistRun({})).rejects.toThrow(
      'Persistence payload is missing required fields'
    )
  })
})
