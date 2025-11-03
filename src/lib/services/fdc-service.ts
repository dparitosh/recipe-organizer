import { FoodData, SearchResult, FoodNutrient } from '@/lib/types'
import { FDC_CONSTANTS, NEO4J_CONSTANTS } from '@/lib/constants'
import { neo4jManager } from '@/lib/managers/neo4j-manager'

let FDC_API_KEY: string = FDC_CONSTANTS.DEFAULT_API_KEY

export interface FDCConfig {
  apiKey: string
  cacheInNeo4j?: boolean
}

export interface FoodSearchOptions {
  query: string
  dataType?: string[]
  pageSize?: number
  pageNumber?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface NutrientSearchOptions {
  nutrientNumber?: string
  nutrientName?: string
}

export class FDCService {
  private config: FDCConfig

  constructor(config?: FDCConfig) {
    this.config = config || { 
      apiKey: 'axHdO7CFrKh2wBPBSHKRaASp9m8lanCIaDY5W9ya', 
      cacheInNeo4j: true 
    }
  }

  setApiKey(apiKey: string) {
    this.config.apiKey = apiKey
  }

  getApiKey(): string {
    return this.config.apiKey
  }

  async searchFoods(options: FoodSearchOptions): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        query: options.query,
        pageSize: String(options.pageSize || FDC_CONSTANTS.DEFAULT_PAGE_SIZE),
        api_key: this.config.apiKey
      })

      if (options.dataType && options.dataType.length > 0) {
        options.dataType.forEach(dt => params.append('dataType', dt))
      }

      if (options.pageNumber) {
        params.append('pageNumber', String(options.pageNumber))
      }

      if (options.sortBy) {
        params.append('sortBy', options.sortBy)
      }

      if (options.sortOrder) {
        params.append('sortOrder', options.sortOrder)
      }

      const response = await fetch(
        `${FDC_CONSTANTS.API_BASE_URL}/foods/search?${params.toString()}`
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `FDC API error: ${response.status}`)
      }

      const data = await response.json()
      return data.foods || []
    } catch (error) {
      console.error('FDC Service: Search error', error)
      throw error
    }
  }

  async getFoodDetails(fdcId: number): Promise<FoodData | null> {
    try {
      const response = await fetch(
        `${FDC_CONSTANTS.API_BASE_URL}/food/${fdcId}?api_key=${this.config.apiKey}`
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `FDC API error: ${response.status}`)
      }

      const foodData = await response.json()

      if (this.config.cacheInNeo4j) {
        await this.cacheFoodInNeo4j(foodData)
      }

      return foodData
    } catch (error) {
      console.error('FDC Service: Get food details error', error)
      return null
    }
  }

  async getFoodsByIds(fdcIds: number[]): Promise<FoodData[]> {
    try {
      const response = await fetch(
        `${FDC_CONSTANTS.API_BASE_URL}/foods`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fdcIds,
            format: 'full',
            api_key: this.config.apiKey
          })
        }
      )

      if (!response.ok) {
        throw new Error(`FDC API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('FDC Service: Get foods by IDs error', error)
      return []
    }
  }

  async getNutrientsList(): Promise<any[]> {
    try {
      const response = await fetch(
        `${FDC_CONSTANTS.API_BASE_URL}/nutrients?api_key=${this.config.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`FDC API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('FDC Service: Get nutrients list error', error)
      return []
    }
  }

  async cacheFoodInNeo4j(foodData: FoodData): Promise<void> {
    try {
      const cypher = `
        MERGE (f:${NEO4J_CONSTANTS.NODE_LABELS.FOOD} {fdcId: $fdcId})
        SET f.description = $description,
            f.dataType = $dataType,
            f.foodCategory = $foodCategory,
            f.brandOwner = $brandOwner,
            f.brandName = $brandName,
            f.gtinUpc = $gtinUpc,
            f.ingredients = $ingredients,
            f.servingSize = $servingSize,
            f.servingSizeUnit = $servingSizeUnit,
            f.updatedAt = datetime()

        WITH f
        MERGE (c:${NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY} {description: $foodCategory})
        MERGE (f)-[:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY}]->(c)

        WITH f
        UNWIND $nutrients as nutrient
        MERGE (n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT} {nutrientId: nutrient.nutrientId})
        SET n.nutrientName = nutrient.nutrientName,
            n.nutrientNumber = nutrient.nutrientNumber,
            n.unitName = nutrient.unitName
        MERGE (f)-[r:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]->(n)
        SET r.value = nutrient.value,
            r.unit = nutrient.unitName,
            r.per100g = nutrient.value
      `

      await neo4jManager.query(cypher, {
        fdcId: foodData.fdcId,
        description: foodData.description,
        dataType: foodData.dataType,
        foodCategory: foodData.foodCategory || 'Unknown',
        brandOwner: foodData.brandOwner || null,
        brandName: foodData.brandName || null,
        gtinUpc: foodData.gtinUpc || null,
        ingredients: foodData.ingredients || null,
        servingSize: foodData.servingSize || null,
        servingSizeUnit: foodData.servingSizeUnit || null,
        nutrients: foodData.foodNutrients.map((n: FoodNutrient) => ({
          nutrientId: n.nutrientId,
          nutrientName: n.nutrientName,
          nutrientNumber: n.nutrientNumber,
          unitName: n.unitName,
          value: n.value
        }))
      })

      console.log(`✓ FDC Service: Cached food ${foodData.fdcId} in Neo4j`)
    } catch (error) {
      console.error('FDC Service: Error caching food in Neo4j', error)
    }
  }

  async linkFormulationToFDC(formulationId: string, ingredients: Array<{
    fdcId: number
    quantity: number
    unit: string
    percentage: number
    function: string
  }>): Promise<void> {
    try {
      const cypher = `
        MATCH (form:${NEO4J_CONSTANTS.NODE_LABELS.FORMULATION} {id: $formulationId})
        UNWIND $ingredients as ing
        MATCH (food:${NEO4J_CONSTANTS.NODE_LABELS.FOOD} {fdcId: ing.fdcId})
        MERGE (form)-[r:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES_INGREDIENT}]->(food)
        SET r.quantity = ing.quantity,
            r.unit = ing.unit,
            r.percentage = ing.percentage,
            r.function = ing.function
      `

      await neo4jManager.query(cypher, {
        formulationId,
        ingredients
      })

      console.log(`✓ FDC Service: Linked formulation ${formulationId} to FDC foods`)
    } catch (error) {
      console.error('FDC Service: Error linking formulation to FDC', error)
    }
  }

  async calculateFormulationNutrition(formulationId: string): Promise<any> {
    try {
      const cypher = `
        MATCH (form:${NEO4J_CONSTANTS.NODE_LABELS.FORMULATION} {id: $formulationId})
              -[uses:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES_INGREDIENT}]
              ->(food:${NEO4J_CONSTANTS.NODE_LABELS.FOOD})
        MATCH (food)-[contains:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]
              ->(nutrient:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT})
        WITH nutrient, 
             sum(contains.value * uses.percentage / 100.0) as totalValue,
             contains.unit as unit
        RETURN nutrient.nutrientName as nutrientName,
               nutrient.nutrientNumber as nutrientNumber,
               totalValue,
               unit
        ORDER BY nutrient.rank
      `

      const result = await neo4jManager.query(cypher, { formulationId })

      const nutrition: Record<string, any> = {}
      result.nodes.forEach((node: any) => {
        nutrition[node.properties.nutrientName] = {
          value: node.properties.totalValue,
          unit: node.properties.unit,
          nutrientNumber: node.properties.nutrientNumber
        }
      })

      return nutrition
    } catch (error) {
      console.error('FDC Service: Error calculating formulation nutrition', error)
      return null
    }
  }

  async findAlternativeFoods(fdcId: number, similarityThreshold: number = 0.8): Promise<SearchResult[]> {
    try {
      const cypher = `
        MATCH (food:${NEO4J_CONSTANTS.NODE_LABELS.FOOD} {fdcId: $fdcId})
              -[:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY}]
              ->(cat:${NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY})
        MATCH (alt:${NEO4J_CONSTANTS.NODE_LABELS.FOOD})
              -[:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY}]
              ->(cat)
        WHERE food <> alt
        
        MATCH (food)-[r1:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]
              ->(n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT})
        MATCH (alt)-[r2:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]->(n)
        WHERE abs(r1.value - r2.value) / CASE WHEN r1.value = 0 THEN 1 ELSE r1.value END < $threshold
        
        WITH alt, count(n) as similarNutrients
        WHERE similarNutrients >= 3
        RETURN alt.fdcId as fdcId,
               alt.description as description,
               alt.dataType as dataType,
               alt.foodCategory as foodCategory,
               similarNutrients
        ORDER BY similarNutrients DESC
        LIMIT 10
      `

      const result = await neo4jManager.query(cypher, {
        fdcId,
        threshold: 1 - similarityThreshold
      })

      return result.nodes.map((node: any) => ({
        fdcId: node.properties.fdcId,
        description: node.properties.description,
        dataType: node.properties.dataType,
        foodCategory: node.properties.foodCategory
      }))
    } catch (error) {
      console.error('FDC Service: Error finding alternative foods', error)
      return []
    }
  }

  async syncFormulationWithFDC(formulationId: string): Promise<void> {
    console.log(`FDC Service: Syncing formulation ${formulationId} with FDC data`)
  }
}

export const fdcService = new FDCService()
