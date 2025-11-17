import React, { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Sparkle,
  Plus,
  Trash,
  MagnifyingGlass,
  Flask,
  CurrencyDollar,
  Drop,
  Shield,
  PaintBrush,
  Atom,
  Calculator,
  GearSix,
  Factory,
  Gauge,
  Certificate
} from '@phosphor-icons/react'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'
import { 
  UNIT_OPERATIONS as FALLBACK_OPERATIONS, 
  MATERIAL_GRADES as FALLBACK_GRADES, 
  EQUIPMENT_CAPABILITIES,
  calculateProcessingCost 
} from '@/lib/isa88-model'
import { convertUnits } from '@/lib/engines/scaling'

const INGREDIENT_TYPES = [
  { value: 'ingredient', label: 'Food Ingredient', icon: Flask, color: 'blue' },
  { value: 'additive', label: 'Additive', icon: Atom, color: 'orange' },
  { value: 'preservative', label: 'Preservative', icon: Shield, color: 'green' },
  { value: 'colorant', label: 'Colorant', icon: PaintBrush, color: 'pink' },
  { value: 'concentrate', label: 'Concentrate', icon: Drop, color: 'purple' }
]

const UNITS = ['g', 'kg', 'mg', 'lb', 'oz', 'ml', 'L', 'fl_oz', 'gal', 'ppm']

// Base units for normalization
const BASE_MASS_UNIT = 'g'
const BASE_VOLUME_UNIT = 'ml'

// Unit type classification
const MASS_UNITS = ['g', 'kg', 'mg', 'lb', 'oz']
const VOLUME_UNITS = ['ml', 'L', 'fl_oz', 'gal']
const CONCENTRATION_UNITS = ['ppm']

// Helper to get unit type
const getUnitType = (unit) => {
  if (MASS_UNITS.includes(unit)) return 'mass'
  if (VOLUME_UNITS.includes(unit)) return 'volume'
  if (CONCENTRATION_UNITS.includes(unit)) return 'concentration'
  return 'unknown'
}

export function FormulationCalculator() {
  const [formulaName, setFormulaName] = useState('')
  const [targetServings, setTargetServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [ingredientType, setIngredientType] = useState('ingredient')
  const [isSearching, setIsSearching] = useState(false)
  const [batchSize, setBatchSize] = useState(100)
  const [batchUnit, setBatchUnit] = useState('L')
  const [selectedOperations, setSelectedOperations] = useState([])
  const [materialGrade, setMaterialGrade] = useState('food_grade')
  const [expandedRows, setExpandedRows] = useState(new Set())
  
  // ISA-88 data from Neo4j
  const [UNIT_OPERATIONS, setUnitOperations] = useState(FALLBACK_OPERATIONS)
  const [MATERIAL_GRADES, setMaterialGrades] = useState(FALLBACK_GRADES)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load ISA-88 data from Neo4j on mount
  useEffect(() => {
    const loadManufacturingData = async () => {
      try {
        const data = await apiService.getManufacturingData()
        if (data.unit_operations) {
          setUnitOperations(data.unit_operations)
        }
        if (data.material_grades) {
          setMaterialGrades(data.material_grades)
        }
        toast.success('✓ Loaded manufacturing data from Neo4j')
      } catch (error) {
        console.error('Failed to load manufacturing data:', error)
        toast.warning('Using fallback manufacturing data')
      } finally {
        setIsLoadingData(false)
      }
    }
    
    loadManufacturingData()
  }, [])

  const getTypeColor = (type) => {
    const colors = {
      additive: 'from-orange-50 to-orange-100 border-orange-500',
      preservative: 'from-green-50 to-green-100 border-green-500',
      colorant: 'from-pink-50 to-pink-100 border-pink-500',
      concentrate: 'from-purple-50 to-purple-100 border-purple-500'
    }
    return colors[type] || 'from-gray-50 to-blue-50 border-blue-500'
  }

  const searchIngredient = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter an ingredient name')
      return
    }

    setIsSearching(true)
    try {
      // Use quick-ingest to search FDC AND commit to Neo4j with GraphRAG
      const ingestResults = await apiService.quickIngestFDC(searchQuery, { count: 1 })
      
      if (ingestResults?.success_count > 0) {
        // Now fetch the ingested food from Neo4j to get complete graph data
        const fdcResults = await apiService.listFDCFoods({ search: searchQuery, pageSize: 1, includeNutrients: true })
        
        if (fdcResults?.items?.length > 0) {
          const food = fdcResults.items[0]
          const nutrients = Array.isArray(food.nutrients) ? food.nutrients : []
          
          // Map nutrients to macros
          const macros = {
            calories: nutrients.find(n => n.nutrientName?.toLowerCase().includes('energy'))?.value || 0,
            protein: nutrients.find(n => n.nutrientName?.toLowerCase().includes('protein'))?.value || 0,
            carbs: nutrients.find(n => n.nutrientName?.toLowerCase().includes('carbohydrate'))?.value || 0,
            fat: nutrients.find(n => n.nutrientName?.toLowerCase().includes('fat'))?.value || 0,
            fiber: nutrients.find(n => n.nutrientName?.toLowerCase().includes('fiber'))?.value || 0
          }

          const newIngredient = {
            id: Date.now(),
            name: food.description,
            type: ingredientType,
            quantity: 100,
            unit: 'g',
            macros,
            fdcId: food.fdcId,
            cost: 0,
            materialGrade: 'food_grade',
            unitOperation: '',
            equipment: '',
            functionalProperties: {
              function: food.foodCategory || '',
              eNumber: '',
              effectiveDose: ''
            },
            regulatory: {
              fdaStatus: food.dataType || '',
              euStatus: ''
            }
          }

          setIngredients([...ingredients, newIngredient])
          setSearchQuery('')
          toast.success(`✓ Added ${food.description} (saved to Neo4j graph)`)
        } else {
          toast.error('Food was ingested but could not be retrieved from Neo4j')
        }
      } else {
        toast.error('Ingredient not found in FDC database')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search ingredient')
    } finally {
      setIsSearching(false)
    }
  }

  const removeIngredient = (id) => {
    setIngredients(ingredients.filter(ing => ing.id !== id))
  }

  const addManualIngredient = () => {
    const newIngredient = {
      id: Date.now(),
      name: 'New Ingredient',
      type: ingredientType,
      quantity: 100,
      unit: 'g',
      macros: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      },
      cost: 0,
      materialGrade: 'food_grade',
      unitOperation: '',
      equipment: ''
    }
    setIngredients([...ingredients, newIngredient])
    toast.success('Ingredient added - click name to edit')
  }

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ))
  }

  // Normalize quantity to base unit (g for mass, ml for volume)
  const normalizeQuantity = (quantity, unit) => {
    if (CONCENTRATION_UNITS.includes(unit)) {
      // PPM stays as-is for now
      return parseFloat(quantity) || 0
    }
    
    const qty = parseFloat(quantity) || 0
    
    try {
      if (MASS_UNITS.includes(unit)) {
        return convertUnits(qty, unit, BASE_MASS_UNIT)
      } else if (VOLUME_UNITS.includes(unit)) {
        return convertUnits(qty, unit, BASE_VOLUME_UNIT)
      }
      return qty
    } catch (error) {
      console.warn(`Unit conversion error: ${unit}`, error)
      return qty
    }
  }

  const totals = useMemo(() => {
    const result = {
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      cost: 0,
      weight: 0, // in grams
      volume: 0  // in ml
    }

    ingredients.forEach(ing => {
      const normalizedQty = normalizeQuantity(ing.quantity, ing.unit)
      
      // Determine if this is mass or volume based
      const isMass = MASS_UNITS.includes(ing.unit)
      const isVolume = VOLUME_UNITS.includes(ing.unit)
      
      if (isMass) {
        result.weight += normalizedQty
      } else if (isVolume) {
        result.volume += normalizedQty
      }
      
      // Macros are per 100g, so calculate factor based on grams
      const gramsForMacros = isMass ? normalizedQty : normalizedQty // assume 1ml = 1g for liquids
      const factor = gramsForMacros / 100
      
      if (ing.macros) {
        Object.keys(ing.macros).forEach(key => {
          result.macros[key] = (result.macros[key] || 0) + (ing.macros[key] * factor)
        })
      }
      
      result.cost += (ing.cost || 0) * factor
    })

    return result
  }, [ingredients])

  const perServing = useMemo(() => {
    const servings = parseFloat(targetServings) || 1
    return {
      macros: Object.fromEntries(Object.entries(totals.macros).map(([k, v]) => [k, v / servings])),
      cost: totals.cost / servings,
      weight: totals.weight / servings,
      volume: totals.volume / servings
    }
  }, [totals, targetServings])

  const manufacturingCost = useMemo(() => {
    if (selectedOperations.length === 0 || !batchSize) return null
    
    const batchSizeL = batchUnit === 'L' ? parseFloat(batchSize) : parseFloat(batchSize) / 1000
    const cost = calculateProcessingCost(selectedOperations, batchSizeL)
    
    // Apply material grade multiplier
    const gradeMultiplier = MATERIAL_GRADES[materialGrade]?.cost_multiplier || 1.0
    
    return {
      ...cost,
      total_with_grade: cost.total_processing_cost * gradeMultiplier,
      cost_per_liter_with_grade: cost.cost_per_liter * gradeMultiplier,
      grade_multiplier: gradeMultiplier
    }
  }, [selectedOperations, batchSize, batchUnit, materialGrade, MATERIAL_GRADES])

  const toggleOperation = (opKey) => {
    setSelectedOperations(prev =>
      prev.includes(opKey)
        ? prev.filter(k => k !== opKey)
        : [...prev, opKey]
    )
  }

  // Scale entire formula to different batch size
  const scaleToBatchSize = (newSize, newUnit) => {
    if (!batchSize || !newSize) return

    try {
      const currentSizeNormalized = normalizeQuantity(batchSize, batchUnit)
      const newSizeNormalized = normalizeQuantity(newSize, newUnit)
      const scaleFactor = newSizeNormalized / currentSizeNormalized

      const scaledIngredients = ingredients.map(ing => ({
        ...ing,
        quantity: (parseFloat(ing.quantity) * scaleFactor).toFixed(3)
      }))

      setIngredients(scaledIngredients)
      setBatchSize(newSize)
      setBatchUnit(newUnit)
      toast.success(`Formula scaled by ${scaleFactor.toFixed(2)}x`)
    } catch (error) {
      toast.error('Failed to scale formula: incompatible units')
    }
  }

  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-emerald-50">
        <div className="flex items-center gap-3 mb-2">
          <Sparkle className="w-8 h-8 text-purple-600" weight="fill" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Professional Food Formulation System
          </h1>
        </div>
        <p className="text-muted-foreground">
          ISA-88 compliant Bill of Materials with manufacturing operations, equipment, and cost tracking
        </p>
      </Card>

      {/* Formula Settings & Add Ingredient */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Formula Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="formula-name">Formula Name</Label>
            <Input
              id="formula-name"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              placeholder="e.g., Sports Drink Formula"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-size">Batch Size</Label>
            <div className="flex gap-2">
              <Input
                id="batch-size"
                type="number"
                min="1"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="flex-1"
              />
              <Select value={batchUnit} onValueChange={setBatchUnit}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-servings">Target Servings</Label>
            <Input
              id="target-servings"
              type="number"
              min="1"
              value={targetServings}
              onChange={(e) => setTargetServings(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Material Grade</Label>
            <Select value={materialGrade} onValueChange={setMaterialGrade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MATERIAL_GRADES).map(([key, grade]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Certificate size={14} weight="fill" />
                      <span className="text-sm">{grade.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Add Ingredients</Label>
          <div className="flex gap-3">
            <Select value={ingredientType} onValueChange={setIngredientType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INGREDIENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search FDC database: e.g., water, sugar, whey protein..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchIngredient()}
              className="flex-1"
            />
            <Button
              onClick={searchIngredient}
              disabled={isSearching}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlass size={18} weight="bold" />
                  Search FDC
                </>
              )}
            </Button>
            <Button
              onClick={addManualIngredient}
              variant="secondary"
              className="gap-2"
            >
              <Plus size={18} weight="bold" />
              Add Manually
            </Button>
          </div>
        </div>
      </Card>

      {/* Bill of Materials Table */}
      {ingredients.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Bill of Materials</h2>
            <Badge variant="outline">{ingredients.length} items</Badge>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left p-3 font-semibold text-sm">Item #</th>
                  <th className="text-left p-3 font-semibold text-sm">Material Description</th>
                  <th className="text-left p-3 font-semibold text-sm">Type</th>
                  <th className="text-right p-3 font-semibold text-sm">Quantity</th>
                  <th className="text-left p-3 font-semibold text-sm">UoM</th>
                  <th className="text-left p-3 font-semibold text-sm">Material Grade</th>
                  <th className="text-left p-3 font-semibold text-sm">Unit Operation</th>
                  <th className="text-left p-3 font-semibold text-sm">Equipment</th>
                  <th className="text-right p-3 font-semibold text-sm">Cost</th>
                  <th className="text-center p-3 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, index) => (
                  <React.Fragment key={ing.id}>
                    <tr className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">{String(index + 1).padStart(3, '0')}</td>
                    <td className="p-3">
                      <div>
                        <Input
                          value={ing.name}
                          onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                          className="font-semibold text-sm border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {ing.fdcId && (
                          <div className="text-xs text-gray-500">FDC: {ing.fdcId}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ing.type}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.001"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                        className="w-24 text-right text-sm h-8"
                      />
                    </td>
                    <td className="p-3">
                      <Select
                        value={ing.unit}
                        onValueChange={(value) => updateIngredient(ing.id, 'unit', value)}
                      >
                        <SelectTrigger className="w-20 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="text-xs font-semibold px-2 py-1 text-gray-500">Mass</div>
                          {MASS_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit} className="text-sm">{unit}</SelectItem>
                          ))}
                          <div className="text-xs font-semibold px-2 py-1 text-gray-500 border-t mt-1">Volume</div>
                          {VOLUME_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit} className="text-sm">{unit}</SelectItem>
                          ))}
                          <div className="text-xs font-semibold px-2 py-1 text-gray-500 border-t mt-1">Other</div>
                          {CONCENTRATION_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit} className="text-sm">{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Select
                        value={ing.materialGrade || 'food_grade'}
                        onValueChange={(value) => updateIngredient(ing.id, 'materialGrade', value)}
                      >
                        <SelectTrigger className="w-36 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MATERIAL_GRADES).map(([key, grade]) => (
                            <SelectItem key={key} value={key} className="text-sm">
                              <div className="flex items-center gap-2">
                                <Certificate size={14} weight="fill" />
                                <span>{grade.name}</span>
                                <span className="text-xs text-gray-500">({grade.cost_multiplier}x)</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Select
                        value={ing.unitOperation || 'none'}
                        onValueChange={(value) => updateIngredient(ing.id, 'unitOperation', value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {Object.keys(UNIT_OPERATIONS).map(op => (
                            <SelectItem key={op} value={op} className="text-sm capitalize">
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Select
                        value={ing.equipment || 'none'}
                        onValueChange={(value) => updateIngredient(ing.id, 'equipment', value)}
                        disabled={!ing.unitOperation || ing.unitOperation === 'none'}
                      >
                        <SelectTrigger className="w-40 h-8 text-sm">
                          <SelectValue placeholder="Select operation first" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {ing.unitOperation && ing.unitOperation !== 'none' && UNIT_OPERATIONS[ing.unitOperation]?.equipment_types?.map(eq => (
                            <SelectItem key={eq} value={eq} className="text-sm">
                              {eq}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={ing.cost || 0}
                        onChange={(e) => updateIngredient(ing.id, 'cost', parseFloat(e.target.value) || 0)}
                        className="w-24 text-right text-sm h-8"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        {ing.unitOperation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(ing.id)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View parameters"
                          >
                            <GearSix size={16} weight={expandedRows.has(ing.id) ? 'fill' : 'regular'} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIngredient(ing.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash size={16} weight="bold" />
                        </Button>
                      </div>
                    </td>
                    </tr>
                    {/* Expanded Row for Process Parameters */}
                    {ing.unitOperation && ing.unitOperation !== 'none' && expandedRows.has(ing.id) && (
                      <tr className="bg-blue-50 border-b">
                        <td colSpan="10" className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs font-semibold text-gray-600">Operation Details</Label>
                            <div className="text-sm mt-1">
                              <div className="flex items-center gap-2">
                                <GearSix size={14} weight="fill" />
                                <span className="font-semibold capitalize">{ing.unitOperation}</span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Time: {UNIT_OPERATIONS[ing.unitOperation]?.typical_time_min || 0} min
                              </div>
                              <div className="text-xs text-gray-600">
                                Cost: ${UNIT_OPERATIONS[ing.unitOperation]?.cost_per_hour || 0}/hr
                              </div>
                            </div>
                          </div>
                          {UNIT_OPERATIONS[ing.unitOperation]?.parameters && (
                            <>
                              {UNIT_OPERATIONS[ing.unitOperation].parameters.slice(0, 3).map((param, idx) => (
                                <div key={idx}>
                                  <Label className="text-xs font-semibold text-gray-600 capitalize">
                                    {param.replace(/_/g, ' ')}
                                  </Label>
                                  <div className="flex gap-2 mt-1">
                                    <Input
                                      type="number"
                                      placeholder="Value"
                                      className="h-8 text-sm"
                                      value={ing.processParams?.[param] || ''}
                                      onChange={(e) => {
                                        const params = { ...(ing.processParams || {}), [param]: e.target.value }
                                        updateIngredient(ing.id, 'processParams', params)
                                      }}
                                    />
                                    <Select
                                      value={ing.processParamUnits?.[param] || 'default'}
                                      onValueChange={(value) => {
                                        const units = { ...(ing.processParamUnits || {}), [param]: value }
                                        updateIngredient(ing.id, 'processParamUnits', units)
                                      }}
                                    >
                                      <SelectTrigger className="w-20 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem key="default-unit" value="default">-</SelectItem>
                                        {param.includes('temp') && (
                                          <>
                                            <SelectItem value="°C">°C</SelectItem>
                                            <SelectItem value="°F">°F</SelectItem>
                                            <SelectItem value="K">K</SelectItem>
                                          </>
                                        )}
                                        {param.includes('time') && (
                                          <>
                                            <SelectItem value="s">s</SelectItem>
                                            <SelectItem value="min">min</SelectItem>
                                            <SelectItem value="hr">hr</SelectItem>
                                          </>
                                        )}
                                        {param.includes('rpm') && <SelectItem value="rpm">rpm</SelectItem>}
                                        {param.includes('pressure') && (
                                          <>
                                            <SelectItem value="bar">bar</SelectItem>
                                            <SelectItem value="psi">psi</SelectItem>
                                            <SelectItem value="Pa">Pa</SelectItem>
                                          </>
                                        )}
                                        {param.includes('flow') && (
                                          <>
                                            <SelectItem value="L/min">L/min</SelectItem>
                                            <SelectItem value="gpm">gpm</SelectItem>
                                          </>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td colSpan="3" className="p-3 text-sm">TOTAL</td>
                  <td className="p-3 text-right text-sm">
                    {totals.weight > 0 && `${totals.weight.toFixed(2)} g`}
                    {totals.volume > 0 && ` / ${totals.volume.toFixed(2)} ml`}
                  </td>
                  <td colSpan="4" className="p-3"></td>
                  <td className="p-3 text-right text-sm">${totals.cost.toFixed(2)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      {ingredients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={24} className="text-blue-600" weight="bold" />
              <h3 className="text-xl font-bold">Total Formula</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold">Total Weight:</span>
                <span className="font-bold">{totals.weight.toFixed(1)}g</span>
              </div>
              {totals.volume > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Volume:</span>
                  <span className="font-semibold">{totals.volume.toFixed(1)}ml</span>
                </div>
              )}
              <Separator />
              {Object.entries(totals.macros).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-semibold capitalize">{key}:</span>
                  <span className="font-bold">{value.toFixed(1)}{key === 'calories' ? ' kcal' : 'g'}</span>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
                <span className="font-bold text-lg flex items-center gap-2">
                  <CurrencyDollar size={20} weight="bold" />
                  Ingredient Cost:
                </span>
                <span className="text-3xl font-bold text-blue-600">${totals.cost.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <Flask size={24} className="text-emerald-600" weight="bold" />
              <h3 className="text-xl font-bold">Per Serving</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold">Serving Size:</span>
                <span className="font-bold">
                  {perServing.weight.toFixed(1)}g
                  {perServing.volume > 0 && ` / ${perServing.volume.toFixed(1)}ml`}
                </span>
              </div>
              <Separator />
              {Object.entries(perServing.macros).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-semibold capitalize">{key}:</span>
                  <span className="font-bold">{value.toFixed(1)}{key === 'calories' ? ' kcal' : 'g'}</span>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between items-center pt-3 border-t-2 border-emerald-300">
                <span className="font-bold text-lg flex items-center gap-2">
                  <CurrencyDollar size={20} weight="bold" />
                  Cost Per Serving:
                </span>
                <span className="text-3xl font-bold text-emerald-600">${perServing.cost.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {manufacturingCost && (
            <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center gap-2 mb-4">
                <Factory size={24} className="text-orange-600" weight="bold" />
                <h3 className="text-xl font-bold">Manufacturing</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Batch Size:</span>
                  <span className="font-bold">{batchSize} {batchUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Grade:</span>
                  <Badge variant="secondary">{MATERIAL_GRADES[materialGrade].name}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Operations:</span>
                  <span className="font-bold">{selectedOperations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Base Cost:</span>
                  <span className="font-bold">${manufacturingCost.total_processing_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Grade Multiplier:</span>
                  <span className="font-semibold">{manufacturingCost.grade_multiplier}x</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center pt-3 border-t-2 border-orange-300">
                  <span className="font-bold text-lg flex items-center gap-2">
                    <CurrencyDollar size={20} weight="bold" />
                    Total:
                  </span>
                  <span className="text-3xl font-bold text-orange-600">
                    ${manufacturingCost.total_with_grade.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-center text-muted-foreground mt-2">
                  ${manufacturingCost.cost_per_liter_with_grade.toFixed(3)}/L • {manufacturingCost.scale_category}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {ingredients.length === 0 && (
        <Card className="p-12 text-center">
          <Sparkle className="w-16 h-16 mx-auto mb-4 opacity-20 text-muted-foreground" weight="fill" />
          <p className="text-lg text-muted-foreground">Use AI search to analyze ingredients at molecular level</p>
          <p className="text-sm text-muted-foreground mt-2">
            Get comprehensive data on nutrition, additives, preservatives, colorants and concentrates
          </p>
        </Card>
      )}
    </div>
  )
}
