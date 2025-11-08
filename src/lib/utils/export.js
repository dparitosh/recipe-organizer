export function downloadJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCSV(data, filename) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const headers = Object.keys(data[0])
  const csvRows = []

  csvRows.push(headers.join(','))

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      const stringValue = value === null || value === undefined ? '' : String(value)
      return `"${stringValue.replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  const csvStr = csvRows.join('\n')
  const blob = new Blob([csvStr], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function flattenForExport(data) {
  return data.map((item) => {
    const flattened = {}

    const flatten = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key

        if (value === null || value === undefined) {
          flattened[newKey] = ''
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey)
        } else if (Array.isArray(value)) {
          flattened[newKey] = JSON.stringify(value)
        } else {
          flattened[newKey] = value
        }
      })
    }

    flatten(item)
    return flattened
  })
}

export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = parseCSVLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      data.push(row)
    }
  }

  return data
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}
