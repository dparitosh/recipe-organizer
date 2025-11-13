import { describe, expect, it } from 'vitest'
import { FDCService } from '../fdc-service.js'

describe('FDCService API key handling', () => {
  it('returns override when provided', () => {
    const service = new FDCService()
    service.setApiKey('base-key')
    expect(service._resolveApiKey('override-key')).toBe('override-key')
  })

  it('uses stored key when no override provided', () => {
    const service = new FDCService()
    service.setApiKey('stored-key')
    expect(service._resolveApiKey()).toBe('stored-key')
  })

  it('returns undefined when key is masked placeholder', () => {
    const service = new FDCService({ apiKey: '********' })
    expect(service._resolveApiKey()).toBeUndefined()
    expect(service._resolveApiKey('********')).toBeUndefined()
  })

  it('throws when no key available anywhere', () => {
    const service = new FDCService()
    expect(() => service._resolveApiKey()).toThrow('FDC API key is not configured')
  })
})
