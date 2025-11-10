import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataExportButton } from '@/components/DataExportButton'
import {
  MagnifyingGlass,
  Database,
  CheckCircle,
  Warning,
  UploadSimple,
  Carrot,
  Flask,
  Info,
} from '@phosphor-icons/react'
import { fdcService } from '@/lib/services/fdc-service'
import { toast } from 'sonner'

const STORED_PAGE_SIZE = 25

export function FDCDataIngestionPanel({ onDataIngested }) {
  const [activeTab, setActiveTab] = useState('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchStats, setSearchStats] = useState({
    totalHits: 0,
    currentPage: 1,
    totalPages: 1,
  })
  const [selectedFoods, setSelectedFoods] = useState(new Set())
  const [ingesting, setIngesting] = useState(false)
  const [ingestedCount, setIngestedCount] = useState(0)

  const storedParamsRef = useRef({
    page: 1,
    search: '',
    includeNutrients: false,
  })
  const storedHasLoadedRef = useRef(false)
  const [storedView, setStoredView] = useState({
    items: [],
    total: 0,
    page: 1,
    hasNextPage: false,
  })
  const [storedSearchTerm, setStoredSearchTerm] = useState('')
  const [storedIncludeNutrients, setStoredIncludeNutrients] = useState(false)
  const [storedLoading, setStoredLoading] = useState(false)
  const [storedError, setStoredError] = useState(null)

  const fetchStoredFoods = useCallback(async (overrides = {}) => {
    const nextParams = {
      ...storedParamsRef.current,
      ...overrides,
    }

    setStoredLoading(true)
    setStoredError(null)

    try {
      const result = await fdcService.listStoredFoods({
        search: nextParams.search,
        page: nextParams.page,
        pageSize: STORED_PAGE_SIZE,
        includeNutrients: nextParams.includeNutrients,
      })

      storedParamsRef.current = {
        ...nextParams,
        page: result?.page ?? nextParams.page,
      }

      setStoredView({
        items: result?.items ?? [],
        total: result?.total ?? 0,
        page: result?.page ?? nextParams.page,
        hasNextPage: Boolean(result?.hasNextPage),
      })
      setStoredIncludeNutrients(storedParamsRef.current.includeNutrients)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setStoredError(message)
      toast.error(`Failed to load stored foods: ${message}`)
    } finally {
      setStoredLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'catalog' && !storedHasLoadedRef.current) {
      storedHasLoadedRef.current = true
      fetchStoredFoods()
    }
  }, [activeTab, fetchStoredFoods])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setSearching(true)
    try {
      const searchResult = await fdcService.searchFoods({
        query: searchQuery,
        pageSize: 50,
      })
      const foods = searchResult?.foods || []
      setSearchResults(foods)
      setSearchStats({
        totalHits: searchResult?.totalHits ?? foods.length,
        currentPage: searchResult?.currentPage ?? 1,
        totalPages: searchResult?.totalPages ?? 1,
      })
      setSelectedFoods(new Set())
      if (foods.length === 0) {
        toast.info('No foods found. Try a different search term.')
      } else {
        toast.success(
          `Showing ${foods.length} foods (${searchResult?.totalHits ?? foods.length} total matches)`
        )
      }
    } catch (error) {
      toast.error('Failed to search foods: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleFoodSelection = (fdcId) => {
    const newSelection = new Set(selectedFoods)
    if (newSelection.has(fdcId)) {
      newSelection.delete(fdcId)
    } else {
      newSelection.add(fdcId)
    }
    setSelectedFoods(newSelection)
  }

  const selectAll = () => {
    setSelectedFoods(new Set(searchResults.map((food) => food.fdcId)))
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
      if (activeTab === 'catalog') {
        await fetchStoredFoods()
      }
    } catch (error) {
      toast.error('Failed to ingest foods: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIngesting(false)
    }
  }

  const handleQuickIngest = async (searchTerm, count) => {
    try {
      toast.info(`Searching for "${searchTerm}"...`)
      const searchResult = await fdcService.searchFoods({
        query: searchTerm,
        pageSize: count,
      })
      const foods = searchResult?.foods || []

      if (foods.length === 0) {
        toast.warning(`No results found for "${searchTerm}"`)
        return
      }

      toast.info(`Ingesting ${foods.length} ${searchTerm} items...`)
      let successCount = 0

      for (const food of foods) {
        try {
          const details = await fdcService.getFoodDetails(food.fdcId)
          if (details) {
            await fdcService.cacheFoodInNeo4j(details)
            successCount++
          }
        } catch (error) {
          console.error(`Failed to ingest ${food.fdcId}:`, error)
        }
      }

      toast.success(`Ingested ${successCount} ${searchTerm} items into Neo4j`)
      onDataIngested?.()
      if (activeTab === 'catalog') {
        await fetchStoredFoods()
      }
    } catch (error) {
      toast.error(`Failed to quick ingest: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStoredKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleStoredSearch()
    }
  }

  const handleStoredSearch = () => {
    const nextTerm = storedSearchTerm.trim()
    setStoredSearchTerm(nextTerm)
    storedParamsRef.current = {
      ...storedParamsRef.current,
      search: nextTerm,
      page: 1,
    }
    fetchStoredFoods({ search: nextTerm, page: 1 })
  }

  const handleStoredRefresh = () => {
    fetchStoredFoods()
  }

  const handleStoredIncludeNutrientsToggle = () => {
    const next = !storedIncludeNutrients
    setStoredIncludeNutrients(next)
    storedParamsRef.current = {
      ...storedParamsRef.current,
      includeNutrients: next,
      page: 1,
    }
    fetchStoredFoods({ includeNutrients: next, page: 1 })
  }

  const handleStoredPrevPage = () => {
    if (storedView.page <= 1 || storedLoading) {
      return
    }
    const previousPage = storedView.page - 1
    storedParamsRef.current = {
      ...storedParamsRef.current,
      page: previousPage,
    }
    fetchStoredFoods({ page: previousPage })
  }

  const handleStoredNextPage = () => {
    if (!storedView.hasNextPage || storedLoading) {
      return
    }
    const nextPage = storedView.page + 1
    storedParamsRef.current = {
      ...storedParamsRef.current,
      page: nextPage,
    }
    fetchStoredFoods({ page: nextPage })
  }

  const searchCount = searchResults.length
  const storedRangeStart = storedView.total === 0 ? 0 : (storedView.page - 1) * STORED_PAGE_SIZE + 1
  const storedRangeEnd = storedView.total === 0 ? 0 : storedRangeStart + storedView.items.length - 1
  const storedTotalPages = storedView.total > 0 ? Math.ceil(storedView.total / STORED_PAGE_SIZE) : 1

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="search">Search & Select</TabsTrigger>
            <TabsTrigger value="quick">Quick Ingest</TabsTrigger>
            <TabsTrigger value="catalog">Stored Foods</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2 text-xs">
                Search USDA FoodData Central, select foods, and add them to Neo4j with full nutritional
                metadata.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                placeholder="Search foods (e.g., 'apple', 'chicken breast', 'milk')..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
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

            {searchCount > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {searchCount} of {searchStats.totalHits} matches · {selectedFoods.size} selected
                  </div>
                  <div className="flex gap-2">
                    <DataExportButton
                      data={searchResults}
                      filename={`fdc-search-${searchQuery}`}
                      disabled={searching}
                    />
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
                                <h4 className="font-semibold text-sm">{result.description}</h4>
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
                                <p className="text-xs text-muted-foreground mt-1">Brand: {result.brandOwner}</p>
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
                Quick ingest pre-defined food categories directly into Neo4j. Each button will search for and import
                samples from that category.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('apple', 20)}>
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

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('broccoli', 20)}>
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

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('chicken breast', 15)}>
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

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('milk', 15)}>
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

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('bread', 20)}>
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

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleQuickIngest('olive oil', 10)}>
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
                Quick ingest will immediately start importing foods into Neo4j. This may take a few moments depending on the
                selection.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" weight="bold" />
              <AlertDescription className="ml-2 text-xs">
                Browse foods already persisted in Neo4j. Filter by keyword, refresh, or toggle nutrient details to inspect
                stored values.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex flex-1 gap-2">
                  <Input
                    placeholder="Filter stored foods"
                    value={storedSearchTerm}
                    onChange={(event) => setStoredSearchTerm(event.target.value)}
                    onKeyPress={handleStoredKeyPress}
                  />
                  <Button onClick={handleStoredSearch} disabled={storedLoading} className="gap-2">
                    <MagnifyingGlass size={18} weight="bold" />
                    Search
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={storedIncludeNutrients ? 'default' : 'outline'}
                    onClick={handleStoredIncludeNutrientsToggle}
                    disabled={storedLoading}
                  >
                    {storedIncludeNutrients ? 'Nutrients On' : 'Nutrients Off'}
                  </Button>
                  <Button variant="outline" onClick={handleStoredRefresh} disabled={storedLoading}>
                    Refresh
                  </Button>
                </div>
              </div>

              {storedError && (
                <Alert variant="destructive">
                  <Warning className="h-4 w-4" weight="bold" />
                  <AlertDescription className="ml-2 text-xs">{storedError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  {storedView.total > 0
                    ? `Showing ${storedRangeStart}-${storedRangeEnd} of ${storedView.total} foods (page ${storedView.page} of ${storedTotalPages})`
                    : storedLoading
                      ? 'Loading stored foods…'
                      : 'No foods ingested yet.'}
                </div>
                <div className="flex items-center gap-2">
                  <DataExportButton
                    data={storedView.items}
                    filename="fdc-stored-foods"
                    disabled={storedLoading || storedView.items.length === 0}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStoredPrevPage}
                    disabled={storedLoading || storedView.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStoredNextPage}
                    disabled={storedLoading || !storedView.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              {storedLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading stored foods…
                </div>
              ) : storedView.items.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  No foods ingested yet. Use search or quick ingest to add data to Neo4j.
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {storedView.items.map((food) => (
                    <Card key={food.fdcId}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{food.description}</h4>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">
                                FDC ID: {food.fdcId}
                              </Badge>
                              {food.dataType && (
                                <Badge variant="secondary" className="text-xs">
                                  {food.dataType}
                                </Badge>
                              )}
                              {food.foodCategory && (
                                <Badge variant="secondary" className="text-xs">
                                  {food.foodCategory}
                                </Badge>
                              )}
                            </div>
                            {food.brandOwner && (
                              <p className="text-xs text-muted-foreground mt-1">Brand: {food.brandOwner}</p>
                            )}
                            {food.ingredients && (
                              <p className="text-xs text-muted-foreground mt-1">Ingredients: {food.ingredients}</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground md:text-right">
                            {food.servingSize && food.servingSizeUnit && (
                              <div>
                                Serving: {food.servingSize} {food.servingSizeUnit}
                              </div>
                            )}
                            {food.publicationDate && <div>Published: {food.publicationDate}</div>}
                          </div>
                        </div>

                        {storedIncludeNutrients && Array.isArray(food.nutrients) && food.nutrients.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Top nutrients
                            </div>
                            <div className="grid gap-1 text-xs text-muted-foreground">
                              {food.nutrients.slice(0, 8).map((nutrient) => {
                                const unit = nutrient.unit || nutrient.unitName || ''
                                return (
                                  <div
                                    key={`${food.fdcId}-${nutrient.nutrientId}`}
                                    className="flex items-center justify-between gap-4"
                                  >
                                    <span className="truncate">{nutrient.nutrientName}</span>
                                    <span className="font-medium text-foreground">
                                      {nutrient.value}
                                      {unit ? ` ${unit}` : ''}
                                    </span>
                                  </div>
                                )
                              })}
                              {food.nutrients.length > 8 && (
                                <div className="text-[11px] italic text-muted-foreground">
                                  +{food.nutrients.length - 8} more nutrients
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
