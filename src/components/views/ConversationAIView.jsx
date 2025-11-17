import { useCallback, useEffect, useState } from 'react'
import { AIAssistantPanel } from '@/components/AIAssistantPanel'
import { FormulationCalculator } from '@/components/FormulationCalculator'
import { apiService } from '@/lib/api/service'
import { normalizeFormulation } from '@/lib/utils/formulation-utils'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChatsCircle,
  Calculator,
  Brain
} from '@phosphor-icons/react'

export function ConversationAIView({ backendUrl }) {
  const [formulations, setFormulations] = useState([])
  const [loadingFormulations, setLoadingFormulations] = useState(false)
  const [selectedFormulationId, setSelectedFormulationId] = useState(null)

  useEffect(() => {
    if (backendUrl) {
      apiService.setBaseUrl(backendUrl)
    }
  }, [backendUrl])

  const loadFormulations = useCallback(async () => {
    setLoadingFormulations(true)
    try {
      const data = await apiService.getFormulations()
      const items = Array.isArray(data?.formulations)
        ? data.formulations.map(normalizeFormulation).filter(Boolean)
        : []
      setFormulations(items)

      if (!selectedFormulationId && items.length > 0) {
        setSelectedFormulationId(items[0].id)
      } else if (selectedFormulationId) {
        const exists = items.some((item) => item.id === selectedFormulationId)
        if (!exists && items.length > 0) {
          setSelectedFormulationId(items[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load formulations', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load formulations')
    } finally {
      setLoadingFormulations(false)
    }
  }, [selectedFormulationId])

  useEffect(() => {
    loadFormulations()
  }, [loadFormulations])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ChatsCircle size={28} weight="fill" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conversation AI</h2>
            <p className="text-muted-foreground text-sm">
              Intelligent AI assistant with GraphRAG, nutrition label calculator, ingredient impact analysis, and smart composition recommendations.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="assistant" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assistant" className="gap-2">
            <Brain size={16} />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator size={16} />
            Professional Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="mt-6">
          <div className="max-w-5xl mx-auto">
            <AIAssistantPanel
              formulations={formulations}
              activeFormulationId={selectedFormulationId || undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="mt-6">
          <div className="max-w-7xl mx-auto">
            <FormulationCalculator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConversationAIView
