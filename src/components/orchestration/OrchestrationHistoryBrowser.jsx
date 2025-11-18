import { useState, useEffect, useCallback } from 'react'
import { orchestrationService } from '@/lib/services/orchestration-service'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClockClockwise, Eye, CircleNotch, FunnelSimple } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export function OrchestrationHistoryBrowser({ onSelectRun }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState({ 
    status: 'all', 
    limit: 50,
    offset: 0
  })

  const loadRuns = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = {
        limit: filter.limit,
        offset: filter.offset
      }
      
      if (filter.status !== 'all') {
        params.status = filter.status
      }
      
      const data = await orchestrationService.listRuns(params)
      setRuns(data)
    } catch (err) {
      console.error('Failed to load orchestration history:', err)
      setError(err.message)
      toast.error('Failed to load orchestration history')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  const handleViewRun = async (runId) => {
    try {
      const details = await orchestrationService.getRunDetails(runId)
      onSelectRun(details)
    } catch (err) {
      console.error('Failed to load run details:', err)
      toast.error('Failed to load run details')
    }
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'partial':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockClockwise size={24} weight="bold" className="text-primary" />
            <div>
              <CardTitle>Orchestration History</CardTitle>
              <CardDescription>
                Browse past orchestration runs with timestamps and status
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadRuns} disabled={loading}>
            {loading ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <FunnelSimple size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <div className="flex gap-2">
            <Button 
              variant={filter.status === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter({...filter, status: 'all', offset: 0})}
            >
              All
            </Button>
            <Button 
              variant={filter.status === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter({...filter, status: 'success', offset: 0})}
            >
              Success
            </Button>
            <Button 
              variant={filter.status === 'partial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter({...filter, status: 'partial', offset: 0})}
            >
              Partial
            </Button>
            <Button 
              variant={filter.status === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter({...filter, status: 'failed', offset: 0})}
            >
              Failed
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && runs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ClockClockwise size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No orchestration runs found</p>
            <p className="text-sm">
              {filter.status !== 'all' 
                ? `No runs with status "${filter.status}"`
                : 'Run your first orchestration to see it here'}
            </p>
          </div>
        )}

        {/* History table */}
        {!loading && !error && runs.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.runId}>
                    <TableCell className="font-mono text-xs">
                      {run.runId.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {run.recipeName || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(run.status)}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {run.successCount}/{run.agentCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {run.totalDuration ? (
                        <span className="text-sm">
                          {(run.totalDuration / 1000).toFixed(2)}s
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewRun(run.runId)}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination info */}
        {!loading && !error && runs.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {runs.length} run{runs.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
