import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NutritionLabel } from './nutrition/NutritionLabel'
import { NutritionLabelHistory } from './nutrition/NutritionLabelHistory'
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
  CurrencyDollarSimple,
  ArrowsClockwise,
  GearSix,
  Lightbulb,
  FloppyDiskBack,
  Plus,
  Minus,
  Calculator as CalcIcon,
  Swap
} from '@phosphor-icons/react'
import { aiAssistant } from '@/lib/ai'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'

const SUGGESTED_QUERIES = [
  "Generate nutrition label for [formulation name]",
  "Show all recipes using mango concentrate with yield < 90%",
  "Suggest low-cost substitutes for vanilla extract",
  "What ingredients contribute most to calories in [formulation]?",
  "Recommend healthier alternatives for [formulation name]",
  "Find ingredients that could be substituted to reduce cost",
  "Calculate nutrition for 250mL serving of [formulation]",
  "What formulations have the highest protein content?"
]

export function AIAssistantPanel({ formulations = [], activeFormulationId }) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])

  // Nutrition Label State
  const [selectedFormulationId, setSelectedFormulationId] = useState(activeFormulationId || null)
  const [nutritionLabel, setNutritionLabel] = useState(null)
  const [generatingLabel, setGeneratingLabel] = useState(false)
  const [servingSize, setServingSize] = useState(355)
  const [servingUnit, setServingUnit] = useState('mL')
  const [servingsPerContainer, setServingsPerContainer] = useState('1')
  const [analyzingImpact, setAnalyzingImpact] = useState(false)

  const handleSubmit = async (queryText) => {
    const questionText = queryText || query
    if (!questionText.trim()) {
      toast.error('Please enter a question')
      return
    }

    setIsLoading(true)
    setQuery(queryText || query)

    try {
      // Check if query is asking for nutrition label generation
      const nutritionKeywords = ['nutrition', 'label', 'calculate nutrition', 'generate label', 'show nutrition']
      const isNutritionQuery = nutritionKeywords.some(keyword => 
        questionText.toLowerCase().includes(keyword)
      )

      // Auto-detect formulation from query or use selected one
      let formulationToUse = selectedFormulationId
      if (!formulationToUse && formulations.length > 0) {
        const mentionedFormulation = formulations.find(f => 
          questionText.toLowerCase().includes(f.name.toLowerCase())
        )
        if (mentionedFormulation) {
          formulationToUse = mentionedFormulation.id
          setSelectedFormulationId(formulationToUse)
        }
      }

      // If nutrition query and we have a formulation, generate label
      if (isNutritionQuery && formulationToUse) {
        await handleGenerateLabel(formulationToUse, questionText)
      }

      const result = await aiAssistant.query({
        question: questionText,
        context: {
          formulations,
          activeFormulationId: formulationToUse || activeFormulationId || undefined,
          nutritionLabel: nutritionLabel || undefined,
          servingSize,
          servingUnit
        }
      })

      setResponse(result)
      
      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'user',
          content: questionText,
          timestamp: new Date().toISOString()
        },
        {
          id: Date.now() + 1,
          type: 'assistant',
          content: result.answer,
          confidence: result.confidence,
          executionTime: result.executionTime,
          sources: result.sources,
          recommendations: result.recommendations,
          timestamp: new Date().toISOString()
        }
      ])
      
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

  const handleSuggestedQuery = (suggestedQuery) => {
    setQuery(suggestedQuery)
    handleSubmit(suggestedQuery)
  }

  const handleCopyAnswer = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer)
      toast.success('Answer copied to clipboard')
    }
  }

  const handleGenerateLabel = async (formulationId = null, sourceQuery = null) => {
    const idToUse = formulationId || selectedFormulationId
    if (!idToUse) {
      toast.error('Select a formulation first')
      return
    }

    setGeneratingLabel(true)
    try {
      const servingsValue = parseFloat(servingsPerContainer)
      const result = await apiService.generateNutritionLabel(idToUse, {
        servingSize: Number(servingSize) || 100,
        servingSizeUnit: servingUnit || 'g',
        servingsPerContainer: Number.isFinite(servingsValue) && servingsValue > 0 ? servingsValue : undefined,
      })
      setNutritionLabel(result)
      
      if (sourceQuery) {
        toast.success(`Nutrition label generated for ${result.formulation_name}`)
      } else {
        toast.success('Nutrition label generated')
      }
    } catch (error) {
      console.error('Failed to generate nutrition label', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate nutrition label')
    } finally {
      setGeneratingLabel(false)
    }
  }

  const handleServingSizeChange = (delta) => {
    const newSize = Math.max(1, servingSize + delta)
    setServingSize(newSize)
    
    // Auto-regenerate if label exists
    if (nutritionLabel && selectedFormulationId) {
      setTimeout(() => handleGenerateLabel(), 300)
    }
  }

  const handleAnalyzeImpact = async () => {
    if (!selectedFormulationId || !nutritionLabel) {
      toast.error('Generate a nutrition label first')
      return
    }

    setAnalyzingImpact(true)
    try {
      const analysisQuestion = `Analyze the nutritional impact of ${nutritionLabel.formulation_name}. Which ingredients contribute most to calories, fat, and sodium? Suggest healthier alternatives that maintain flavor profile.`
      await handleSubmit(analysisQuestion)
    } finally {
      setAnalyzingImpact(false)
    }
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-blue-600 bg-blue-50'
    }
  }

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'high': return <TrendUp size={16} weight="bold" />
      case 'medium': return <Equals size={16} weight="bold" />
      case 'low': return <TrendDown size={16} weight="bold" />
    }
  }

  const recommendationIconMap = {
    cost_optimization: CurrencyDollarSimple,
    yield_improvement: TrendUp,
    substitution: ArrowsClockwise,
    process_optimization: GearSix,
    quality_enhancement: Sparkle,
  }

  const getRecommendationIcon = (type) => {
    const IconComponent = recommendationIconMap[type] || Lightbulb
    return <IconComponent size={18} weight="bold" className="text-primary" />
  }

  const handleClearHistory = () => {
    setConversationHistory([])
    setResponse(null)
    toast.success('Conversation cleared')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main AI Assistant */}
      <div className="lg:col-span-2 space-y-6">
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-primary" weight="bold" />
                <h3 className="font-semibold text-sm">Conversation History</h3>
                <Badge variant="secondary" className="text-xs">
                  {conversationHistory.filter(m => m.type === 'user').length} messages
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearHistory}
                className="gap-2 text-xs"
              >
                <ArrowsClockwise size={14} />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {conversationHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkle className="text-white" size={16} weight="bold" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.type === 'assistant' && message.confidence && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          <Badge variant="outline" className="text-xs">
                            {message.executionTime}ms
                          </Badge>
                          <Badge 
                            variant={message.confidence > 0.7 ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {Math.round(message.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      )}
                      {message.type === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {source.type === 'neo4j' && <Database size={10} className="mr-1" />}
                                {source.type === 'llm' && <Sparkle size={10} className="mr-1" />}
                                {source.description}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">You</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkle className="text-white" size={24} weight="bold" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                AI-Powered Nutrition Assistant
                <Badge variant="secondary" className="text-xs">
                  <Lightning size={12} weight="fill" className="mr-1" />
                  GraphRAG + GPT-4
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ask questions to analyze formulations, generate nutrition labels, get ingredient recommendations, and optimize compositions. Just type naturally!
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'Generate nutrition label for Cola Formula' or 'Suggest alternatives to reduce sugar'"
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
              <p className="text-xs font-semibold text-muted-foreground mb-3">Try These:</p>
              <div className="grid grid-cols-1 gap-2">
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
                          <span className="text-lg flex items-center">{getRecommendationIcon(rec.type)}</span>
                          <h4 className="font-semibold text-sm">{rec.title}</h4>
                        </div>
                        <Badge className={`text-xs ${getImpactColor(rec.impact)}`}>
                          {getImpactIcon(rec.impact)}
                          <span className="ml-1">{rec.impact} impact</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/80">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Nutrition Label Widget Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="p-4 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <FloppyDiskBack size={18} className="text-primary" weight="bold" />
            <h3 className="font-semibold text-sm">Nutrition Label</h3>
            <Badge variant="secondary" className="text-xs ml-auto">FDA</Badge>
          </div>

          {!nutritionLabel && (
            <div className="text-center py-8 text-muted-foreground">
              <CalcIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                Ask AI to generate a nutrition label or select a formulation below
              </p>
            </div>
          )}

          {nutritionLabel && (
            <div className="space-y-3">
              <NutritionLabel nutritionFacts={nutritionLabel} />
              
              <Separator />
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeImpact}
                  disabled={analyzingImpact}
                  className="gap-2 w-full"
                >
                  <Swap size={14} />
                  Analyze Impact
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuery(`Suggest lower-calorie alternatives for ingredients in ${nutritionLabel.formulation_name}`)}
                  className="gap-2 w-full"
                >
                  <Lightbulb size={14} />
                  Get Alternatives
                </Button>
              </div>

              <Separator />

              {selectedFormulationId && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Label History</h4>
                  <NutritionLabelHistory formulationId={selectedFormulationId} />
                </div>
              )}
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <Label htmlFor="formulation-select-widget" className="text-xs">Quick Generate</Label>
            <Select
              value={selectedFormulationId ?? ''}
              onValueChange={(value) => setSelectedFormulationId(value)}
              disabled={formulations.length === 0}
            >
              <SelectTrigger id="formulation-select-widget" className="h-8 text-xs">
                <SelectValue placeholder="Select formulation" />
              </SelectTrigger>
              <SelectContent>
                {formulations.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="serving-size-widget" className="text-xs">Size</Label>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleServingSizeChange(-10)}
                    disabled={servingSize <= 1}
                    className="h-7 w-7"
                  >
                    <Minus size={12} />
                  </Button>
                  <Input
                    id="serving-size-widget"
                    type="number"
                    min={1}
                    value={servingSize}
                    onChange={(e) => setServingSize(Number(e.target.value) || 100)}
                    className="text-center h-7 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleServingSizeChange(10)}
                    className="h-7 w-7"
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="serving-unit-widget" className="text-xs">Unit</Label>
                <Input
                  id="serving-unit-widget"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <Button 
              onClick={() => handleGenerateLabel()} 
              disabled={generatingLabel || !selectedFormulationId} 
              size="sm"
              className="gap-2 w-full"
            >
              {generatingLabel ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Sparkle size={14} />
                  Generate
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
