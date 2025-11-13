import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, ArrowsLeftRight, Database, CheckCircle, X } from '@phosphor-icons/react'
import { envService } from '@/lib/services/env-service.js'

const FDC_SCHEMA_FIELDS = [
  { value: 'fdcId', label: 'FDC ID', required: true },
  { value: 'description', label: 'Food Description', required: true },
  { value: 'dataType', label: 'Data Type', required: false },
  { value: 'foodCategory', label: 'Food Category', required: false },
  { value: 'foodCategoryId', label: 'Food Category ID', required: false },
  { value: 'brandOwner', label: 'Brand Owner', required: false },
  { value: 'brandName', label: 'Brand Name', required: false },
  { value: 'gtinUpc', label: 'GTIN/UPC', required: false },
  { value: 'ingredients', label: 'Ingredients', required: false },
  { value: 'servingSize', label: 'Serving Size', required: false },
  { value: 'servingSizeUnit', label: 'Serving Size Unit', required: false },
  { value: 'householdServingFullText', label: 'Household Serving', required: false },
  { value: 'nutrientId', label: 'Nutrient ID', required: false },
  { value: 'nutrientName', label: 'Nutrient Name', required: false },
  { value: 'nutrientNumber', label: 'Nutrient Number', required: false },
  { value: 'nutrientValue', label: 'Nutrient Value', required: false },
  { value: 'nutrientUnit', label: 'Nutrient Unit', required: false },
  { value: 'publishedDate', label: 'Published Date', required: false },
  { value: 'modifiedDate', label: 'Modified Date', required: false },
]

function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

export function DataImportMapper({ onImportComplete, backendUrl }) {
  const [uploadedData, setUploadedData] = useState([])
  const [sourceColumns, setSourceColumns] = useState([])
  const [columnMappings, setColumnMappings] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result
        let parsedData = []

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(text)
          if (Array.isArray(jsonData)) {
            parsedData = jsonData
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            if ('foods' in jsonData && Array.isArray(jsonData.foods)) {
              parsedData = jsonData.foods
            } else {
              throw new Error('JSON must be an array or contain a "foods" array')
            }
          } else {
            throw new Error('Invalid JSON format')
          }
        } else if (file.name.endsWith('.csv')) {
          parsedData = parseCSV(text)
        } else {
          throw new Error('Unsupported file format. Please upload CSV or JSON.')
        }

        if (parsedData.length === 0) {
          throw new Error('No data found in file')
        }

        setUploadedData(parsedData)
        const columns = Object.keys(parsedData[0])
        setSourceColumns(columns)
        
        const autoMappings = autoMapColumns(columns)
        setColumnMappings(autoMappings)
        
        toast.success(`Loaded ${parsedData.length} records with ${columns.length} columns`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to parse file')
        setUploadedData([])
        setSourceColumns([])
        setColumnMappings([])
      }
    }

    reader.readAsText(file)
  }

  const autoMapColumns = (columns) => {
    const mappings = []
    
    const columnLowerMap = columns.map(col => col.toLowerCase())
    
    FDC_SCHEMA_FIELDS.forEach(field => {
      const fieldLower = field.value.toLowerCase()
      const matchIndex = columnLowerMap.findIndex(col => 
        col === fieldLower || 
        col.includes(fieldLower) || 
        fieldLower.includes(col)
      )
      
      if (matchIndex !== -1) {
        mappings.push({
          sourceColumn: columns[matchIndex],
          targetField: field.value
        })
      }
    })

    return mappings
  }

  const updateMapping = (sourceColumn, targetField) => {
    setColumnMappings(prev => {
      const existing = prev.find(m => m.sourceColumn === sourceColumn)
      if (existing) {
        return prev.map(m => 
          m.sourceColumn === sourceColumn 
            ? { ...m, targetField } 
            : m
        )
      } else {
        return [...prev, { sourceColumn, targetField }]
      }
    })
  }

  const removeMapping = (sourceColumn) => {
    setColumnMappings(prev => prev.filter(m => m.sourceColumn !== sourceColumn))
  }

  const transformData = () => {
    return uploadedData.map(row => {
      const transformed = {}
      columnMappings.forEach(mapping => {
        if (mapping.targetField && row[mapping.sourceColumn] !== undefined) {
          transformed[mapping.targetField] = row[mapping.sourceColumn]
        }
      })
      return transformed
    })
  }

  const handleImport = async () => {
    const requiredFields = FDC_SCHEMA_FIELDS.filter(f => f.required).map(f => f.value)
    const mappedFields = columnMappings.map(m => m.targetField)
    const missingFields = requiredFields.filter(f => !mappedFields.includes(f))

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`)
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: uploadedData.length })

    try {
      const transformedData = transformData()
      let successCount = 0

      for (let i = 0; i < transformedData.length; i++) {
        const record = transformedData[i]
        try {
          const response = await fetch(`${backendUrl}/api/fdc/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...envService.getAuthHeaders({ requireAdmin: true }),
            },
            body: JSON.stringify(record)
          })

          if (response.ok) {
            successCount++
          }
        } catch (error) {
          console.error(`Failed to import record ${i}:`, error)
        }
        
        setImportProgress({ current: i + 1, total: transformedData.length })
      }

      toast.success(`Successfully imported ${successCount} of ${transformedData.length} records`)
      
      if (onImportComplete) {
        onImportComplete(transformedData)
      }

      setUploadedData([])
      setSourceColumns([])
      setColumnMappings([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const unmappedColumns = sourceColumns.filter(
    col => !columnMappings.some(m => m.sourceColumn === col)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={24} className="text-primary" weight="bold" />
          Data Import & Mapping
        </CardTitle>
        <CardDescription>
          Upload CSV or JSON files from <a href="https://fdc.nal.usda.gov/download-datasets" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">USDA FDC Download Page</a> and map columns to FDC schema fields for database import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Database className="h-4 w-4 text-blue-600" weight="bold" />
          <AlertDescription className="ml-2 text-sm">
            <strong>Download FDC Datasets:</strong> Visit <a href="https://fdc.nal.usda.gov/download-datasets" target="_blank" rel="noopener noreferrer" className="text-primary underline">fdc.nal.usda.gov/download-datasets</a> to download CSV or JSON files (Branded Foods, Foundation Foods, SR Legacy, etc.)
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="file-upload">Upload Data File</Label>
          <Input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: CSV, JSON (max 10MB)
          </p>
        </div>

        {uploadedData.length > 0 && (
          <>
            <Alert>
              <Database className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2">
                <strong>{uploadedData.length} records</strong> loaded from file.
                Map the source columns to FDC schema fields below.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Column Mapping</h4>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {columnMappings.length} mapped
                  </Badge>
                  <Badge variant="outline">
                    {unmappedColumns.length} unmapped
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {columnMappings.map(mapping => (
                  <div 
                    key={mapping.sourceColumn}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <Badge variant="outline">{mapping.sourceColumn}</Badge>
                    </div>
                    <ArrowsLeftRight size={20} className="text-muted-foreground" />
                    <div className="flex-1">
                      <Select
                        value={mapping.targetField}
                        onValueChange={(value) => updateMapping(mapping.sourceColumn, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target field" />
                        </SelectTrigger>
                        <SelectContent>
                          {FDC_SCHEMA_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && <span className="text-destructive">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMapping(mapping.sourceColumn)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}

                {unmappedColumns.map(column => (
                  <div 
                    key={column}
                    className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg"
                  >
                    <div className="flex-1">
                      <Badge variant="secondary">{column}</Badge>
                    </div>
                    <ArrowsLeftRight size={20} className="text-muted-foreground" />
                    <div className="flex-1">
                      <Select
                        onValueChange={(value) => updateMapping(column, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target field" />
                        </SelectTrigger>
                        <SelectContent>
                          {FDC_SCHEMA_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && <span className="text-destructive">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isImporting && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importing to database...</span>
                  <span className="font-medium">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ 
                      width: `${(importProgress.current / importProgress.total) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={isImporting || columnMappings.length === 0}
                className="flex-1 gap-2"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} weight="bold" />
                    Import to Database ({uploadedData.length} records)
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
