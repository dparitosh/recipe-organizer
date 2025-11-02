import {
  MDGMaterial,
  SyncRequest,
  SyncResult,
  SyncError
} from '@/lib/schemas/integration'

const MDG_CONFIG = {
  baseUrl: import.meta.env.VITE_MDG_API_URL || 'https://sap.company.com/mdg/api',
  apiKey: import.meta.env.VITE_MDG_API_KEY || 'mock-key',
  client: import.meta.env.VITE_MDG_CLIENT || '100',
  plant: import.meta.env.VITE_MDG_PLANT || '1000'
}

export class MDGClient {
  private mockMode: boolean = true

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode
  }

  async getMasterData(materialNumber: string): Promise<MDGMaterial> {
    if (this.mockMode) {
      return this.mockGetMasterData(materialNumber)
    }

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/materials/${materialNumber}?client=${MDG_CONFIG.client}`,
      {
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`MDG get master data failed: ${response.statusText}`)
    }

    return response.json()
  }

  async createMaterial(material: MDGMaterial): Promise<string> {
    if (this.mockMode) {
      const materialNumber = this.generateMaterialNumber()
      console.log('Mock: Creating MDG material', materialNumber, material)
      return Promise.resolve(materialNumber)
    }

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/materials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      }
    )

    if (!response.ok) {
      throw new Error(`MDG create material failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.materialNumber
  }

  async updateMaterial(materialNumber: string, data: Partial<MDGMaterial>): Promise<void> {
    if (this.mockMode) {
      console.log('Mock: Updating MDG material', materialNumber, data)
      return Promise.resolve()
    }

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/materials/${materialNumber}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      throw new Error(`MDG update material failed: ${response.statusText}`)
    }
  }

  async validateMaterial(material: MDGMaterial): Promise<ValidationResult> {
    if (this.mockMode) {
      return this.mockValidateMaterial(material)
    }

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/materials/validate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      }
    )

    if (!response.ok) {
      throw new Error(`MDG validate material failed: ${response.statusText}`)
    }

    return response.json()
  }

  async syncMaterial(request: SyncRequest): Promise<SyncResult> {
    const startTime = Date.now()
    
    if (this.mockMode) {
      return this.mockSyncMaterial(request, startTime)
    }

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/sync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      }
    )

    if (!response.ok) {
      throw new Error(`MDG sync failed: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      ...result,
      duration: Date.now() - startTime
    }
  }

  async searchMaterials(query: string, filters?: MaterialSearchFilters): Promise<MDGMaterial[]> {
    if (this.mockMode) {
      return this.mockSearchMaterials(query)
    }

    const params = new URLSearchParams({
      q: query,
      client: MDG_CONFIG.client,
      ...filters
    })

    const response = await fetch(
      `${MDG_CONFIG.baseUrl}/materials/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${MDG_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`MDG search failed: ${response.statusText}`)
    }

    return response.json()
  }

  private generateMaterialNumber(): string {
    return `${Date.now().toString().slice(-8)}`
  }

  private mockGetMasterData(materialNumber: string): Promise<MDGMaterial> {
    return Promise.resolve({
      materialNumber,
      materialDescription: 'Orange Juice Concentrate 65 Brix',
      materialGroup: 'CONCEN',
      materialType: 'FERT',
      baseUnit: 'KG',
      alternateUnits: [
        { unit: 'L', conversionFactor: 1.05, ean: '1234567890123' },
        { unit: 'GAL', conversionFactor: 3.97 }
      ],
      valuationClass: '3000',
      procurementType: 'F',
      mrpType: 'PD',
      plant: '1000',
      storageLocation: '0001',
      standardCost: 12.50,
      lastCostUpdate: new Date('2024-01-15')
    })
  }

  private mockValidateMaterial(material: MDGMaterial): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    if (!material.materialDescription || material.materialDescription.length < 3) {
      errors.push('Material description must be at least 3 characters')
    }

    if (!material.baseUnit) {
      errors.push('Base unit is required')
    }

    if (!material.plant) {
      warnings.push('No plant assigned - material will not be available for production')
    }

    return Promise.resolve({
      valid: errors.length === 0,
      errors,
      warnings
    })
  }

  private mockSyncMaterial(request: SyncRequest, startTime: number): Promise<SyncResult> {
    const errors: SyncError[] = []
    const warnings: string[] = []

    request.materialIds.forEach(id => {
      if (Math.random() > 0.9) {
        errors.push({
          materialId: id,
          error: 'Material not found in source system',
          code: 'NOT_FOUND'
        })
      }
    })

    if (request.materialIds.length > 100) {
      warnings.push('Large batch sync - consider splitting into smaller batches')
    }

    return Promise.resolve({
      success: errors.length === 0,
      materialIds: request.materialIds.filter(id => 
        !errors.some(e => e.materialId === id)
      ),
      errors,
      warnings,
      syncedAt: new Date(),
      duration: Date.now() - startTime
    })
  }

  private mockSearchMaterials(query: string): Promise<MDGMaterial[]> {
    const mockMaterials: MDGMaterial[] = [
      {
        materialNumber: '10001234',
        materialDescription: 'Orange Juice Concentrate 65 Brix',
        materialGroup: 'CONCEN',
        materialType: 'FERT',
        baseUnit: 'KG',
        valuationClass: '3000',
        procurementType: 'F',
        mrpType: 'PD',
        plant: '1000',
        storageLocation: '0001',
        standardCost: 12.50
      },
      {
        materialNumber: '10001235',
        materialDescription: 'Citric Acid Anhydrous',
        materialGroup: 'CHEM',
        materialType: 'ROH',
        baseUnit: 'KG',
        valuationClass: '3100',
        procurementType: 'E',
        mrpType: 'ND',
        plant: '1000',
        storageLocation: '0002',
        standardCost: 2.30
      },
      {
        materialNumber: '10001236',
        materialDescription: 'Natural Orange Flavor',
        materialGroup: 'FLAVOR',
        materialType: 'ROH',
        baseUnit: 'L',
        valuationClass: '3200',
        procurementType: 'E',
        mrpType: 'VB',
        plant: '1000',
        storageLocation: '0001',
        standardCost: 45.00
      }
    ]

    return Promise.resolve(
      mockMaterials.filter(m =>
        m.materialDescription.toLowerCase().includes(query.toLowerCase()) ||
        m.materialNumber.includes(query)
      )
    )
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MaterialSearchFilters {
  materialGroup?: string
  materialType?: string
  plant?: string
}

export const mdgClient = new MDGClient(true)
