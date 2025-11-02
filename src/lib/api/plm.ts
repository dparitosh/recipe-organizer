import {
  PLMMaterial,
  MaterialSpecification,
  RegulatoryInfo,
  SupplierInfo
} from '@/lib/schemas/integration'

const PLM_CONFIG = {
  baseUrl: import.meta.env.VITE_PLM_API_URL || 'https://plm.company.com/api',
  apiKey: import.meta.env.VITE_PLM_API_KEY || 'mock-key'
}

export class PLMClient {
  private mockMode: boolean = true

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode
  }

  async searchMaterials(query: string): Promise<PLMMaterial[]> {
    if (this.mockMode) {
      return this.mockSearchMaterials(query)
    }

    const response = await fetch(
      `${PLM_CONFIG.baseUrl}/materials/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${PLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`PLM search failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getMaterial(materialId: string): Promise<PLMMaterial> {
    if (this.mockMode) {
      return this.mockGetMaterial(materialId)
    }

    const response = await fetch(
      `${PLM_CONFIG.baseUrl}/materials/${materialId}`,
      {
        headers: {
          'Authorization': `Bearer ${PLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`PLM get material failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getSpecifications(materialId: string): Promise<MaterialSpecification[]> {
    if (this.mockMode) {
      return this.mockGetSpecifications(materialId)
    }

    const response = await fetch(
      `${PLM_CONFIG.baseUrl}/materials/${materialId}/specifications`,
      {
        headers: {
          'Authorization': `Bearer ${PLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`PLM get specifications failed: ${response.statusText}`)
    }

    return response.json()
  }

  async updateMaterial(materialId: string, data: Partial<PLMMaterial>): Promise<void> {
    if (this.mockMode) {
      console.log('Mock: Updating PLM material', materialId, data)
      return Promise.resolve()
    }

    const response = await fetch(
      `${PLM_CONFIG.baseUrl}/materials/${materialId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${PLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      throw new Error(`PLM update material failed: ${response.statusText}`)
    }
  }

  async createMaterial(material: Omit<PLMMaterial, 'materialId' | 'lastSync'>): Promise<string> {
    if (this.mockMode) {
      const materialId = `PLM-${Date.now()}`
      console.log('Mock: Creating PLM material', materialId, material)
      return Promise.resolve(materialId)
    }

    const response = await fetch(
      `${PLM_CONFIG.baseUrl}/materials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PLM_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      }
    )

    if (!response.ok) {
      throw new Error(`PLM create material failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.materialId
  }

  private mockSearchMaterials(query: string): Promise<PLMMaterial[]> {
    const mockMaterials: PLMMaterial[] = [
      {
        materialId: 'PLM-001',
        description: 'Orange Extract Concentrate',
        type: 'raw',
        status: 'active',
        specifications: [
          {
            attribute: 'Brix',
            value: 65,
            unit: '°Bx',
            source: 'lab',
            lastUpdated: new Date()
          },
          {
            attribute: 'Acidity',
            value: 1.2,
            unit: '%',
            tolerance: 0.1,
            source: 'lab',
            lastUpdated: new Date()
          }
        ],
        regulatory: {
          fdaApproved: true,
          euApproved: true,
          allergens: [],
          certifications: ['Organic', 'Non-GMO'],
          grasStatus: true
        },
        supplier: {
          id: 'SUP-001',
          name: 'Citrus Suppliers Inc.',
          contact: 'orders@citrussuppliers.com',
          leadTime: 14,
          moq: 1000
        },
        lastSync: new Date()
      },
      {
        materialId: 'PLM-002',
        description: 'Citric Acid (Food Grade)',
        type: 'raw',
        status: 'active',
        specifications: [
          {
            attribute: 'Purity',
            value: 99.5,
            unit: '%',
            source: 'supplier',
            lastUpdated: new Date()
          }
        ],
        regulatory: {
          fdaApproved: true,
          euApproved: true,
          allergens: [],
          certifications: ['Food Grade'],
          grasStatus: true
        },
        supplier: {
          id: 'SUP-002',
          name: 'Chemical Solutions Ltd.',
          leadTime: 7,
          moq: 500
        },
        lastSync: new Date()
      },
      {
        materialId: 'PLM-003',
        description: 'Natural Orange Flavor',
        type: 'raw',
        status: 'active',
        specifications: [
          {
            attribute: 'Flavor Strength',
            value: 'High',
            source: 'PLM',
            lastUpdated: new Date()
          }
        ],
        regulatory: {
          fdaApproved: true,
          euApproved: true,
          allergens: [],
          certifications: ['Natural'],
          grasStatus: true
        },
        lastSync: new Date()
      }
    ]

    return Promise.resolve(
      mockMaterials.filter(m => 
        m.description.toLowerCase().includes(query.toLowerCase()) ||
        m.materialId.includes(query)
      )
    )
  }

  private mockGetMaterial(materialId: string): Promise<PLMMaterial> {
    return Promise.resolve({
      materialId,
      description: 'Orange Extract Concentrate',
      type: 'raw',
      status: 'active',
      specifications: [
        {
          attribute: 'Brix',
          value: 65,
          unit: '°Bx',
          source: 'lab',
          lastUpdated: new Date()
        },
        {
          attribute: 'pH',
          value: 3.5,
          unit: '',
          tolerance: 0.2,
          source: 'lab',
          lastUpdated: new Date()
        }
      ],
      regulatory: {
        fdaApproved: true,
        euApproved: true,
        allergens: [],
        certifications: ['Organic', 'Non-GMO'],
        grasStatus: true,
        kosher: true,
        halal: true
      },
      supplier: {
        id: 'SUP-001',
        name: 'Citrus Suppliers Inc.',
        contact: 'orders@citrussuppliers.com',
        leadTime: 14,
        moq: 1000,
        pricing: [
          {
            quantity: 1000,
            unit: 'kg',
            price: 12.50,
            currency: 'USD',
            validFrom: new Date('2024-01-01'),
            validTo: new Date('2024-12-31')
          }
        ]
      },
      lastSync: new Date()
    })
  }

  private mockGetSpecifications(materialId: string): Promise<MaterialSpecification[]> {
    return Promise.resolve([
      {
        attribute: 'Brix',
        value: 65,
        unit: '°Bx',
        source: 'lab',
        lastUpdated: new Date()
      },
      {
        attribute: 'Acidity',
        value: 1.2,
        unit: '%',
        tolerance: 0.1,
        source: 'lab',
        lastUpdated: new Date()
      },
      {
        attribute: 'Color',
        value: 'Orange',
        source: 'PLM',
        lastUpdated: new Date()
      },
      {
        attribute: 'Viscosity',
        value: 150,
        unit: 'cP',
        tolerance: 20,
        source: 'lab',
        lastUpdated: new Date()
      }
    ])
  }
}

export const plmClient = new PLMClient(true)
