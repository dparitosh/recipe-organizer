import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MagnifyingGlass, 
  Database, 
  CheckCircle, 
  Warning, 
  UploadSimple,
  Carrot,
  Flask,
  Info
} from '@phosphor-icons/react'
import { fdcService } from '@/lib/services/fdc-service'
import { SearchResult, FoodData } from '@/lib/types'
import { toast } from 'sonner'

interface FDCDataIngestionPanelProps {
  onDataIngested?: () => void
}

export function FDCDataIngestionPanel({ onDataIngested }: FDCDataIngestionPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFoods, setSelectedFoods] = useState<Set<number>>(new Set())
  const [ingesting, setIngesting] = useState(false)
  const [ingestedCount, setIngestedCount] = useState(0)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setSearching(true)
    try {
      const results = await fdcService.searchFoods({
        query: searchQuery,
        pageSize: 50
      })
      setSearchResults(results)
      if (results.length === 0) {
        toast.info('No foods found. Try a different search term.')
      } else {
        toast.success(`Found ${results.length} foods`)
      }
    } catch (error) {
      toast.error('Failed to search foods: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleFoodSelection = (fdcId: number) => {
    const newSelection = new Set(selectedFoods)
    if (newSelection.has(fdcId)) {
      newSelection.delete(fdcId)
    } else {
      newSelection.add(fdcId)
    }
    setSelectedFoods(newSelection)
  }

  const selectAll = () => {
    setSelectedFoods(new Set(searchResults.map(r => r.fdcId)))
  }

  const clearSelection = () => {
    setSelectedFoods(new Set())
  }

  const handleIngestSelected = async () => {
    if (selectedFoods.size === 0) {
      toast.error('Please select at least one food to ingest')
      return
    }

    setIngesting(true)
    setIngestedCount(0)

    try {
      const fdcIds = Array.from(selectedFoods)
      let successCount = 0

      toast.info(`Ingesting ${fdcIds.length} foods into Neo4j...`)

      for (const fdcId of fdcIds) {
        try {
          const foodData = await fdcService.getFoodDetails(fdcId)
          if (foodData) {
            await fdcService.cacheFoodInNeo4j(foodData)
            successCount++
            setIngestedCount(successCount)
          }
        } catch (error) {
          console.error(`Failed to ingest food ${fdcId}:`, error)
        }
      }

      toast.success(`Successfully ingested ${successCount} of ${fdcIds.length} foods into Neo4j`)
      clearSelection()
      onDataIngested?.()
    } catch (error) {
      toast.error('Failed to ingest foods: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIngesting(false)
    }
  }

  const handleQuickIngest = async (searchTerm: string, count: number) => {
    try {
      toast.info(`Searching for "${searchTerm}"...`)
      const results = await fdcService.searchFoods({
        query: searchTerm,
        pageSize: count
      })

      if (results.length === 0) {
        toast.warning(`No results found for "${searchTerm}"`)
        return
      }

      toast.info(`Ingesting ${results.length} ${searchTerm} items...`)
      let successCount = 0

      for (const result of results) {
        try {
          const foodData = await fdcService.getFoodDetails(result.fdcId)
          if (foodData) {
            await fdcService.cacheFoodInNeo4j(foodData)
            successCount++
          }
        } catch (error) {
          console.error(`Failed to ingest ${result.fdcId}:`, error)
        }
      }

      toast.success(`Ingested ${successCount} ${searchTerm} items into Neo4j`)
      onDataIngested?.()
    } catch (error) {
      toast.error(`Failed to quick ingest: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Carrot size={24} className="text-primary" weight="bold" />
              USDA FoodData Central Ingestion
            </CardTitle>
            <CardDescription className="mt-2">
              Search and import food data from USDA FDC API into your Neo4j database
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">Search & Select</TabsTrigger>
            <TabsTrigger value="quick">Quick Ingest</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2 text-xs">
                Search for foods from the USDA FoodData Central database. Select foods and click "Ingest Selected" to add them to your Neo4j database with their complete nutritional information.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                placeholder="Search foods (e.g., 'apple', 'chicken breast', 'milk')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="gap-2"
              >
                {searching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlass size={18} weight="bold" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {searchResults.length} results found · {selectedFoods.size} selected
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {searchResults.map((result) => (
                      <Card
                        key={result.fdcId}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedFoods.has(result.fdcId) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        }`}
                        onClick={() => toggleFoodSelection(result.fdcId)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">
                                  {result.description}
                                </h4>
                                {selectedFoods.has(result.fdcId) && (
                                  <CheckCircle className="text-primary" size={16} weight="fill" />
                                )}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  FDC ID: {result.fdcId}
                                </Badge>
                                {result.dataType && (
                                  <Badge variant="secondary" className="text-xs">
                                    {result.dataType}
                                  </Badge>
                                )}
                                {result.foodCategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {result.foodCategory}
                                  </Badge>
                                )}
                              </div>
                              {result.brandOwner && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Brand: {result.brandOwner}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  onClick={handleIngestSelected}
                  disabled={ingesting || selectedFoods.size === 0}
                  className="w-full gap-2"
                  size="lg"
                >
                  {ingesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ingesting {ingestedCount}/{selectedFoods.size}...
                    </>
                  ) : (
                    <>
                      <UploadSimple size={20} weight="bold" />
                      Ingest {selectedFoods.size} Selected Food{selectedFoods.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="quick" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2 text-xs">
                Quick ingest pre-defined food categories directly into Neo4j. Each button will search for and import multiple foods from that category.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" 
                    onClick={() => handleQuickIngest('apple', 20)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Carrot size={24} className="text-red-600" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Fruits</h3>
                      <p className="text-xs text-muted-foreground">Apples & varieties</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleQuickIngest('broccoli', 20)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Carrot size={24} className="text-green-600" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Vegetables</h3>
                      <p className="text-xs text-muted-foreground">Common vegetables</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleQuickIngest('chicken breast', 15)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Flask size={24} className="text-orange-600" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Proteins</h3>
                      <p className="text-xs text-muted-foreground">Meats & poultry</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleQuickIngest('milk', 15)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Database size={24} className="text-blue-600" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Dairy</h3>
                      <p className="text-xs text-muted-foreground">Milk & dairy products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleQuickIngest('bread', 20)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Flask size={24} className="text-yellow-700" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Grains</h3>
                      <p className="text-xs text-muted-foreground">Breads & cereals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleQuickIngest('olive oil', 10)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Flask size={24} className="text-amber-700" weight="bold" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Fats & Oils</h3>
                      <p className="text-xs text-muted-foreground">Cooking oils & fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <Warning className="h-4 w-4 text-yellow-600" weight="bold" />
              <AlertDescription className="ml-2 text-xs">
                Quick ingest will immediately start importing foods into Neo4j. This may take a few moments depending on the category size.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
