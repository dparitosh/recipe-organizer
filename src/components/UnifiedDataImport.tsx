import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { parseCSV } from '@/lib/utils/export'
import { toast } from 'sonner'
import { 
  Upload, 
  ArrowsLeftRight, 
  Database, 
  CheckCircle, 
  X, 
  Warning,
  Info,
  FileCsv,
  FileCode,
  FileXls
} from '@phosphor-icons/react'

interface ColumnMapping {
  sourceColumn: string
  targetField: string
  dataType?: 'string' | 'number' | 'date' | 'boolean'
}

interface UnifiedDataImportProps {
  onImportComplete?: (data: any[]) => void
  backendUrl: string
}

const SCHEMA_FIELDS = [
  { value: 'id', label: 'ID', required: true, type: 'string' },
  { value: 'name', label: 'Name', required: true, type: 'string' },
  { value: 'description', label: 'Description', required: false, type: 'string' },
  { value: 'category', label: 'Category', required: false, type: 'string' },
  { value: 'type', label: 'Type', required: false, type: 'string' },
  { value: 'quantity', label: 'Quantity', required: false, type: 'number' },
  { value: 'unit', label: 'Unit', required: false, type: 'string' },
  { value: 'cost', label: 'Cost', required: false, type: 'number' },
  { value: 'supplier', label: 'Supplier', required: false, type: 'string' },
  { value: 'date', label: 'Date', required: false, type: 'date' },
  { value: 'status', label: 'Status', required: false, type: 'string' },
  { value: 'notes', label: 'Notes', required: false, type: 'string' },
]

export function UnifiedDataImport({ onImportComplete, backendUrl }: UnifiedDataImportProps) {
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [sourceColumns, setSourceColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseXML = (xmlText: string): any[] => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      throw new Error('Invalid XML format')
    }

    const records: any[] = []
    const rootElements = xmlDoc.documentElement.children

    for (let i = 0; i < rootElements.length; i++) {
      const element = rootElements[i]
      const record: any = {}
      
      for (let j = 0; j < element.children.length; j++) {
        const child = element.children[j]
        record[child.tagName] = child.textContent || ''
      }
      
      if (Object.keys(record).length > 0) {
        records.push(record)
      }
    }

    return records
  }

  const parseXLSX = async (file: File): Promise<any[]> => {
    toast.info('XLSX parsing requires manual CSV conversion. Please export as CSV first.')
    throw new Error('Please convert XLSX to CSV format for import')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileInfo({
      name: file.name,
      type: file.type,
      size: file.size
    })

    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        let parsedData: any[] = []

        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(text)
          if (Array.isArray(jsonData)) {
            parsedData = jsonData
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            const firstArrayKey = Object.keys(jsonData).find(key => Array.isArray(jsonData[key]))
            if (firstArrayKey) {
              parsedData = jsonData[firstArrayKey]
            } else {
              parsedData = [jsonData]
            }
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
          throw new Error('Unsupported file format. Please upload CSV, JSON, or XML.')
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
        setFileInfo(null)
      }
    }

    reader.readAsText(file)
  }

  const autoMapColumns = (columns: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = []
    
    const columnLowerMap = columns.map(col => col.toLowerCase())
    
    SCHEMA_FIELDS.forEach(field => {
      const fieldLower = field.value.toLowerCase()
      const matchIndex = columnLowerMap.findIndex(col => 
        col === fieldLower || 
        col.includes(fieldLower) || 
        fieldLower.includes(col)
      )
      
      if (matchIndex !== -1) {
        mappings.push({
          sourceColumn: columns[matchIndex],
          targetField: field.value,
          dataType: field.type as any
        })
      }
    })

    return mappings
  }

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => {
      const existing = prev.find(m => m.sourceColumn === sourceColumn)
      const schemaField = SCHEMA_FIELDS.find(f => f.value === targetField)
      
      if (existing) {
        return prev.map(m => 
          m.sourceColumn === sourceColumn 
            ? { ...m, targetField, dataType: schemaField?.type as any } 
            : m
        )
      } else {
        return [...prev, { 
          sourceColumn, 
          targetField, 
          dataType: schemaField?.type as any 
        }]
      }
    })
  }

  const removeMapping = (sourceColumn: string) => {
    setColumnMappings(prev => prev.filter(m => m.sourceColumn !== sourceColumn))
  }

  const transformData = (): any[] => {
    return uploadedData.map(row => {
      const transformed: any = {}
      columnMappings.forEach(mapping => {
        if (mapping.targetField && row[mapping.sourceColumn] !== undefined) {
          let value = row[mapping.sourceColumn]
          
          if (mapping.dataType === 'number') {
            value = parseFloat(value) || 0
          } else if (mapping.dataType === 'boolean') {
            value = value === 'true' || value === '1' || value === true
          } else if (mapping.dataType === 'date') {
            value = new Date(value).toISOString()
          }
          
          transformed[mapping.targetField] = value
        }
      })
      return transformed
    })
  }

  const handleImport = async () => {
    const requiredFields = SCHEMA_FIELDS.filter(f => f.required).map(f => f.value)
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

      toast.info(`Importing ${transformedData.length} records to Neo4j...`)

      for (let i = 0; i < transformedData.length; i++) {
        const record = transformedData[i]
        try {
          const response = await fetch(`${backendUrl}/api/data/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      setFileInfo(null)
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={24} className="text-primary" weight="bold" />
          Data Import & Mapping
        </CardTitle>
        <CardDescription>
          Upload CSV, JSON, XML files and map columns to database schema for Neo4j import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">Upload & Map</TabsTrigger>
            <TabsTrigger value="info">Import Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" weight="bold" />
              <AlertDescription className="ml-2 text-sm">
                <strong>Supported Formats:</strong> CSV, JSON, XML. Maximum file size: 10MB
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="file-upload">Upload Data File</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".csv,.json,.xml"
                    onChange={handleFileUpload}
                  />
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <FileCsv size={14} /> CSV
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileCode size={14} /> JSON
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileCode size={14} /> XML
                  </Badge>
                </div>
              </div>
              {fileInfo && (
                <p className="text-xs text-muted-foreground mt-2">
                  Loaded: {fileInfo.name} ({formatFileSize(fileInfo.size)})
                </p>
              )}
            </div>

            {uploadedData.length > 0 && (
              <>
                <Alert>
                  <Database className="h-4 w-4" weight="bold" />
                  <AlertDescription className="ml-2">
                    <strong>{uploadedData.length} records</strong> loaded from file.
                    Map the source columns to database fields below.
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

                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-2">
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
                                {SCHEMA_FIELDS.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                    <span className="text-xs text-muted-foreground ml-2">({field.type})</span>
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
                                {SCHEMA_FIELDS.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                    <span className="text-xs text-muted-foreground ml-2">({field.type})</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {isImporting && importProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Importing to Neo4j...</span>
                      <span className="font-medium">
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <Progress 
                      value={(importProgress.current / importProgress.total) * 100} 
                      className="h-2" 
                    />
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
                        Import to Neo4j ({uploadedData.length} records)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2 text-sm">
                <strong>Import Process:</strong> Upload a file → Auto-map columns → Review mappings → Import to Neo4j
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supported File Formats</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <FileCsv size={16} className="text-primary" />
                    <strong>CSV:</strong> Comma-separated values with header row
                  </li>
                  <li className="flex items-center gap-2">
                    <FileCode size={16} className="text-primary" />
                    <strong>JSON:</strong> Array of objects or object with array property
                  </li>
                  <li className="flex items-center gap-2">
                    <FileCode size={16} className="text-primary" />
                    <strong>XML:</strong> Structured XML with consistent record elements
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Required Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {SCHEMA_FIELDS.filter(f => f.required).map(field => (
                    <Badge key={field.value} variant="destructive">
                      {field.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Type Conversion</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>String:</strong> Text values (default)</li>
                  <li>• <strong>Number:</strong> Numeric values (parsed as float)</li>
                  <li>• <strong>Date:</strong> ISO 8601 date strings</li>
                  <li>• <strong>Boolean:</strong> true/false or 1/0</li>
                </ul>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <Warning className="h-4 w-4 text-yellow-600" weight="bold" />
                <AlertDescription className="ml-2 text-xs">
                  <strong>Note:</strong> Large files may take time to import. The system will process records sequentially and show progress.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
