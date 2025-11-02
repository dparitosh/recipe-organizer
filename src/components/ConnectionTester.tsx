import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Lightning, Database, Brain, CheckCircle, XCircle } from '@phosphor-icons/react'
import { neo4jManager } from '@/lib/managers/neo4j-manager'
import { genAIClient } from '@/lib/genai/genai-client'
import { toast } from 'sonner'

export function ConnectionTester() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [testing, setTesting] = useState(false)
  const [nlQuery, setNlQuery] = useState('Show me all recipes that use flour')
  const [queryResult, setQueryResult] = useState<any>(null)
  const [executing, setExecuting] = useState(false)

  const runAllTests = async () => {
    setTesting(true)
    const results: any[] = []
    
    results.push({
      name: 'Manager Status Check',
      status: 'running',
      details: 'Checking Neo4j Manager status...'
    })
    setTestResults([...results])

    try {
      const status = neo4jManager.getConnectionStatus()
      results[0] = {
        name: 'Manager Status Check',
        status: 'success',
        details: `Mock Mode: ${status.isMockMode}, Connected: ${status.isConnected}`
      }
      setTestResults([...results])
    } catch (error) {
      results[0] = {
        name: 'Manager Status Check',
        status: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      setTestResults([...results])
    }

    results.push({
      name: 'Mock Query Test',
      status: 'running',
      details: 'Executing mock query...'
    })
    setTestResults([...results])

    try {
      neo4jManager.setMockMode(true)
      const mockResult = await neo4jManager.query('MATCH (n) RETURN n LIMIT 5')
      results[1] = {
        name: 'Mock Query Test',
        status: 'success',
        details: `Returned ${mockResult.nodes.length} nodes, ${mockResult.relationships.length} relationships`
      }
      setTestResults([...results])
    } catch (error) {
      results[1] = {
        name: 'Mock Query Test',
        status: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      setTestResults([...results])
    }

    results.push({
      name: 'GenAI Cypher Generation',
      status: 'running',
      details: 'Testing GenAI Cypher generation...'
    })
    setTestResults([...results])

    try {
      const cypherResponse = await genAIClient.generateCypher({
        naturalLanguageQuery: 'Find all ingredients',
        context: { limit: 10 }
      })
      results[2] = {
        name: 'GenAI Cypher Generation',
        status: 'success',
        details: `Generated: ${cypherResponse.cypher.substring(0, 100)}...`
      }
      setTestResults([...results])
    } catch (error) {
      results[2] = {
        name: 'GenAI Cypher Generation',
        status: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      setTestResults([...results])
    }

    if (neo4jManager.isConnected()) {
      results.push({
        name: 'Live Neo4j Query Test',
        status: 'running',
        details: 'Executing live Neo4j query...'
      })
      setTestResults([...results])

      try {
        const liveResult = await neo4jManager.query('MATCH (n) RETURN n LIMIT 5')
        results[3] = {
          name: 'Live Neo4j Query Test',
          status: 'success',
          details: `Returned ${liveResult.nodes.length} nodes, ${liveResult.relationships.length} relationships`
        }
        setTestResults([...results])
      } catch (error) {
        results[3] = {
          name: 'Live Neo4j Query Test',
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
        setTestResults([...results])
      }
    }

    setTesting(false)
    toast.success('All tests completed')
  }

  const executeNaturalLanguageQuery = async () => {
    if (!nlQuery.trim()) {
      toast.error('Please enter a query')
      return
    }

    setExecuting(true)
    setQueryResult(null)

    try {
      const result = await neo4jManager.naturalLanguageQuery(nlQuery)
      setQueryResult(result)
      toast.success('Query executed successfully')
    } catch (error) {
      toast.error('Query execution failed')
      setQueryResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setExecuting(false)
    }
  }

  const status = neo4jManager.getConnectionStatus()

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Connection & Driver Tests</h3>
            <p className="text-sm text-muted-foreground">Test Neo4j driver and GenAI functionality</p>
          </div>
          <Badge variant={status.isConnected ? 'default' : status.isMockMode ? 'secondary' : 'outline'}>
            {status.isMockMode ? 'Mock Mode' : status.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Current Configuration</div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="font-semibold">{status.isMockMode ? 'Mock' : 'Live'}</span>
              </div>
              <div className="flex justify-between">
                <span>Connected:</span>
                <span className="font-semibold">{status.isConnected ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-semibold">{status.config?.database || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>URI:</span>
                <span className="font-semibold truncate max-w-[150px]">{status.config?.uri || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">GenAI Settings</div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="font-semibold">{genAIClient.isUsingLocalLLM() ? 'Spark LLM' : 'Neo4j Plugin'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={runAllTests} disabled={testing} className="w-full gap-2">
          <Lightning size={18} weight="bold" />
          {testing ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        {testResults.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="text-sm font-semibold mb-3">Test Results:</div>
            {testResults.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                {result.status === 'success' ? (
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} weight="fill" />
                ) : result.status === 'failed' ? (
                  <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} weight="fill" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold">{result.name}</div>
                  <div className="text-xs mt-1 opacity-90">{result.details}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={24} className="text-primary" weight="bold" />
          <div>
            <h3 className="font-semibold text-lg">Natural Language Query</h3>
            <p className="text-sm text-muted-foreground">Test GenAI-powered Cypher generation</p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Natural Language Query</label>
            <Textarea
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g., Show me all recipes that contain chocolate"
              rows={3}
            />
          </div>

          <Button onClick={executeNaturalLanguageQuery} disabled={executing} className="gap-2">
            <Database size={18} weight="bold" />
            {executing ? 'Executing...' : 'Execute Query'}
          </Button>

          {queryResult && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Query Result:</div>
              <div className="bg-muted/30 rounded-lg p-4">
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
