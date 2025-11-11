import { FDC_CONSTANTS } from './constants.js'

let FDC_API_KEY = 'N8J01VZvGtq3CwIrgJpgvlW4p2R03aSdOXcGcSke'

export function setFDCApiKey(apiKey) {
  FDC_API_KEY = apiKey
}

export function getFDCApiKey() {
  return FDC_API_KEY
}

export const FOOD_CATEGORIES = {
  FRUITS: {
    name: 'Fruits',
    color: 'oklch(0.62 0.22 15)',
    keywords: ['fruit', 'berry', 'apple', 'orange', 'banana', 'grape', 'melon'],
  },
  VEGETABLES: {
    name: 'Vegetables',
    color: 'oklch(0.68 0.20 140)',
    keywords: ['vegetable', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'pepper'],
  },
  PROTEINS: {
    name: 'Proteins',
    color: 'oklch(0.65 0.16 25)',
    keywords: ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg', 'protein'],
  },
  GRAINS: {
    name: 'Grains',
    color: 'oklch(0.72 0.15 70)',
    keywords: ['bread', 'rice', 'pasta', 'cereal', 'oat', 'wheat', 'grain', 'flour'],
  },
  DAIRY: {
    name: 'Dairy',
    color: 'oklch(0.85 0.05 85)',
    keywords: ['milk', 'cheese', 'yogurt', 'dairy', 'cream', 'butter'],
  },
  FATS: {
    name: 'Fats & Oils',
    color: 'oklch(0.78 0.16 90)',
    keywords: ['oil', 'fat', 'butter', 'margarine'],
  },
  OTHER: {
    name: 'Other',
    color: 'oklch(0.60 0.12 250)',
    keywords: [],
  },
}

export function getFoodCategory(description, category) {
  const lowerDesc = description.toLowerCase()
  const lowerCat = category?.toLowerCase() || ''

  for (const [key, cat] of Object.entries(FOOD_CATEGORIES)) {
    if (key === 'OTHER') continue
    if (cat.keywords.some((keyword) => lowerDesc.includes(keyword) || lowerCat.includes(keyword))) {
      return key
    }
  }

  return 'OTHER'
}

export function getCategoryColor(category) {
  return FOOD_CATEGORIES[category]?.color || FOOD_CATEGORIES.OTHER.color
}

export async function searchFoods(query, pageSize = FDC_CONSTANTS.DEFAULT_PAGE_SIZE) {
  try {
    const response = await fetch(
      `${FDC_CONSTANTS.API_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${FDC_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to search foods')
    }

    const data = await response.json()
    return data.foods || []
  } catch (error) {
    console.error('Error searching foods:', error)
    return []
  }
}

export async function getFoodDetails(fdcId) {
  try {
    const response = await fetch(
      `${FDC_CONSTANTS.API_BASE_URL}/food/${fdcId}?api_key=${FDC_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch food details')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching food details:', error)
    return null
  }
}

export function getMainNutrients(foodData) {
  const nutrients = foodData.foodNutrients || []

  const findNutrient = (name) => nutrients.find((n) => n.nutrientName.toLowerCase().includes(name.toLowerCase()))

  return {
    calories: findNutrient('energy') || findNutrient('calorie'),
    protein: findNutrient('protein'),
    carbs: findNutrient('carbohydrate'),
    fat: findNutrient('total lipid') || findNutrient('fat'),
    fiber: findNutrient('fiber'),
    sugar: findNutrient('sugars'),
  }
}

export function calculateNutrientSimilarity(food1, food2) {
  const nutrients1 = getMainNutrients(food1)
  const nutrients2 = getMainNutrients(food2)

  const keys = ['calories', 'protein', 'carbs', 'fat']
  let totalDiff = 0
  let count = 0

  keys.forEach((key) => {
    const val1 = nutrients1[key]?.value
    const val2 = nutrients2[key]?.value

    if (val1 !== undefined && val2 !== undefined && val1 > 0 && val2 > 0) {
      const diff = Math.abs(val1 - val2) / Math.max(val1, val2)
      totalDiff += diff
      count += 1
    }
  })

  if (count === 0) return 0
  return Math.max(0, 1 - totalDiff / count)
}
