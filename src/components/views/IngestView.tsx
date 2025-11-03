import { FDCDataIngestionPanel } from '@/components/FDCDataIngestionPanel'

interface IngestViewProps {
  backendUrl: string
}

export function IngestView({ backendUrl }: IngestViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
        <p className="text-muted-foreground mt-1">
          Import nutritional data from USDA FoodData Central into Neo4j
        </p>
      </div>

      <FDCDataIngestionPanel 
        onDataIngested={() => {
          console.log('Data ingestion completed successfully')
        }}
      />
    </div>
  )
}
