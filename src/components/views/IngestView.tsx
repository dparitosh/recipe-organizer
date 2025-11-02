import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'
import { UploadSimple, MagnifyingGlass, Database, Warning } from '@phosphor-icons/react'

interface IngestViewProps {
  backendUrl: string
}

export function IngestView({ backendUrl }: IngestViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)

  apiService.setBaseUrl(backendUrl)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const results = await apiService.searchFDC(searchQuery)
      setSearchResults(results)
      toast.success(`Found ${results.length} results`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleIngest = async (fdcId: string) => {
    setLoading(true)
    try {
      await apiService.ingestFDC(fdcId)
      toast.success('Food data ingested successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ingestion failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm('This will delete ALL data from Neo4j. Continue?')) return

    setLoading(true)
    try {
      await apiService.clearDatabase()
      toast.success('Database cleared successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear database')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = async () => {
    setLoading(true)
    try {
      await apiService.loadSampleData()
      toast.success('Sample data loaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load sample data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
        <p className="text-muted-foreground mt-1">
          Import nutritional data from USDA FoodData Central
        </p>
      </div>

      <Alert>
        <Warning size={20} />
        <AlertDescription>
          Data ingestion will add new nodes and relationships to Neo4j. 
          Clear the database first for a fresh start.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database size={24} className="text-primary" />
            Database Management
          </h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleLoadSample}
              disabled={loading}
            >
              <UploadSimple size={20} />
              Load Sample Data
            </Button>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2"
              onClick={handleClearDatabase}
              disabled={loading}
            >
              <Warning size={20} />
              Clear All Data
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">USDA FDC Search</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                <MagnifyingGlass size={20} />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searchResults.map((result) => (
                  <div 
                    key={result.fdcId}
                    className="p-3 border rounded-lg flex items-center justify-between hover:border-primary transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{result.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        FDC ID: {result.fdcId}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleIngest(result.fdcId)}
                      disabled={loading}
                    >
                      Ingest
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
