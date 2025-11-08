import { useRecoilState } from 'recoil'
import { appConfigAtom, DEFAULT_APP_CONFIG } from '@/state/atoms'

function mergeConfig(defaults, overrides) {
  if (!overrides) {
    return defaults
  }

  const result = Array.isArray(defaults) ? [...defaults] : { ...defaults }

  Object.entries(overrides).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeConfig(defaults?.[key] ?? {}, value)
    } else {
      result[key] = value
    }
  })

  return result
}

export function useAppConfig() {
  const [storedConfig, setStoredConfig] = useRecoilState(appConfigAtom)
  const mergedConfig = mergeConfig(DEFAULT_APP_CONFIG, storedConfig)
  return [mergedConfig, setStoredConfig]
}
 
