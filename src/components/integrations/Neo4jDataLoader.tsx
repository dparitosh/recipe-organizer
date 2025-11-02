import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  DownloadSimple, 
  CheckCircle, 
  Warning, 
  Info,
  MagnifyingGlass,
  ArrowRight,
  CloudArrowUp
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { neo4jManager } from '@/lib/managers/neo4j-manager'
import { fdcService } from '@/lib/services/fdc-service'
import { NEO4J_CONSTANTS } from '@/lib/constants'
import { SearchResult, FoodData } from '@/lib/types'

interface LoadStats {
  foodsLoaded: number
  nutrientsLoaded: number
  categoriesLoaded: number
  relationshipsCreated: number
  errors: number
  startTime: number
  endTime?: number
}

export function Neo4jDataLoader() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFoods, setSelectedFoods] = useState<Set<number>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadStats, setLoadStats] = useState<LoadStats | null>(null)
  const [logs, setLogs] = useState<Array<{ type: 'info' | 'success' | 'warning' | 'error', message: string }>>([])

  const addLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    setLogs(prev => [...prev, { type, message }])
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setIsSearching(true)
    addLog('info', `Searching FDC for: "${searchQuery}"`)

    try {
      const results = await fdcService.searchFoods({
        query: searchQuery,
        pageSize: 50
      })

      setSearchResults(results)
      addLog('success', `Found ${results.length} food items`)
      
      if (results.length === 0) {
        toast.info('No results found. Try a different search term.')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Search failed'
      addLog('error', errorMsg)
      toast.error('Failed to search FDC')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleFoodSelection = (fdcId: number) => {
    setSelectedFoods(prev => {
      const next = new Set(prev)
      if (next.has(fdcId)) {
        next.delete(fdcId)
      } else {
        next.add(fdcId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedFoods(new Set(searchResults.map(r => r.fdcId)))
  }

  const deselectAll = () => {
    setSelectedFoods(new Set())
  }

  const loadSelectedFoods = async () => {
    if (selectedFoods.size === 0) {
      toast.error('Please select at least one food item')
      return
    }

    if (neo4jManager.isMockMode()) {
      toast.warning('Cannot load data in mock mode. Please connect to Neo4j first.')
      return
    }

    setIsLoading(true)
    const stats: LoadStats = {
      foodsLoaded: 0,
      nutrientsLoaded: 0,
      categoriesLoaded: 0,
      relationshipsCreated: 0,
      errors: 0,
      startTime: Date.now()
    }
    setLoadStats(stats)
    setLogs([])

    addLog('info', `Starting data load for ${selectedFoods.size} food items...`)

    try {
      await createSchemaConstraints()

      for (const fdcId of Array.from(selectedFoods)) {
        try {
          addLog('info', `Loading food ${fdcId}...`)
          
          const foodData = await fdcService.getFoodDetails(fdcId)
          
          if (!foodData) {
            addLog('warning', `Failed to fetch details for food ${fdcId}`)
            stats.errors++
            continue
          }

          await loadFoodToNeo4j(foodData, stats)
          
          stats.foodsLoaded++
          setLoadStats({ ...stats })
          
          addLog('success', `✓ Loaded: ${foodData.description}`)
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          addLog('error', `✗ Error loading food ${fdcId}: ${errorMsg}`)
          stats.errors++
        }
      }

      stats.endTime = Date.now()
      setLoadStats({ ...stats })

      const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2)
      addLog('success', `✓ Load complete! ${stats.foodsLoaded} foods loaded in ${duration}s`)
      
      toast.success(`Successfully loaded ${stats.foodsLoaded} foods into Neo4j`)
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load failed'
      addLog('error', `Load failed: ${errorMsg}`)
      toast.error('Failed to load data into Neo4j')
    } finally {
      setIsLoading(false)
    }
  }

  const createSchemaConstraints = async () => {
    addLog('info', 'Creating Neo4j schema constraints...')
    
    const constraints = [
      `CREATE CONSTRAINT food_fdc_id IF NOT EXISTS FOR (f:${NEO4J_CONSTANTS.NODE_LABELS.FOOD}) REQUIRE f.fdcId IS UNIQUE`,
      `CREATE CONSTRAINT nutrient_id IF NOT EXISTS FOR (n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT}) REQUIRE n.nutrientId IS UNIQUE`,
      `CREATE INDEX food_description IF NOT EXISTS FOR (f:${NEO4J_CONSTANTS.NODE_LABELS.FOOD}) ON (f.description)`,
      `CREATE INDEX nutrient_name IF NOT EXISTS FOR (n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT}) ON (n.nutrientName)`,
    ]

    try {
      for (const constraint of constraints) {
        await neo4jManager.query(constraint)
      }
      addLog('success', '✓ Schema constraints created')
    } catch (error) {
      addLog('warning', 'Some constraints may already exist (this is normal)')
    }
  }

  const loadFoodToNeo4j = async (foodData: FoodData, stats: LoadStats) => {
    const categoryName = foodData.foodCategory || 'Uncategorized'
    
    const cypher = `
      MERGE (f:${NEO4J_CONSTANTS.NODE_LABELS.FOOD} {fdcId: $fdcId})
      SET f.description = $description,
          f.dataType = $dataType,
          f.foodCategory = $foodCategory,
          f.brandOwner = $brandOwner,
          f.brandName = $brandName,
          f.gtinUpc = $gtinUpc,
          f.ingredients = $ingredients,
          f.servingSize = $servingSize,
          f.servingSizeUnit = $servingSizeUnit,
          f.publicationDate = $publicationDate,
          f.updatedAt = datetime()

      WITH f
      MERGE (c:${NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY} {description: $foodCategory})
      SET c.categoryId = $categoryId
      MERGE (f)-[rc:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY}]->(c)
      
      WITH f
      UNWIND $nutrients as nutrient
      MERGE (n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT} {nutrientId: nutrient.nutrientId})
      SET n.nutrientName = nutrient.nutrientName,
          n.nutrientNumber = nutrient.nutrientNumber,
          n.unitName = nutrient.unitName,
          n.rank = nutrient.rank
      MERGE (f)-[rn:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]->(n)
      SET rn.value = nutrient.value,
          rn.unit = nutrient.unitName,
          rn.per100g = nutrient.value,
          rn.derivationCode = nutrient.derivationCode
      
      RETURN f, c, collect(n) as nutrients
    `

    const nutrients = (foodData.foodNutrients || []).map((n, idx) => ({
      nutrientId: n.nutrientId,
      nutrientName: n.nutrientName,
      nutrientNumber: n.nutrientNumber || '',
      unitName: n.unitName || 'g',
      rank: idx + 1,
      value: n.value || 0,
      derivationCode: n.derivationCode || ''
    }))

    await neo4jManager.query(cypher, {
      fdcId: foodData.fdcId,
      description: foodData.description,
      dataType: foodData.dataType || 'Unknown',
      foodCategory: categoryName,
      categoryId: categoryName.toLowerCase().replace(/\s+/g, '-'),
      brandOwner: foodData.brandOwner || null,
      brandName: foodData.brandName || null,
      gtinUpc: foodData.gtinUpc || null,
      ingredients: foodData.ingredients || null,
      servingSize: foodData.servingSize || null,
      servingSizeUnit: foodData.servingSizeUnit || null,
      publicationDate: foodData.publicationDate || null,
      nutrients
    })

    stats.categoriesLoaded++
    stats.nutrientsLoaded += nutrients.length
    stats.relationshipsCreated += nutrients.length + 1
  }

  const loadSampleData = async () => {
    const sampleQueries = [
      'apple',
      'chicken breast',
      'wheat flour',
      'milk',
      'sugar'
    ]

    setIsLoading(true)
    setLogs([])
    addLog('info', 'Loading sample data from USDA FDC...')

    try {
      const allResults: SearchResult[] = []
      
      for (const query of sampleQueries) {
        addLog('info', `Searching for: ${query}`)
        const results = await fdcService.searchFoods({ query, pageSize: 5 })
        allResults.push(...results.slice(0, 3))
      }

      setSearchResults(allResults)
      setSelectedFoods(new Set(allResults.map(r => r.fdcId)))
      addLog('success', `Found ${allResults.length} sample foods`)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await loadSelectedFoods()
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load sample data'
      addLog('error', errorMsg)
      toast.error('Failed to load sample data')
    } finally {
      setIsLoading(false)
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-600" weight="fill" />
      case 'error': return <Warning size={16} className="text-red-600" weight="fill" />
      case 'warning': return <Warning size={16} className="text-amber-600" weight="fill" />
      default: return <Info size={16} className="text-primary" weight="fill" />
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database size={24} className="text-primary" weight="bold" />
              Neo4j Data Loader
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Import food data from USDA FDC into Neo4j graph database
            </p>
          </div>
          {!neo4jManager.isMockMode() ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle size={14} className="mr-1" weight="fill" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Warning size={14} className="mr-1" weight="fill" />
              Mock Mode
            </Badge>
          )}
        </div>

        <Separator className="my-4" />

        <Tabs defaultValue="search" className="space-y-4">
          <TabsList>
            <TabsTrigger value="search">Search & Select</TabsTrigger>
            <TabsTrigger value="logs">Load Logs</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search USDA FDC (e.g., 'apple', 'chicken breast', 'milk')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || isLoading}
                className="gap-2"
              >
                <MagnifyingGlass size={16} weight="bold" />
                Search
              </Button>
              <Button 
                onClick={loadSampleData} 
                disabled={isLoading || neo4jManager.isMockMode()}
                variant="outline"
                className="gap-2"
              >
                <DownloadSimple size={16} weight="bold" />
                Load Sample
              </Button>
            </div>

            {searchResults.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {searchResults.length} results • {selectedFoods.size} selected
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={selectAll} disabled={isLoading}>
                      Select All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={deselectAll} disabled={isLoading}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {searchResults.map((food) => (
                      <div
                        key={food.fdcId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFoods.has(food.fdcId)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleFoodSelection(food.fdcId)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedFoods.has(food.fdcId)}
                                onChange={() => toggleFoodSelection(food.fdcId)}
                                className="rounded"
                                disabled={isLoading}
                              />
                              <span className="font-medium text-sm">{food.description}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground ml-6">
                              <Badge variant="outline" className="text-xs">
                                {food.dataType}
                              </Badge>
                              {food.foodCategory && (
                                <span>• {food.foodCategory}</span>
                              )}
                              <span>• FDC ID: {food.fdcId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={loadSelectedFoods}
                    disabled={isLoading || selectedFoods.size === 0 || neo4jManager.isMockMode()}
                    className="gap-2"
                  >
                    <CloudArrowUp size={16} weight="bold" />
                    Load {selectedFoods.size} Foods into Neo4j
                  </Button>
                </div>
              </>
            )}

            {neo4jManager.isMockMode() && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <Warning size={20} className="text-amber-600 mt-0.5" weight="fill" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">Mock Mode Active</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Connect to Neo4j in Settings to load real data. You can still search and preview foods.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Info size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logs yet. Start a data load to see progress.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.type)}
                      <span className={
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'warning' ? 'text-amber-600' :
                        'text-foreground'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats">
            {loadStats ? (
              <div className="space-y-4">
                {isLoading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Loading progress...</span>
                      <span>{loadStats.foodsLoaded} / {selectedFoods.size}</span>
                    </div>
                    <Progress value={(loadStats.foodsLoaded / selectedFoods.size) * 100} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{loadStats.foodsLoaded}</div>
                    <div className="text-sm text-muted-foreground">Foods Loaded</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{loadStats.nutrientsLoaded}</div>
                    <div className="text-sm text-muted-foreground">Nutrients Loaded</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{loadStats.categoriesLoaded}</div>
                    <div className="text-sm text-muted-foreground">Categories Created</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{loadStats.relationshipsCreated}</div>
                    <div className="text-sm text-muted-foreground">Relationships Created</div>
                  </Card>
                </div>

                {loadStats.errors > 0 && (
                  <Card className="p-4 bg-red-50 border-red-200">
                    <div className="text-xl font-bold text-red-600">{loadStats.errors}</div>
                    <div className="text-sm text-red-700">Errors Encountered</div>
                  </Card>
                )}

                {loadStats.endTime && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-600" weight="fill" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-900">Load Complete</div>
                        <div className="text-xs text-green-700">
                          Duration: {((loadStats.endTime - loadStats.startTime) / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Database size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No statistics yet. Load data to see stats.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5" weight="fill" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 mb-1">About USDA FDC Data</p>
            <p className="text-blue-700 text-xs">
              This loader imports food data from the USDA FoodData Central (FDC) database into Neo4j.
              Each food includes nutritional information, category classification, and ingredient details.
              The data is structured according to the FDC schema defined in USDA_FDC_SCHEMA.md.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
