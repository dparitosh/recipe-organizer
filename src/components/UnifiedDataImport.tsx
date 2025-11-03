import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, S
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { parseCSV } from '@/lib/utils/export'
import { 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { parseCSV } from '@/lib/utils/export'
import { toast } from 'sonner'
import { 
  Upload, 
  ArrowsLeftRight, 
  FileXls

  sou
  dataType

  onImport
}
const SCH
  { value: 'name', label: 'Nam

  { value: 'quantity', la
  { value: 'cost', lab
  { value: 'date', la
  { value: 'notes', label: 'Notes', required: false, 


  const [columnMappings, setColumn
  const [importProgress, setImportProgress
  const fileInputRef
 

    const parserError =
      throw new Error('Invalid XML format')

    const rootElements = xmlDoc.documentElement.children
    for (let i = 0; i < rootElements.length; i++) {
      const record: any = {}
      for (let j = 0; j < element.children.length; j++) {
        record[child.tagName] = child.textContent || ''
      
        records.push(record)
    }
    return records

 

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!file) return
    setFileInfo({
      type: file.type,
    })
    const reader = new FileReader()
    reader.onload = async (e) => {
        const text = e.target?.result as string

          const jsonData = JSON.parse(text)
            parsedData = jsonData
            const firstArrayKey = Object.keys(jsonData).find(k
    
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
      <CardContent className="space-y-6">
          <TabsList>
            

            <Alert className
              <AlertDescri
           

              <Label htmlFor="file-upload">Upload Data File</La
         
        
                    type="file"
       

                  <Badge variant="outline" className="gap-1">
      
                    <FileCode
                  <Badge variant="outline
       

                <p classN
                </p>
            </div>
            {uploadedDa
                <Alert>
                  <AlertDescription cla
       
                </Ale
                <div className="space-y-4">
               
                      <Badg
     
   


                    <div className="space-y-2">
   

                          <div className="flex-1">
                          </div>
                          <div className="flex-1">
                              value={mapping.targetFi
   

          
          
                  
                                ))}
                            </Select>
                          <Butt
                    
                         
                          </Button>
                      ))}
                   
                          key={column}
                        >
                    
                          <ArrowsLeftRight size={20} className="te
                            <Select
                     

                              <SelectContent>
                                  <SelectItem key={field.v
                                    <span className="text-xs text-mute
                                ))}
                            </Select>
                        </div>
                    

                {
                    <div className="flex items-center justify-betwe
                      <span className="font-med
                      </span>
                    <Pro
                      className="h-2" 
                  </div>

                  <Button
                    disabled={isImporting || co
                    
                    {i
                        <div className="w-4 
                      </>
                      <>
                        Im
                    )}
                </div>
            )}

            <Alert>
              <AlertDescri
              </AlertD

              <div>
                <ul className="space-y-2 text-sm text-muted-foregr
                    <FileCsv size={16} className="text-primary" />
                  </
                
                  

                  </li>
              </
              <div>
                <div className="flex flex-wrap gap-2">
                    <Badge key={field.value} variant=
                    </Badge>
                </div>

                <h4 clas

                  <li>• <strong>Date:</stro
                </ul>

                <Warning className="h-4 w-4 text
                  <strong>Note:</strong> Large fi
              </Alert>
          </TabsContent>
      </CardContent>
  )








































































































































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
