import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  DownloadSimple,
  CheckCircle,
  Warning,
  Info,
  MagnifyingGlass,
  ArrowRight,
  CloudArrowUp,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { fdcService } from '@/lib/services/fdc-service';

const LOG_TYPES = ['info', 'success', 'warning', 'error'];

export const Neo4jDataLoader = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStats, setLoadStats] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (type, message) => {
    if (!LOG_TYPES.includes(type)) {
      return;
    }
    setLogs((prev) => [...prev, { type, message }]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    addLog('info', `Searching FDC for: "${searchQuery}"`);

    try {
      const result = await fdcService.searchFoods({
        query: searchQuery,
        pageSize: 50,
      });

      setSearchResults(result.foods);
      addLog('success', `Found ${result.foods.length} food items`);

      if (result.foods.length === 0) {
        toast.info('No results found. Try a different search term.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Search failed';
      addLog('error', errorMsg);
      toast.error('Failed to search FDC');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFoodSelection = (fdcId) => {
    setSelectedFoods((prev) => {
      const next = new Set(prev);
      if (next.has(fdcId)) {
        next.delete(fdcId);
      } else {
        next.add(fdcId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFoods(new Set(searchResults.map((r) => r.fdcId)));
  };

  const deselectAll = () => {
    setSelectedFoods(new Set());
  };

  const loadSelectedFoods = async (fdcIdsOverride) => {
    const fdcIds = fdcIdsOverride ?? Array.from(selectedFoods);

    if (fdcIds.length === 0) {
      toast.error('Please select at least one food item');
      return;
    }

    setIsLoading(true);
    const stats = {
      foodsLoaded: 0,
      nutrientsLoaded: 0,
      categoriesLoaded: 0,
      relationshipsCreated: 0,
      errors: 0,
      startTime: Date.now(),
      endTime: null,
      foodsTarget: fdcIds.length,
    };
    setLoadStats(stats);
    setLogs([]);

    addLog('info', `Requesting backend to ingest ${fdcIds.length} food items...`);

    try {
      const result = await fdcService.ingestFoods(fdcIds);

      stats.foodsLoaded = result?.summary?.foods_ingested ?? 0;
      stats.nutrientsLoaded = result?.summary?.nutrients_linked ?? 0;
      stats.categoriesLoaded = result?.summary?.categories_linked ?? 0;
      stats.relationshipsCreated = result?.summary?.neo4j_relationships_created ?? 0;
      stats.errors = result?.failure_count ?? 0;
      stats.endTime = Date.now();
      setLoadStats({ ...stats });

      addLog(
        'success',
        `Backend ingested ${stats.foodsLoaded} foods (${stats.relationshipsCreated} relationships created)`
      );

      if (result?.failures?.length) {
        result.failures.forEach((failure) => {
          addLog('warning', `Food ${failure.fdc_id}: ${failure.message}`);
        });
      }

      toast.success(`Ingestion complete: ${stats.foodsLoaded} foods processed via backend`);
      setSelectedFoods(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Ingestion failed';
      stats.errors += 1;
      stats.endTime = Date.now();
      setLoadStats({ ...stats });
      addLog('error', `Backend ingestion failed: ${errorMsg}`);
      toast.error('Backend ingestion failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleData = async () => {
    const sampleQueries = ['apple', 'chicken breast', 'wheat flour', 'milk', 'sugar'];

    setIsLoading(true);
    setLogs([]);
    addLog('info', 'Loading sample data from USDA FDC...');

    try {
      const allResults = [];

      for (const query of sampleQueries) {
        addLog('info', `Searching for: ${query}`);
        const result = await fdcService.searchFoods({ query, pageSize: 5 });
        allResults.push(...result.foods.slice(0, 3));
      }

      setSearchResults(allResults);
      setSelectedFoods(new Set(allResults.map((r) => r.fdcId)));
      addLog('success', `Prepared ${allResults.length} sample foods for ingestion`);

      await new Promise((resolve) => setTimeout(resolve, 300));

      await loadSelectedFoods(allResults.map((r) => r.fdcId));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load sample data';
      addLog('error', errorMsg);
      toast.error('Failed to load sample data');
    } finally {
      setIsLoading(false);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-600" weight="fill" />;
      case 'error':
        return <Warning size={16} className="text-red-600" weight="fill" />;
      case 'warning':
        return <Warning size={16} className="text-amber-600" weight="fill" />;
      default:
        return <Info size={16} className="text-primary" weight="fill" />;
    }
  };

  const progressPercent = loadStats
    ? Math.min(100, Math.round((loadStats.foodsLoaded / Math.max(loadStats.foodsTarget || 1, 1)) * 100))
    : 0;

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
              Import food data from USDA FDC into Neo4j graph database (backend orchestrated)
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CloudArrowUp size={14} className="mr-1" weight="fill" />
            Backend Managed
          </Badge>
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
              <Button onClick={handleSearch} disabled={isSearching || isLoading} className="gap-2">
                <MagnifyingGlass size={16} weight="bold" />
                Search
              </Button>
              <Button
                onClick={loadSampleData}
                disabled={isLoading}
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
                            <h4 className="font-semibold text-sm">{food.description}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              FDC ID: {food.fdcId} • Data Type: {food.dataType}
                            </p>
                            {food.brandOwner && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Brand: {food.brandOwner}
                              </p>
                            )}
                          </div>
                          {selectedFoods.has(food.fdcId) && (
                            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CloudArrowUp size={16} />
                    Ready to load selected foods into Neo4j (backend)
                  </div>
                  <Button
                    onClick={loadSelectedFoods}
                    disabled={isLoading || selectedFoods.size === 0}
                    className="gap-2"
                  >
                    <ArrowRight size={16} weight="bold" />
                    Load to Neo4j
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Load Activity</h4>
                <Badge variant="outline">{logs.length} entries</Badge>
              </div>
              <ScrollArea className="h-[320px] pr-3">
                <div className="space-y-2 text-sm">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Logs will appear here once a load is started.
                    </p>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={`${log.type}-${index}`}
                        className="flex items-start gap-2 rounded-md border border-border/60 bg-background/60 p-2"
                      >
                        <span className="mt-0.5">{getLogIcon(log.type)}</span>
                        <p className="text-xs leading-relaxed">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Load Progress</h4>
                  <p className="text-xs text-muted-foreground">
                    Track progress of the current import job handled by the backend
                  </p>
                </div>
                <Badge variant="outline">
                  {loadStats
                    ? `${loadStats.foodsLoaded}/${loadStats.foodsTarget || 0} foods`
                    : 'Idle'}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2" />

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatBlock label="Foods Loaded" value={loadStats?.foodsLoaded ?? 0} />
                <StatBlock label="Nutrients Linked" value={loadStats?.nutrientsLoaded ?? 0} />
                <StatBlock label="Categories" value={loadStats?.categoriesLoaded ?? 0} />
                <StatBlock label="Relationships" value={loadStats?.relationshipsCreated ?? 0} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatBlock label="Errors" value={loadStats?.errors ?? 0} tone="destructive" />
                <StatBlock
                  label="Duration"
                  value={loadStats?.endTime
                    ? `${((loadStats.endTime - loadStats.startTime) / 1000).toFixed(2)}s`
                    : '—'}
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

const StatBlock = ({ label, value, tone }) => (
  <div
    className={`rounded-md border p-3 ${
      tone === 'destructive' ? 'border-red-200 bg-red-50 text-red-700' : 'border-border/60 bg-background'
    }`}
  >
    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default Neo4jDataLoader;
