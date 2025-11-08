import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, MagnifyingGlass, CheckCircle, XCircle, Warning } from '@phosphor-icons/react'
import { plmClient } from '@/lib/api/plm'
import { mdgClient } from '@/lib/api/mdg'
import { integrationManager } from '@/lib/managers/integration-manager'
import { toast } from 'sonner'

export function IntegrationPanel() {
  const [plmSearchQuery, setPlmSearchQuery] = useState('')
  const [plmResults, setPlmResults] = useState([])
  const [plmLoading, setPlmLoading] = useState(false)

  const [mdgSearchQuery, setMdgSearchQuery] = useState('')
  const [mdgResults, setMdgResults] = useState([])
  const [mdgLoading, setMdgLoading] = useState(false)

  const [neo4jQuery, setNeo4jQuery] = useState('MATCH (n) RETURN n LIMIT 10')
  const [neo4jResults, setNeo4jResults] = useState(null)
  const [neo4jLoading, setNeo4jLoading] = useState(false)

  const [syncStatuses, setSyncStatuses] = useState(integrationManager.getAllSyncStatuses())

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatuses(integrationManager.getAllSyncStatuses())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handlePLMSearch = async () => {
    if (!plmSearchQuery.trim()) return

    setPlmLoading(true)
    try {
      const results = await plmClient.searchMaterials(plmSearchQuery)
      setPlmResults(results)
      toast.success(`Found ${results.length} PLM materials`)
    } catch (error) {
      toast.error('PLM search failed')
      console.error(error)
    } finally {
      setPlmLoading(false)
    }
  }

  const handleMDGSearch = async () => {
    if (!mdgSearchQuery.trim()) return

    setMdgLoading(true)
    try {
      const results = await mdgClient.searchMaterials(mdgSearchQuery)
      setMdgResults(results)
      toast.success(`Found ${results.length} MDG materials`)
    } catch (error) {
      toast.error('MDG search failed')
      console.error(error)
    } finally {
      setMdgLoading(false)
    }
  }

  const handleNeo4jQuery = async () => {
    if (!neo4jQuery.trim()) return

    setNeo4jLoading(true)
    try {
      const results = await integrationManager.queryNeo4j(neo4jQuery)
      setNeo4jResults(results)
      toast.success(`Found ${results.nodes.length} nodes, ${results.relationships.length} relationships`)
    } catch (error) {
      toast.error('Neo4j query failed - check connection settings')
      console.error(error)
    } finally {
      setNeo4jLoading(false)
    }
  }

  const handleTestConnections = async () => {
    toast.info('Testing all connections...')
    try {
      const results = await integrationManager.testAllConnections()

      Object.entries(results).forEach(([service, connected]) => {
        if (connected) {
          toast.success(`${service.toUpperCase()}: Connected`)
        } else {
          toast.error(`${service.toUpperCase()}: Connection failed`)
        }
      })
    } catch (error) {
      toast.error('Connection test failed')
    }
  }

  const getStatusIcon = (status) => {
    if (!status) return <Warning size={16} className="text-yellow-500" />
    if (status.connected) return <CheckCircle size={16} className="text-green-500" />
    return <XCircle size={16} className="text-red-500" />
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database size={24} />
              System Integrations
            </CardTitle>
            <Button onClick={handleTestConnections} variant="outline" size="sm">
              Test Connections
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['neo4j', 'plm', 'mdg'].map((service) => {
              const status = syncStatuses.find((s) => s.service === service)
              return (
                <Card key={service} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="text-sm font-semibold uppercase">{service}</span>
                    </div>
                    {status?.connected && (
                      <Badge variant="outline" className="text-xs">
                        {status.lastSync ? new Date(status.lastSync).toLocaleTimeString() : 'Never'}
                      </Badge>
                    )}
                  </div>
                  {status?.error && (
                    <p className="text-xs text-red-500 mt-1">{status.error}</p>
                  )}
                </Card>
              )
            })}
          </div>

          <Tabs defaultValue="plm">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plm">PLM</TabsTrigger>
              <TabsTrigger value="mdg">SAP MDG</TabsTrigger>
              <TabsTrigger value="neo4j">Neo4j</TabsTrigger>
            </TabsList>

            <TabsContent value="plm" className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search PLM materials..."
                    value={plmSearchQuery}
                    onChange={(e) => setPlmSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePLMSearch()}
                  />
                </div>
                <Button onClick={handlePLMSearch} disabled={plmLoading}>
                  <MagnifyingGlass size={18} />
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {plmResults.map((material) => (
                    <Card key={material.materialId} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{material.description}</h4>
                          <p className="text-sm text-muted-foreground">{material.materialId}</p>
                        </div>
                        <Badge variant={material.status === 'active' ? 'default' : 'secondary'}>
                          {material.status}
                        </Badge>
                      </div>
                      {material.supplier && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Supplier: {material.supplier.name}
                          {material.supplier.leadTime && ` • Lead Time: ${material.supplier.leadTime} days`}
                        </div>
                      )}
                      {material.regulatory && material.regulatory.certifications.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {material.regulatory.certifications.map((cert) => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                  {plmResults.length === 0 && !plmLoading && (
                    <p className="text-center text-muted-foreground py-8">No results yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="mdg" className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search SAP MDG materials..."
                    value={mdgSearchQuery}
                    onChange={(e) => setMdgSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMDGSearch()}
                  />
                </div>
                <Button onClick={handleMDGSearch} disabled={mdgLoading}>
                  <MagnifyingGlass size={18} />
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {mdgResults.map((material) => (
                    <Card key={material.materialNumber} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{material.materialDescription}</h4>
                          <p className="text-sm text-muted-foreground">{material.materialNumber}</p>
                        </div>
                        <Badge>{material.materialType}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Group:</span> {material.materialGroup}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit:</span> {material.baseUnit}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plant:</span> {material.plant}
                        </div>
                        {material.standardCost && (
                          <div>
                            <span className="text-muted-foreground">Cost:</span> ${material.standardCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {mdgResults.length === 0 && !mdgLoading && (
                    <p className="text-center text-muted-foreground py-8">No results yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="neo4j" className="space-y-4">
              <div>
                <Label>Cypher Query</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background font-mono text-sm"
                  value={neo4jQuery}
                  onChange={(e) => setNeo4jQuery(e.target.value)}
                  placeholder="MATCH (n) RETURN n LIMIT 10"
                />
              </div>

              <Button
                onClick={handleNeo4jQuery}
                disabled={neo4jLoading || !integrationManager.isNeo4jConnected()}
                className="w-full"
              >
                <Database className="mr-2" size={18} />
                Execute Query
              </Button>

              {!integrationManager.isNeo4jConnected() && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Neo4j not connected. Please configure connection in Settings.
                  </p>
                </Card>
              )}

              {neo4jResults && (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Nodes ({neo4jResults.nodes.length})</h4>
                      <div className="space-y-2">
                        {neo4jResults.nodes.slice(0, 5).map((node) => (
                          <Card key={node.id} className="p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{node.labels.join(', ')}</Badge>
                              <span className="text-sm font-mono">{node.id}</span>
                            </div>
                            <pre className="text-xs mt-2 overflow-x-auto">
                              {JSON.stringify(node.properties, null, 2)}
                            </pre>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {neo4jResults.relationships.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Relationships ({neo4jResults.relationships.length})
                        </h4>
                        <div className="space-y-2">
                          {neo4jResults.relationships.slice(0, 5).map((rel) => (
                            <Card key={rel.id} className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono">{rel.startNode}</span>
                                <Badge variant="secondary">{rel.type}</Badge>
                                <span className="font-mono">{rel.endNode}</span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Execution time: {neo4jResults.metadata.executionTime}ms
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
