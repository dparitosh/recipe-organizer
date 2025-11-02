import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Database, Upload, Trash, CheckCircle, Warning, Package } from '@phosphor-icons/react'
import { sampleDataLoader, SampleDataStats } from '@/lib/data/sample-data-loader'
import { toast } from 'sonner'

interface DataLoaderPanelProps {
  onDataLoaded?: () => void
}

export function DataLoaderPanel({ onDataLoaded }: DataLoaderPanelProps) {
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [stats, setStats] = useState<SampleDataStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLoadData = async () => {
    setLoading(true)
    setError(null)
    setStats(null)

    try {
      toast.info('Loading sample data into Neo4j...')
      const result = await sampleDataLoader.loadAllSampleData()
      setStats(result)
      toast.success(`Successfully loaded ${result.nodesCreated} nodes and ${result.relationshipsCreated} relationships!`)
      onDataLoaded?.()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load sample data'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data from Neo4j? This cannot be undone.')) {
      return
    }

    setClearing(true)
    setError(null)
    setStats(null)

    try {
      toast.info('Clearing database...')
      await sampleDataLoader.clearDatabase()
      toast.success('Database cleared successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear database'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database size={24} className="text-primary" weight="bold" />
              Sample Data Loader
            </CardTitle>
            <CardDescription className="mt-2">
              Load comprehensive F&B sample datasets into Neo4j for demo purposes
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package size={20} className="text-primary" weight="bold" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Potato Wafer Chips</h3>
                  <p className="text-xs text-muted-foreground">Snack Food</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Complete formulation with ingredients, processes, manufacturing recipes, and sales orders
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-secondary/20 bg-secondary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Package size={20} className="text-secondary" weight="bold" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Classic Cola</h3>
                  <p className="text-xs text-muted-foreground">Carbonated Beverage</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Carbonated soft drink with syrup, carbonation, and aseptic filling processes
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Package size={20} className="text-accent-foreground" weight="bold" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Fruit Juices</h3>
                  <p className="text-xs text-muted-foreground">Orange & Berry</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Premium orange juice and mixed berry blend with fortification and HTST pasteurization
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">What will be loaded:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Badge variant="outline" className="justify-center py-2">
              Formulations
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Master Recipes
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Manufacturing Recipes
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Raw Materials
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Ingredients
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Nutrients
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Processes
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Plants
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Sales Orders
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Categories
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Relationships
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Hierarchies
            </Badge>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loading data...</span>
              <span className="text-muted-foreground">Please wait</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {stats && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" weight="bold" />
            <AlertDescription className="ml-2">
              <div className="space-y-1">
                <p className="font-semibold text-green-800">Data loaded successfully!</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-green-700">
                  <div>
                    <span className="font-medium">{stats.nodesCreated}</span> nodes created
                  </div>
                  <div>
                    <span className="font-medium">{stats.relationshipsCreated}</span> relationships created
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Categories:</span> {stats.categories.join(', ')}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Execution time:</span> {stats.executionTime}ms
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <Warning className="h-4 w-4 text-red-600" weight="bold" />
            <AlertDescription className="ml-2">
              <div className="space-y-1">
                <p className="font-semibold text-red-800">Error loading data</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleLoadData}
            disabled={loading || clearing}
            className="flex-1 gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading Sample Data...
              </>
            ) : (
              <>
                <Upload size={20} weight="bold" />
                Load Sample Data
              </>
            )}
          </Button>

          <Button
            onClick={handleClearData}
            disabled={loading || clearing}
            variant="destructive"
            className="gap-2"
            size="lg"
          >
            {clearing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash size={20} weight="bold" />
                Clear Database
              </>
            )}
          </Button>
        </div>

        <Alert>
          <Warning className="h-4 w-4" weight="bold" />
          <AlertDescription className="ml-2 text-xs">
            <strong>Note:</strong> This will clear any existing data in your Neo4j database before loading the sample data.
            Make sure you have a backup if needed.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
