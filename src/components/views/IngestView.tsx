import { useState } from 'react'
import { FDCDataIngestionPanel } from '@/components/FDCDataIngestionPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { fdcService } from '@/lib/services/fdc-service'
import { toast } from 'sonner'
import { 
  Rocket, 
  Database, 
  CheckCircle, 
  Info,
  Lightning
} from '@phosphor-icons/react'

interface IngestViewProps {
  backendUrl: string
}

export function IngestView({ backendUrl }: IngestViewProps) {
  const [demoIngesting, setDemoIngesting] = useState(false)
  const [demoProgress, setDemoProgress] = useState({ current: 0, total: 0 })

  const handleDemoIngest = async () => {
    setDemoIngesting(true)
    setDemoProgress({ current: 0, total: 0 })

    try {
      const demoItems = [
        { query: 'potato chips', count: 10, name: 'Potato Chips' },
        { query: 'orange juice', count: 10, name: 'Orange Juice' },
        { query: 'cola', count: 10, name: 'Cola & Beverages' },
        { query: 'apple juice', count: 10, name: 'Apple Juice' },
      ]

      let totalIngested = 0
      const totalItems = demoItems.reduce((sum, item) => sum + item.count, 0)
      setDemoProgress({ current: 0, total: totalItems })

      toast.info('Starting demo data ingestion...')

      for (const item of demoItems) {
        try {
          const results = await fdcService.searchFoods({
            query: item.query,
            pageSize: item.count
          })

          for (const result of results.slice(0, item.count)) {
            try {
              const foodData = await fdcService.getFoodDetails(result.fdcId)
              if (foodData) {
                await fdcService.cacheFoodInNeo4j(foodData)
                totalIngested++
                setDemoProgress({ current: totalIngested, total: totalItems })
              }
            } catch (error) {
              console.error(`Failed to ingest ${result.fdcId}:`, error)
            }
          }

          toast.success(`✓ Ingested ${item.name}`)
        } catch (error) {
          console.error(`Failed to search ${item.query}:`, error)
          toast.error(`Failed to search ${item.name}`)
        }
      }

      toast.success(`🎉 Demo complete! Ingested ${totalIngested} foods into Neo4j`)
    } catch (error) {
      toast.error('Demo ingestion failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDemoIngesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
        <p className="text-muted-foreground mt-1">
          Import nutritional data from USDA FoodData Central into Neo4j
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket size={24} className="text-primary" weight="bold" />
            Quick Demo Ingestion
          </CardTitle>
          <CardDescription>
            Instantly populate Neo4j with sample foods for testing: potato chips, juices, and beverages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" weight="bold" />
            <AlertDescription className="ml-2 text-xs">
              This will search and ingest ~40 food items from USDA FDC including:
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">Potato Chips (10)</Badge>
                <Badge variant="secondary">Orange Juice (10)</Badge>
                <Badge variant="secondary">Cola & Beverages (10)</Badge>
                <Badge variant="secondary">Apple Juice (10)</Badge>
              </div>
            </AlertDescription>
          </Alert>

          {demoIngesting && demoProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ingesting foods...</span>
                <span className="font-medium">{demoProgress.current} / {demoProgress.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(demoProgress.current / demoProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleDemoIngest}
            disabled={demoIngesting}
            size="lg"
            className="w-full gap-2"
          >
            {demoIngesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ingesting Demo Data...
              </>
            ) : (
              <>
                <Lightning size={20} weight="bold" />
                Start Demo Ingestion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <FDCDataIngestionPanel 
        onDataIngested={() => {
          console.log('Data ingestion completed successfully')
        }}
      />
    </div>
  )
}
