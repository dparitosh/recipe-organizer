import { UnifiedDataImport } from '@/components/UnifiedDataImport'

export function IngestView({ backendUrl }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
        <p className="text-muted-foreground mt-1">
          Import data from CSV, JSON, or XML files into Neo4j with intelligent field mapping
        </p>
      </div>

      <UnifiedDataImport 
        backendUrl={backendUrl}
        onImportComplete={(data) => {
          console.log('Data import completed successfully', data.length, 'records')
        }}
      />
    </div>
  )
}
