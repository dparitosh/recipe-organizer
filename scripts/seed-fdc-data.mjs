#!/usr/bin/env node
import process from 'node:process'

if (typeof fetch !== 'function') {
  throw new Error('Node fetch API is unavailable. Use Node 18+ or enable experimental fetch support.')
}

const argv = new Map()
for (const arg of process.argv.slice(2)) {
  const [rawKey, ...rest] = arg.split('=')
  const key = rawKey.replace(/^--/, '').toLowerCase()
  const value = rest.length > 0 ? rest.join('=') : 'true'
  argv.set(key, value)
}

const backendUrl = (argv.get('backend-url') || process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')
const apiKey = argv.get('api-key') || process.env.FDC_API_KEY || process.env.FDC_DEFAULT_API_KEY

if (!apiKey) {
  console.error('✖ Provide an FDC API key via --api-key argument or FDC_API_KEY environment variable.')
  process.exit(1)
}

const batches = [
  { term: 'apple', count: 10 },
  { term: 'broccoli', count: 10 },
  { term: 'chicken breast', count: 10 },
  { term: 'milk', count: 10 },
  { term: 'olive oil', count: 6 },
]

async function quickIngest({ term, count }) {
  const response = await fetch(`${backendUrl}/api/fdc/quick-ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      search_term: term,
      count,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Quick ingest failed for "${term}" (${response.status}): ${detail}`)
  }

  const payload = await response.json()
  return payload
}

(async () => {
  console.log(`→ Seeding USDA FDC data via ${backendUrl}`)

  for (const batch of batches) {
    console.log(`  • Ingesting ${batch.count} foods for "${batch.term}"`)
    try {
      const result = await quickIngest(batch)
      console.log(
        `    ✓ Success: ${result.success_count} ingested, ${result.failure_count} failed (nodes: ${result.summary?.neo4j_nodes_created ?? 0})`
      )
    } catch (error) {
      console.error(`    ✖ ${error.message}`)
    }
  }

  console.log('✔ FDC seeding routine finished')
})().catch((error) => {
  console.error('✖ Seed script error:', error)
  process.exit(1)
})
