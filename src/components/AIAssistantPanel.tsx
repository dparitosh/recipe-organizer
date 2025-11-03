import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MagnifyingGlass, 
  Sparkle, 
  Lightning, 
  CheckCircle, 
  Warning, 
  Info,
  TrendUp,
  TrendDown,
  Equals,
  Circle,
  Database,
  Brain,
  Copy,
  ArrowRight,
  Robot,
  CloudArrowDown
} from '@phosphor-icons/react'
import { aiAssistant, AIResponse } from '@/lib/ai'
import { Formulation } from '@/lib/schemas/formulation'
import { toast } from 'sonner'
import { aiServiceConfig, AIServiceMode } from '@/lib/services/ai-service-config'
import { aiServiceMonitor, ServiceStatus } from '@/lib/services/ai-service-monitor'

interface AIAssistantPanelProps {
  formulations?: Formulation[]
  activeFormulationId?: string | null
}

const SUGGESTED_QUERIES = [
  "Show all recipes using mango concentrate with yield < 90%",
  "Suggest low-cost substitutes for vanilla extract",
  "What are the most expensive ingredients across all formulations?",
  "Which formulations have incomplete cost data?",
  "Summarize yield trends for formulations created this quarter",
  "Find ingredients that could be substituted to reduce cost",
  "What formulations contain preservatives and have high costs?",
  "Show relationships between master recipes and manufacturing plants"
]

export function AIAssistantPanel({ formulations = [], activeFormulationId }: AIAssistantPanelProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [history, setHistory] = useState<Array<{ query: string; response: AIResponse }>>([])
  const [serviceMode, setServiceMode] = useState<AIServiceMode>('auto')
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking')

  useEffect(() => {
    setServiceMode(aiServiceConfig.getMode())
    
    const unsubscribe = aiServiceMonitor.subscribe((health) => {
      setServiceStatus(health.status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const getModeIcon = () => {
    const mode = serviceMode
    const status = serviceStatus
    
    if (mode === 'offline' || (mode === 'auto' && status === 'offline')) {
      return <Robot size={12} weight="fill" />
    }
    return <CloudArrowDown size={12} weight="fill" />
  }

  const getModeText = () => {
    const mode = serviceMode
    const status = serviceStatus
    
    if (mode === 'offline') {
      return 'Offline Mode'
    }
    if (mode === 'auto' && status === 'offline') {
      return 'Offline (Auto)'
    }
    return 'Online Mode'
  }

  const getModeVariant = (): "default" | "secondary" | "outline" => {
    const mode = serviceMode
    const status = serviceStatus
    
    if (mode === 'offline' || (mode === 'auto' && status === 'offline')) {
      return 'secondary'
    }
    return 'default'
  }
  const handleSubmit = async (queryText?: string) => {
    const questionText = queryText || query
    if (!questionText.trim()) {
      toast.error('Please enter a question')
      return
    }

    setIsLoading(true)
    setQuery(queryText || query)

    try {
      const result = await aiAssistant.query({
        question: questionText,
        context: {
          formulations,
          activeFormulationId: activeFormulationId || undefined
        }
      })

      setResponse(result)
      setHistory(prev => [{ query: questionText, response: result }, ...prev].slice(0, 10))
      
      if (!queryText) {
        setQuery('')
      }
    } catch (error) {
      console.error('AI Assistant Error:', error)
      toast.error('Failed to process question')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery)
    handleSubmit(suggestedQuery)
  }

  const handleCopyAnswer = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer)
      toast.success('Answer copied to clipboard')
    }
  }

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-blue-600 bg-blue-50'
    }
  }

  const getImpactIcon = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return <TrendUp size={16} weight="bold" />
      case 'medium': return <Equals size={16} weight="bold" />
      case 'low': return <TrendDown size={16} weight="bold" />
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'cost_optimization': return '💰'
      case 'yield_improvement': return '📈'
      case 'substitution': return '🔄'
      case 'process_optimization': return '⚙️'
      case 'quality_enhancement': return '✨'
      default: return '💡'
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkle className="text-white" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              AI Assistant
              <Badge variant={getModeVariant()} className="text-xs gap-1">
                {getModeIcon()}
                {getModeText()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Lightning size={12} weight="fill" className="mr-1" />
                Powered by GPT-4
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ask questions about your formulations, get insights from Neo4j graph data, and receive intelligent recommendations for cost optimization, yield improvement, and ingredient substitutions.
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question... e.g., 'Show recipes using mango with yield < 90%'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={() => handleSubmit()} 
                disabled={isLoading || !query.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <MagnifyingGlass size={18} weight="bold" />
                    Ask
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {!response && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Suggested Questions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_QUERIES.map((suggestedQuery, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuery(suggestedQuery)}
                  className="text-left text-xs p-3 rounded-md bg-white hover:bg-accent transition-colors border border-border"
                  disabled={isLoading}
                >
                  <div className="flex items-start gap-2">
                    <ArrowRight size={14} className="mt-0.5 text-primary flex-shrink-0" weight="bold" />
                    <span className="text-foreground">{suggestedQuery}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {response && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">Answer</h3>
                <Badge variant="outline" className="text-xs">
                  {response.executionTime}ms
                </Badge>
                <Badge 
                  variant={response.confidence > 0.7 ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {Math.round(response.confidence * 100)}% confidence
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyAnswer} className="gap-2">
                <Copy size={16} />
                Copy
              </Button>
            </div>
            
            <div className="prose prose-sm max-w-none text-foreground">
              {response.answer}
            </div>

            {response.cypher && (
              <details className="mt-4">
                <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                  View Generated Cypher Query
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                  <code>{response.cypher}</code>
                </pre>
              </details>
            )}

            {response.sources && response.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Data Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {response.sources.map((source, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs gap-1">
                      {source.type === 'neo4j' && <Database size={12} />}
                      {source.type === 'llm' && <Sparkle size={12} />}
                      {source.description}
                      {source.recordCount !== undefined && ` (${source.recordCount})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {response.nodeHighlights && response.nodeHighlights.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Circle size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">Node Highlights</h3>
                <Badge variant="secondary" className="text-xs">
                  {response.nodeHighlights.length} found
                </Badge>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {response.nodeHighlights.map((node, idx) => (
                    <div key={idx} className="p-3 bg-accent/30 rounded-md border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {node.nodeType}
                          </Badge>
                          <span className="font-semibold text-sm">{node.name}</span>
                        </div>
                        <Badge className="text-xs">
                          {Math.round(node.relevance * 100)}% relevant
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(node.properties)
                          .filter(([key]) => !['id', 'name'].includes(key))
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {response.relationshipSummaries && response.relationshipSummaries.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">Relationship Summaries</h3>
              </div>
              <div className="space-y-3">
                {response.relationshipSummaries.map((rel, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{rel.relationshipType}</span>
                      <Badge variant="secondary" className="text-xs">
                        {rel.count} {rel.count === 1 ? 'relationship' : 'relationships'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rel.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {response.recommendations && response.recommendations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">Recommendations</h3>
                <Badge variant="secondary" className="text-xs">
                  {response.recommendations.length} suggestion{response.recommendations.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-3">
                {response.recommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border-l-4 ${
                      rec.impact === 'high' ? 'border-red-500 bg-red-50/50' :
                      rec.impact === 'medium' ? 'border-amber-500 bg-amber-50/50' :
                      'border-blue-500 bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getRecommendationIcon(rec.type)}</span>
                        <h4 className="font-semibold text-sm">{rec.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getImpactColor(rec.impact)}`}>
                          {getImpactIcon(rec.impact)}
                          <span className="ml-1">{rec.impact} impact</span>
                        </Badge>
                        {rec.actionable && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle size={12} className="mr-1" weight="bold" />
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80">{rec.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {history.length > 0 && !isLoading && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={20} className="text-muted-foreground" weight="bold" />
            <h3 className="font-semibold">Recent Questions</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuery(item.query)}
                  className="w-full text-left p-3 rounded-md bg-muted/30 hover:bg-muted transition-colors text-xs"
                >
                  <div className="flex items-start gap-2">
                    <MagnifyingGlass size={14} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{item.query}</p>
                      <p className="text-muted-foreground text-[10px] mt-1">
                        {item.response.executionTime}ms • {Math.round(item.response.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
