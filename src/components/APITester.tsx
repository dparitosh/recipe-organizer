import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FlaskConical, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Code,
  Copy,
  Download
} from 'lucide-react'
import { FormulationAPI, ManufacturingAPI, SalesOrderAPI, ValidationAPI, APIResponse } from '@/lib/api/rest-endpoints'
import { createEmptyFormulation } from '@/lib/schemas/formulation'
import { toast } from 'sonner'

export function APITester() {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('formulation-create')
  const [requestBody, setRequestBody] = useState<string>('')
  const [response, setResponse] = useState<APIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const endpoints = [
    {
      id: 'formulation-create',
      category: 'Formulation',
      name: 'POST /formulation/create',
      description: 'Create a new formulation with validation',
      method: 'POST',
      defaultBody: JSON.stringify(createEmptyFormulation('test-user'), null, 2)
    },
    {
      id: 'formulation-scale',
      category: 'Formulation',
      name: 'POST /formulation/scale',
      description: 'Scale formulation to target quantity',
      method: 'POST',
      defaultBody: JSON.stringify({
        formulationId: 'formula-123',
        targetQuantity: 5000,
        targetUnit: 'kg',
        userId: 'test-user',
        userName: 'Test User'
      }, null, 2)
    },
    {
      id: 'formulation-validate-yield',
      category: 'Formulation',
      name: 'POST /formulation/validate-yield',
      description: 'Validate formulation yield percentage',
      method: 'POST',
      defaultBody: JSON.stringify({
        formulation: createEmptyFormulation('test-user')
      }, null, 2)
    },
    {
      id: 'manufacturing-generate',
      category: 'Manufacturing',
      name: 'POST /manufacturing/generate',
      description: 'Generate manufacturing recipe from master recipe',
      method: 'POST',
      defaultBody: JSON.stringify({
        masterRecipeId: 'recipe-123',
        batchSize: 1000,
        plant: 'PLANT-001',
        userId: 'test-user',
        userName: 'Test User'
      }, null, 2)
    },
    {
      id: 'manufacturing-calculate-yield',
      category: 'Manufacturing',
      name: 'POST /manufacturing/calculate-yield',
      description: 'Calculate yield across manufacturing operations',
      method: 'POST',
      defaultBody: JSON.stringify({
        manufacturingRecipeId: 'mfg-123',
        operations: [
          { inputQty: 1000, outputQty: 950, unit: 'kg' },
          { inputQty: 950, outputQty: 900, unit: 'kg' },
          { inputQty: 900, outputQty: 875, unit: 'kg' }
        ],
        userId: 'test-user',
        userName: 'Test User'
      }, null, 2)
    },
    {
      id: 'salesorder-derive',
      category: 'Sales Order',
      name: 'POST /salesorder/derive',
      description: 'Derive recipes from sales order line items',
      method: 'POST',
      defaultBody: JSON.stringify({
        salesOrderId: 'so-123',
        lineNumbers: [10, 20, 30],
        userId: 'test-user',
        userName: 'Test User'
      }, null, 2)
    },
    {
      id: 'validate-uom',
      category: 'Validation',
      name: 'POST /validation/unit-of-measure',
      description: 'Validate unit of measure',
      method: 'POST',
      defaultBody: JSON.stringify({
        unit: 'kg',
        allowedUnits: ['KG', 'G', 'LB', 'OZ', 'L', 'ML', 'GAL']
      }, null, 2)
    },
    {
      id: 'validate-yield',
      category: 'Validation',
      name: 'POST /validation/yield-percentage',
      description: 'Validate yield percentage',
      method: 'POST',
      defaultBody: JSON.stringify({
        yieldPercentage: 87.5
      }, null, 2)
    },
    {
      id: 'validate-byproduct',
      category: 'Validation',
      name: 'POST /validation/byproduct-logic',
      description: 'Validate byproduct mass balance',
      method: 'POST',
      defaultBody: JSON.stringify({
        inputQuantity: 1000,
        outputQuantity: 850,
        byproductQuantity: 150,
        unit: 'kg'
      }, null, 2)
    }
  ]

  const handleExecute = async () => {
    setIsLoading(true)
    setResponse(null)

    try {
      const body = JSON.parse(requestBody)
      let result: APIResponse

      switch (activeEndpoint) {
        case 'formulation-create':
          result = await FormulationAPI.create(body, body.metadata?.owner || 'test-user')
          break
        case 'formulation-scale':
          result = await FormulationAPI.scale(
            body.formulationId,
            body.targetQuantity,
            body.targetUnit,
            body.userId,
            body.userName
          )
          break
        case 'formulation-validate-yield':
          result = await FormulationAPI.validateYield(body.formulation)
          break
        case 'manufacturing-generate':
          result = await ManufacturingAPI.generate(
            body.masterRecipeId,
            body.batchSize,
            body.plant,
            body.userId,
            body.userName
          )
          break
        case 'manufacturing-calculate-yield':
          result = await ManufacturingAPI.calculateYield(
            body.manufacturingRecipeId,
            body.operations,
            body.userId,
            body.userName
          )
          break
        case 'salesorder-derive':
          result = await SalesOrderAPI.derive(
            body.salesOrderId,
            body.lineNumbers,
            body.userId,
            body.userName
          )
          break
        case 'validate-uom':
          result = ValidationAPI.validateUnitOfMeasure(body.unit, body.allowedUnits)
          break
        case 'validate-yield':
          result = ValidationAPI.validateYieldPercentage(body.yieldPercentage)
          break
        case 'validate-byproduct':
          result = ValidationAPI.validateByproductLogic(
            body.inputQuantity,
            body.outputQuantity,
            body.byproductQuantity,
            body.unit
          )
          break
        default:
          throw new Error('Unknown endpoint')
      }

      setResponse(result)
      toast.success('API call completed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setResponse({
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage
        }
      })
      toast.error('API call failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
      toast.success('Response copied to clipboard')
    }
  }

  const handleDownloadResponse = () => {
    if (response) {
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-response-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Response downloaded')
    }
  }

  const currentEndpoint = endpoints.find(e => e.id === activeEndpoint)

  const categories = Array.from(new Set(endpoints.map(e => e.category)))

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
          <FlaskConical className="text-primary" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">API Endpoint Tester</h2>
          <p className="text-sm text-muted-foreground">
            Test REST API endpoints for BOM and recipe management
          </p>
        </div>
      </div>

      <Tabs value={activeEndpoint} onValueChange={setActiveEndpoint}>
        <ScrollArea className="w-full">
          <TabsList className="mb-4">
            {categories.map(category => (
              <div key={category} className="inline-flex gap-1 mr-2">
                {endpoints.filter(e => e.category === category).map(endpoint => (
                  <TabsTrigger 
                    key={endpoint.id} 
                    value={endpoint.id}
                    className="text-xs"
                  >
                    {endpoint.category}
                  </TabsTrigger>
                ))}
              </div>
            ))}
          </TabsList>
        </ScrollArea>

        {endpoints.map(endpoint => (
          <TabsContent key={endpoint.id} value={endpoint.id} className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={endpoint.method === 'POST' ? 'default' : 'secondary'}>
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono">{endpoint.name.replace(/^(GET|POST|PUT|DELETE) /, '')}</code>
              </div>
              <p className="text-sm text-muted-foreground">{endpoint.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-body">Request Body</Label>
              <Textarea
                id="request-body"
                value={requestBody || endpoint.defaultBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="font-mono text-xs h-64"
                placeholder="Enter request body as JSON"
              />
            </div>

            <Button 
              onClick={handleExecute} 
              disabled={isLoading}
              className="w-full gap-2"
            >
              <Play size={16} />
              {isLoading ? 'Executing...' : 'Execute Request'}
            </Button>

            {response && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Response</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopyResponse}
                      className="gap-2"
                    >
                      <Copy size={14} />
                      Copy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownloadResponse}
                      className="gap-2"
                    >
                      <Download size={14} />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md">
                  <div className={`flex items-center gap-2 px-4 py-2 border-b ${
                    response.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {response.success ? (
                      <>
                        <CheckCircle className="text-green-600" size={16} />
                        <span className="text-sm font-medium text-green-900">Success</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-red-600" size={16} />
                        <span className="text-sm font-medium text-red-900">Error</span>
                      </>
                    )}
                    {response.metadata && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {response.metadata.executionTime}ms
                      </span>
                    )}
                  </div>

                  {response.metadata?.warnings && response.metadata.warnings.length > 0 && (
                    <div className="px-4 py-2 bg-yellow-50 border-b">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="text-yellow-600" size={14} />
                        <span className="text-xs font-medium text-yellow-900">Warnings</span>
                      </div>
                      {response.metadata.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-yellow-800 ml-5">{warning}</p>
                      ))}
                    </div>
                  )}

                  <ScrollArea className="h-96">
                    <pre className="p-4 text-xs font-mono">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  )
}
