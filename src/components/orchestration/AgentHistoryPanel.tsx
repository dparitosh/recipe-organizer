import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from '@phosphor-icons/react'

interface AgentHistoryEntry {
  agent: string
  timestamp: string
  duration: number
  input: any
  output: any
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

interface AgentHistoryPanelProps {
  history: AgentHistoryEntry[]
}

export function AgentHistoryPanel({ history }: AgentHistoryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock />
          Execution Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded border text-sm">
              <div className="flex items-center gap-2">
                <div className="font-medium">{entry.agent}</div>
                <Badge variant={
                  entry.status === 'success' ? 'default' :
                  entry.status === 'failed' ? 'destructive' : 'secondary'
                } className="text-xs">
                  {entry.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.duration}ms
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
