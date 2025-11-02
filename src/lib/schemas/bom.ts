export interface BOM {
  id: string
  formulationId: string
  name: string
  batchSize: number
  batchUnit: string
  components: BOMComponent[]
  process: ProcessStep[]
  totalCost: number
  leadTime: number
  metadata: BOMMetadata
  createdAt: Date
  updatedAt: Date
}

export interface BOMComponent {
  id: string
  materialId: string
  description: string
  quantity: number
  unit: string
  phase: 'procurement' | 'production' | 'packaging'
  supplier?: string
  leadTime?: number
  cost: number
  substituteIds?: string[]
  specifications?: ComponentSpecification[]
}

export interface ComponentSpecification {
  parameter: string
  value: string | number
  unit?: string
  tolerance?: number
  testMethod?: string
}

export interface ProcessStep {
  id: string
  order: number
  name: string
  description: string
  duration: number
  durationUnit: 'minutes' | 'hours' | 'days'
  temperature?: number
  temperatureUnit?: 'C' | 'F'
  equipment?: string
  parameters: Record<string, any>
  yields?: ProcessYield
}

export interface ProcessYield {
  input: number
  output: number
  waste?: number
  unit: string
}

export interface BOMMetadata {
  productionSite: string
  validFrom: Date
  validTo?: Date
  sapBomId?: string
  revisionNumber: number
  approvedBy?: string
  notes?: string
}

export const BOM_PHASES = ['procurement', 'production', 'packaging'] as const

export function createEmptyBOM(formulationId: string): BOM {
  return {
    id: `bom-${Date.now()}`,
    formulationId,
    name: 'New BOM',
    batchSize: 100,
    batchUnit: 'kg',
    components: [],
    process: [],
    totalCost: 0,
    leadTime: 0,
    metadata: {
      productionSite: '',
      validFrom: new Date(),
      revisionNumber: 1
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function calculateBOMCost(bom: BOM): number {
  return bom.components.reduce((sum, comp) => sum + comp.cost * comp.quantity, 0)
}

export function calculateLeadTime(bom: BOM): number {
  const procurementTime = Math.max(
    ...bom.components
      .filter(c => c.phase === 'procurement')
      .map(c => c.leadTime || 0),
    0
  )

  const processTime = bom.process.reduce((sum, step) => {
    const hours = step.durationUnit === 'hours' ? step.duration :
                  step.durationUnit === 'days' ? step.duration * 24 :
                  step.duration / 60
    return sum + hours
  }, 0)

  return procurementTime + processTime / 24
}

export function validateBOM(bom: BOM): string[] {
  const errors: string[] = []

  if (!bom.name.trim()) {
    errors.push('BOM name is required')
  }

  if (bom.batchSize <= 0) {
    errors.push('Batch size must be positive')
  }

  if (bom.components.length === 0) {
    errors.push('At least one component is required')
  }

  bom.components.forEach((comp, idx) => {
    if (!comp.description.trim()) {
      errors.push(`Component ${idx + 1} is missing a description`)
    }
    if (comp.quantity <= 0) {
      errors.push(`Component "${comp.description}" must have positive quantity`)
    }
  })

  const processSteps = [...bom.process].sort((a, b) => a.order - b.order)
  processSteps.forEach((step, idx) => {
    if (step.order !== idx + 1) {
      errors.push(`Process step orders must be sequential (found ${step.order} at position ${idx + 1})`)
    }
  })

  return errors
}
