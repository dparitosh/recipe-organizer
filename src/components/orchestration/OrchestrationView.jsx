import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Sparkle,
  Play,
  CircleNotch,
  Wrench,
  ChartLine,
  ShareNetwork,
  CheckCircle,
  PaintBrush,
} from '@phosphor-icons/react'
import { AgentOrchestrator } from '@/lib/orchestration/orchestrator'
import { toast } from 'sonner'
import { OrchestrationResultView } from './OrchestrationResultView'
import { AgentHistoryPanel } from './AgentHistoryPanel'
import { useRecoilState } from 'recoil'
import { orchestrationHistoryAtom } from '@/state/atoms'
import { orchestrationService } from '@/lib/services/orchestration-service'

const AGENT_PIPELINE = [
  { name: 'Recipe Engineer', desc: 'Parses structure & validates yields', Icon: Wrench },
  { name: 'Scaling Calculator', desc: 'Computes quantities & costs', Icon: ChartLine },
  { name: 'Graph Builder', desc: 'Prepares Neo4j visualization', Icon: ShareNetwork },
  { name: 'QA Validator', desc: 'Checks consistency & constraints', Icon: CheckCircle },
  { name: 'UI Designer', desc: 'Generates component configs', Icon: PaintBrush },
]

const STATUS_CONFIG = {
  idle: { label: 'Idle', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  running: { label: 'Running', variant: 'secondary', showSpinner: true },
  success: { label: 'Complete', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  skipped: { label: 'Skipped', variant: 'secondary' },
}

export function OrchestrationView() {
  const [isRunning, setIsRunning] = useState(false)
  const [userRequest, setUserRequest] = useState('')
  const [targetBatchSize, setTargetBatchSize] = useState('1000')
  const [targetUnit, setTargetUnit] = useState('kg')
  
  const [currentResult, setCurrentResult] = useState(null)
  const [persistSummary, setPersistSummary] = useState(null)
  const [orchestrationHistory, setOrchestrationHistory] = useRecoilState(orchestrationHistoryAtom)
  const [showHistory, setShowHistory] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState(() => AGENT_PIPELINE.map(() => 'idle'))

  const handleRunOrchestration = async () => {
    if (!userRequest.trim()) {
      toast.error('Please enter a formulation request')
      return
    }

    setIsRunning(true)
    setCurrentResult(null)
  setPersistSummary(null)
    setPipelineStatus(AGENT_PIPELINE.map(() => 'pending'))

    try {
      const orchestrator = new AgentOrchestrator({
        onAgentStart: ({ index }) => {
          setPipelineStatus((prev) =>
            prev.map((status, idx) => (idx === index ? 'running' : status))
          )
        },
        onAgentComplete: ({ index, status }) => {
          setPipelineStatus((prev) =>
            prev.map((value, idx) => {
              if (idx === index) {
                return status === 'success' ? 'success' : 'failed'
              }
              if (status === 'failed' && idx > index && (value === 'pending' || value === 'running')) {
                return 'skipped'
              }
              if (value === 'running' && idx < index) {
                return 'success'
              }
              return value
            })
          )
        },
      })
      
      const requestTimestamp = new Date().toISOString()

      const config = {
        userRequest,
        targetBatchSize: parseFloat(targetBatchSize) || 1000,
        targetUnit,
        includeNutrients: false,
        includeCosts: true,
      }

      toast.info('Starting agent orchestration...', { duration: 2000 })
      
  const result = await orchestrator.orchestrate(config)
      
      setCurrentResult(result)
      setPipelineStatus((prev) =>
        AGENT_PIPELINE.map((_, idx) => {
          const entry = result.agentHistory?.[idx]
          if (entry?.status === 'success') return 'success'
          if (entry?.status === 'failed') return 'failed'
          if (entry?.status === 'skipped') return 'skipped'

          if (result.status === 'failed' && (!entry || entry.status === undefined)) {
            return 'skipped'
          }

          return prev[idx]
        })
      )
      
      setOrchestrationHistory((prev) => [result, ...(prev || [])].slice(0, 10))

      const persistencePayload = {
        userRequest: config.userRequest,
        result,
        requestId: result.id,
        requestTimestamp,
        targetBatchSize: config.targetBatchSize,
        targetUnit: config.targetUnit,
        includeNutrients: config.includeNutrients,
        includeCosts: config.includeCosts,
        context: config.context || {},
        configVersion: 'v1',
        metadata: {
          source: 'frontend-orchestrator',
          status: result.status,
          totalDurationMs: result.totalDuration,
        },
      }

      let persistenceSummary = null
      if (result.status !== 'failed' && result.graph?.nodes?.length) {
        try {
          persistenceSummary = await orchestrationService.persistRun(persistencePayload)
          toast.success('Orchestration run saved to Neo4j')
        } catch (persistError) {
          console.error('Failed to persist orchestration run:', persistError)
          toast.warning('Unable to persist orchestration run to Neo4j.')
        }
      }

      setPersistSummary(persistenceSummary)

      if (result.status === 'success') {
        toast.success(`Orchestration completed in ${(result.totalDuration / 1000).toFixed(2)}s`)
      } else if (result.status === 'partial') {
        toast.warning('Orchestration completed with warnings')
      } else {
        toast.error('Orchestration failed')
      }
    } catch (error) {
      console.error('Orchestration error:', error)
      toast.error(error instanceof Error ? error.message : 'Orchestration failed')
      setPipelineStatus((prev) =>
        prev.map((status) => (status === 'pending' || status === 'running' ? 'skipped' : status))
      )
    } finally {
      setIsRunning(false)
    }
  }

  const exampleRequests = [
    'Create a sports drink formulation with electrolytes',
    'Design a protein smoothie with 25g protein per serving',
    'Formulate a natural energy drink with green tea extract',
    'Create a probiotic yogurt drink with live cultures',
  ]

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkle size={32} weight="fill" className="text-primary" />
            Multi-Agent Orchestration
          </h1>
          <p className="text-muted-foreground mt-1">
            AI agents collaborate to process formulation workflows end-to-end
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Formulation Request</CardTitle>
              <CardDescription>
                Describe your formulation requirements in natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-request">What would you like to formulate?</Label>
                <Textarea
                  id="user-request"
                  placeholder="e.g., Create a sports drink with electrolytes, citrus flavor, and 6% carbohydrates"
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Examples:</span>
                {exampleRequests.map((example, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setUserRequest(example)}
                  >
                    {example.substring(0, 30)}...
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Target Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={targetBatchSize}
                    onChange={(e) => setTargetBatchSize(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-unit">Unit</Label>
                  <Select value={targetUnit} onValueChange={setTargetUnit}>
                    <SelectTrigger id="batch-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="gal">gal</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleRunOrchestration}
                disabled={isRunning || !userRequest.trim()}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <CircleNotch className="animate-spin" />
                    Running Orchestration...
                  </>
                ) : (
                  <>
                    <Play weight="fill" />
                    Run Agent Orchestration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {currentResult && (
            <OrchestrationResultView result={currentResult} persistSummary={persistSummary} />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Pipeline</CardTitle>
              <CardDescription>5 specialized agents working in sequence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AGENT_PIPELINE.map((agent, idx) => {
                  const statusKey = pipelineStatus[idx] || 'idle'
                  const statusDetails = STATUS_CONFIG[statusKey] || STATUS_CONFIG.idle
                  const agentHistory = currentResult?.agentHistory?.[idx]
                  const durationSeconds = agentHistory?.duration
                    ? `${(agentHistory.duration / 1000).toFixed(2)}s`
                    : null

                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                      <agent.Icon size={28} className="text-primary" weight="bold" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {agent.name}
                          <Badge variant={statusDetails.variant} className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                            {statusDetails.showSpinner && (
                              <CircleNotch className="h-3 w-3 animate-spin" />
                            )}
                            {statusDetails.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.desc}
                          {durationSeconds && (
                            <span className="ml-2 text-[11px] text-muted-foreground">· {durationSeconds}</span>
                          )}
                          {agentHistory?.error && (
                            <span className="ml-2 text-[11px] text-destructive">· {agentHistory.error}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {currentResult && (
            <AgentHistoryPanel history={currentResult.agentHistory} />
          )}
        </div>
      </div>
    </div>
  )
}
