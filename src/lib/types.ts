export interface FoodNutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
  derivationCode?: string
  derivationDescription?: string
}

export interface FoodData {
  fdcId: number
  description: string
  dataType: string
  foodCategory?: string
  foodNutrients: FoodNutrient[]
  servingSize?: number
  servingSizeUnit?: string
  brandOwner?: string
  brandName?: string
  subbrandName?: string
  gtinUpc?: string
  ingredients?: string
  publicationDate?: string
  marketCountry?: string
  householdServingFullText?: string
}

export interface FoodNode {
  id: string
  x: number
  y: number
  foodData: FoodData
  category: string
  color: string
}

export interface Edge {
  id: string
  source: string
  target: string
  similarity?: number
}

export interface GraphData {
  nodes: FoodNode[]
  edges: Edge[]
}

export interface ViewTransform {
  x: number
  y: number
  scale: number
}

export interface SearchResult {
  fdcId: number
  description: string
  dataType: string
  foodCategory?: string
}
