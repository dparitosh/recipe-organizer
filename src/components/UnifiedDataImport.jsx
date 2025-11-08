import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseCSV } from '@/lib/utils/export.js'
import { toast } from 'sonner'
import {
  Upload,
  ArrowsLeftRight,
  CheckCircle,
  Warning,
  Info,
  X
} from '@phosphor-icons/react'

const SCHEMA_FIELDS = [
  { value: 'id', label: 'Record ID', type: 'string', required: true },
  { value: 'name', label: 'Name', type: 'string', required: true },
  { value: 'description', label: 'Description', type: 'string', required: false },
  { value: 'category', label: 'Category', type: 'string', required: false },
  { value: 'type', label: 'Type', type: 'string', required: false },
  { value: 'quantity', label: 'Quantity', type: 'number', required: false },
  { value: 'unit', label: 'Unit', type: 'string', required: false },
  { value: 'cost', label: 'Cost', type: 'number', required: false },
  { value: 'supplier', label: 'Supplier', type: 'string', required: false },
  { value: 'status', label: 'Status', type: 'string', required: false },
  { value: 'date', label: 'Date', type: 'date', required: false },
  { value: 'isActive', label: 'Is Active', type: 'boolean', required: false },
  { value: 'notes', label: 'Notes', type: 'string', required: false }
]

const DATA_TYPE_LABELS = {
  string: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date'
}

const ACCEPTED_FORMATS = '.csv,.json,.xml,.xlsx,.xls'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(1)} ${units[exponent]}`
}

function parseXML(text) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'application/xml')
  const parserError = xmlDoc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Invalid XML format')
  }

  const records = []
  const rootElements = Array.from(xmlDoc.documentElement.children)

  rootElements.forEach((element) => {
    const record = {}
    Array.from(element.children).forEach((child) => {
      const key = child.tagName
      const value = child.textContent ?? ''
      if (record[key] === undefined) {
        record[key] = value
      } else if (Array.isArray(record[key])) {
        record[key].push(value)
      } else {
        record[key] = [record[key], value]
      }
    })

    if (Object.keys(record).length > 0) {
      records.push(record)
    }
  })

  return records
}

async function parseXLSX(file) {
  toast.info('Please convert Excel files to CSV before importing.')
  throw new Error('XLSX parsing not supported yet')
}

function autoMapColumns(columns) {
  const mappings = []
  const lowercaseColumns = columns.map((column) => column.toLowerCase())

  SCHEMA_FIELDS.forEach((field) => {
    const target = field.value.toLowerCase()
    const matchIndex = lowercaseColumns.findIndex((column) => {
      return column === target || column.includes(target) || target.includes(column)
    })

    if (matchIndex !== -1) {
      mappings.push({
        sourceColumn: columns[matchIndex],
        targetField: field.value,
        dataType: field.type
      })
    }
  })

  return mappings
}

function convertValue(value, dataType) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (dataType === 'number') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (dataType === 'boolean') {
    const normalized = String(value).toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }

  if (dataType === 'date') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  return String(value)
}

export function UnifiedDataImport({ backendUrl, onImportComplete }) {
  const [uploadedData, setUploadedData] = useState([])
  const [sourceColumns, setSourceColumns] = useState([])
  const [columnMappings, setColumnMappings] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [fileInfo, setFileInfo] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || 'Unknown'
    })

    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const text = e.target?.result
        if (typeof text !== 'string') {
          throw new Error('Unable to read file contents')
        }

        let parsedData = []

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(text)
          if (Array.isArray(jsonData)) {
            parsedData = jsonData
          } else if (jsonData && typeof jsonData === 'object') {
            const firstArrayKey = Object.keys(jsonData).find((key) => Array.isArray(jsonData[key]))
            parsedData = firstArrayKey ? jsonData[firstArrayKey] : [jsonData]
          } else {
            throw new Error('Invalid JSON format')
          }
        } else if (file.name.endsWith('.csv')) {
          parsedData = parseCSV(text)
        } else if (file.name.endsWith('.xml')) {
          parsedData = parseXML(text)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          parsedData = await parseXLSX(file)
        } else {
          throw new Error('Unsupported file format. Upload CSV, JSON, or XML files.')
        }

        if (!parsedData.length) {
          throw new Error('No data found in file')
        }

        const columns = Object.keys(parsedData[0])
        setUploadedData(parsedData)
        setSourceColumns(columns)
        setColumnMappings(autoMapColumns(columns))
        toast.success(`Loaded ${parsedData.length} records with ${columns.length} columns`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to parse file')
        setUploadedData([])
        setSourceColumns([])
        setColumnMappings([])
        setFileInfo(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }

    reader.readAsText(file)
  }

  const updateMapping = (sourceColumn, targetField) => {
    const schemaField = SCHEMA_FIELDS.find((field) => field.value === targetField)
    setColumnMappings((previous) => {
      const existing = previous.find((mapping) => mapping.sourceColumn === sourceColumn)
      if (existing) {
        return previous.map((mapping) =>
          mapping.sourceColumn === sourceColumn
            ? { ...mapping, targetField, dataType: schemaField?.type }
            : mapping
        )
      }

      return [
        ...previous,
        {
          sourceColumn,
          targetField,
          dataType: schemaField?.type
        }
      ]
    })
  }

  const removeMapping = (sourceColumn) => {
    setColumnMappings((previous) => previous.filter((mapping) => mapping.sourceColumn !== sourceColumn))
  }

  const transformData = () => {
    return uploadedData.map((row) => {
      const transformed = {}

      columnMappings.forEach((mapping) => {
        if (!mapping.targetField) return
        if (row[mapping.sourceColumn] === undefined) return

        const converted = convertValue(row[mapping.sourceColumn], mapping.dataType)
        if (converted !== undefined) {
          transformed[mapping.targetField] = converted
        }
      })

      return transformed
    })
  }

  const handleImport = async () => {
    if (!backendUrl) {
      toast.error('Backend URL is not configured')
      return
    }

    const requiredFields = SCHEMA_FIELDS.filter((field) => field.required).map((field) => field.value)
    const mappedFields = columnMappings.map((mapping) => mapping.targetField)
    const missingFields = requiredFields.filter((field) => !mappedFields.includes(field))

    if (missingFields.length) {
      toast.error(`Map all required fields: ${missingFields.join(', ')}`)
      return
    }

    const transformedData = transformData()
    if (!transformedData.length) {
      toast.error('No records to import')
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: transformedData.length })

    try {
      let successCount = 0

      for (let index = 0; index < transformedData.length; index++) {
        const record = transformedData[index]

        try {
          const response = await fetch(`${backendUrl}/api/data/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
          })

          if (response.ok) {
            successCount += 1
          } else {
            const message = await response.text()
            console.error('Import failed:', message)
          }
        } catch (error) {
          console.error('Import error:', error)
        }

        setImportProgress({ current: index + 1, total: transformedData.length })
      }

      toast.success(`Imported ${successCount} of ${transformedData.length} records`)
      if (onImportComplete) {
        onImportComplete(transformedData)
      }

      setUploadedData([])
      setSourceColumns([])
      setColumnMappings([])
      setFileInfo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
      setImportProgress((progress) => ({ ...progress, current: progress.total }))
    }
  }

  const unmappedColumns = sourceColumns.filter(
    (column) => !columnMappings.some((mapping) => mapping.sourceColumn === column)
  )

  const progressValue = importProgress.total
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={24} className="text-primary" weight="bold" />
          Unified Data Import
        </CardTitle>
        <CardDescription>
          Upload CSV, JSON, or XML files, map the columns to your schema, and import them into Neo4j
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload &amp; Map</TabsTrigger>
            <TabsTrigger value="guide">Import Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="data-file">Data File</Label>
              <Input
                ref={fileInputRef}
                id="data-file"
                type="file"
                accept={ACCEPTED_FORMATS}
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, JSON, XML &mdash; convert Excel files to CSV before importing
              </p>
            </div>

            {fileInfo && (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{fileInfo.name}</Badge>
                <Badge variant="outline">{fileInfo.type}</Badge>
                <Badge variant="outline">{formatFileSize(fileInfo.size)}</Badge>
              </div>
            )}

            {uploadedData.length > 0 && (
              <div className="space-y-6">
                <Alert>
                  <AlertDescription className="flex items-center gap-2 text-sm">
                    <Info size={16} />
                    <span>
                      Loaded <strong>{uploadedData.length}</strong> records with{' '}
                      <strong>{sourceColumns.length}</strong> columns. Map each source column to a target field.
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{columnMappings.length} mapped</Badge>
                    <Badge variant="outline">{unmappedColumns.length} unmapped</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setColumnMappings(autoMapColumns(sourceColumns))
                    }}
                  >
                    Re-run auto mapping
                  </Button>
                </div>

                <ScrollArea className="max-h-72 rounded-md border">
                  <div className="divide-y">
                    {columnMappings.map((mapping) => (
                      <div
                        key={mapping.sourceColumn}
                        className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center"
                      >
                        <Badge variant="outline" className="justify-start">
                          {mapping.sourceColumn}
                        </Badge>
                        <ArrowsLeftRight size={18} className="text-muted-foreground hidden sm:inline" />
                        <div className="space-y-2">
                          <Select
                            value={mapping.targetField}
                            onValueChange={(value) => updateMapping(mapping.sourceColumn, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Map to field" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCHEMA_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                  {field.required && <span className="text-destructive"> *</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {mapping.dataType && (
                            <p className="text-xs text-muted-foreground">
                              {DATA_TYPE_LABELS[mapping.dataType] || mapping.dataType}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="justify-self-end"
                          onClick={() => removeMapping(mapping.sourceColumn)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}

                    {unmappedColumns.map((column) => (
                      <div
                        key={column}
                        className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center bg-muted/40"
                      >
                        <Badge variant="secondary" className="justify-start">
                          {column}
                        </Badge>
                        <ArrowsLeftRight size={18} className="text-muted-foreground hidden sm:inline" />
                        <div>
                          <Select
                            onValueChange={(value) => updateMapping(column, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Map to field" />
                            </SelectTrigger>
                            <SelectContent>
                              {SCHEMA_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                  {field.required && <span className="text-destructive"> *</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="justify-self-end"
                          onClick={() => removeMapping(column)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Importing records...</span>
                      <span>
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleImport}
                    disabled={isImporting || columnMappings.length === 0}
                  >
                    {isImporting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} weight="bold" />
                        Import {uploadedData.length} records
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isImporting}
                    onClick={() => {
                      setUploadedData([])
                      setSourceColumns([])
                      setColumnMappings([])
                      setFileInfo(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {!uploadedData.length && (
              <Alert className="bg-muted/40">
                <Warning size={16} className="text-muted-foreground" />
                <AlertDescription className="text-sm">
                  Upload a file to start mapping. Ensure each record has at least an <strong>ID</strong> and{' '}
                  <strong>Name</strong> column.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="guide" className="space-y-4 text-sm leading-relaxed">
            <div className="space-y-3">
              <h4 className="font-semibold">Schema Overview</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {SCHEMA_FIELDS.map((field) => (
                  <div key={field.value} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {DATA_TYPE_LABELS[field.type]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Sample JSON</h4>
              <pre className="rounded-md bg-muted p-4 text-xs">
{`[
  {
    "id": "INV-1001",
    "name": "Organic Flour",
    "quantity": 25,
    "unit": "kg",
    "cost": 32.5,
    "date": "2024-01-15",
    "isActive": true
  }
]`}
              </pre>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Sample CSV</h4>
              <pre className="rounded-md bg-muted p-4 text-xs">
{`id,name,quantity,unit,cost,date
INV-1001,Organic Flour,25,kg,32.5,2024-01-15
INV-1002,Sea Salt,12,kg,14.0,2024-02-01`}
              </pre>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Tips</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Use descriptive column names to improve auto-mapping accuracy.</li>
                <li>Ensure required fields are present before starting the import.</li>
                <li>Large files import faster when split into batches of 5k records or fewer.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
