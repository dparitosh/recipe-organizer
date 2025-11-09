import fs from 'fs'

const data = fs.readFileSync('tmp-graph-output.json', 'utf8')
console.log('length', data.length)
try {
  JSON.parse(data)
  console.log('parsed ok')
} catch (error) {
  console.error('parse error:', error.message)
  const positionMatch = error.message.match(/at position (\d+)/)
  const pos = positionMatch ? Number(positionMatch[1]) : 0
  const start = Math.max(0, pos - 120)
  const end = Math.min(data.length, pos + 120)
  console.error('context:', data.slice(start, end))
  console.error('char codes:',
    data
      .slice(Math.max(0, pos - 5), Math.min(data.length, pos + 5))
      .split('')
      .map((ch) => ch.charCodeAt(0))
      .join(', ')
  )
}
