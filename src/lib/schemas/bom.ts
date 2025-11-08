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

export declare const BOM_PHASES: readonly ['procurement', 'production', 'packaging']

export declare function createEmptyBOM(formulationId: string): BOM

export declare function calculateBOMCost(bom: BOM): number

export declare function calculateLeadTime(bom: BOM): number

export declare function validateBOM(bom: BOM): string[]

export * from './bom.js'
