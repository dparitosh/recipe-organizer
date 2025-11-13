import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { envService } from '../env-service.js'

const DEFAULT_TEST_CONFIG = {
  uri: 'neo4j+s://demo.databases.neo4j.io',
  username: 'neo4j',
  password: 'secret',
  database: 'neo4j',
}

describe('EnvironmentService connection helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    envService.setBackendUrl('http://localhost:9999')
    envService.setApiKey('primary-key')
    envService.setAdminApiKey('admin-key')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('posts credentials to the neo4j health endpoint with auth headers', async () => {
    const payload = { ...DEFAULT_TEST_CONFIG }
    const responseBody = { success: true, server_version: '5.15' }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseBody),
    })
    globalThis.fetch = fetchMock

    const result = await envService.testNeo4jConnection(payload)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:9999/api/health/neo4j')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['X-API-Key']).toBe('primary-key')
    expect(options.headers['X-Admin-API-Key']).toBe('admin-key')
    expect(JSON.parse(options.body)).toEqual(payload)
    expect(result).toEqual(responseBody)
  })

  it('throws a descriptive error when the backend rejects the connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Unauthorized' }),
      text: () => Promise.resolve(''),
    })
    globalThis.fetch = fetchMock

    await expect(envService.testNeo4jConnection(DEFAULT_TEST_CONFIG)).rejects.toThrow('Unauthorized')
  })
})
