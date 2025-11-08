import { FDC_CONSTANTS, NEO4J_CONSTANTS } from '@/lib/constants.js'
import { neo4jManager } from '@/lib/managers/neo4j-manager'

const DEFAULT_CONFIG = {
	apiKey: '',
	backendUrl: 'http://localhost:8000',
	cacheInNeo4j: true,
}

class FDCService {
	constructor(config) {
		this.config = { ...DEFAULT_CONFIG, ...(config || {}) }
	}

	setBackendUrl(url) {
		if (!url) return
		this.config.backendUrl = url.replace(/\/$/, '')
	}

	getBackendUrl() {
		return this.config.backendUrl || DEFAULT_CONFIG.backendUrl
	}

	setApiKey(apiKey) {
		this.config.apiKey = (apiKey || '').trim()
	}

	getApiKey() {
		return this.config.apiKey
	}

	_resolveApiKey(override) {
		const apiKey = (override || this.config.apiKey || '').trim()
		if (!apiKey) {
			throw new Error('FDC API key is not configured. Please add it in settings.')
		}
		return apiKey
	}

	async _request(path, { method = 'POST', body, headers } = {}) {
		const url = `${this.getBackendUrl()}${path}`
		const init = {
			method,
			headers: {
				'Content-Type': 'application/json',
				...(headers || {}),
			},
		}

		if (body !== undefined) {
			init.body = typeof body === 'string' ? body : JSON.stringify(body)
		}

		const response = await fetch(url, init)

		if (!response.ok) {
			let errorDetail = 'Unknown error'
			try {
				const errorBody = await response.json()
				errorDetail = errorBody.detail || errorBody.message || errorDetail
			} catch (_) {
				const text = await response.text()
				errorDetail = text || errorDetail
			}
			throw new Error(errorDetail)
		}

		if (response.status === 204) {
			return null
		}

		return response.json()
	}

	async searchFoods(options) {
		const apiKey = this._resolveApiKey(options?.apiKey)
		const payload = {
			api_key: apiKey,
			query: options.query,
			page_size: options.pageSize || FDC_CONSTANTS.DEFAULT_PAGE_SIZE,
			page_number: options.pageNumber || 1,
			data_types: options.dataType || options.dataTypes || null,
			sort_by: options.sortBy || null,
			sort_order: options.sortOrder || null,
		}

		const result = await this._request('/api/fdc/search', { body: payload })
		return {
			foods: result?.foods || [],
			totalHits: result?.total_hits ?? result?.totalHits ?? 0,
			currentPage: result?.current_page ?? result?.currentPage ?? 1,
			totalPages: result?.total_pages ?? result?.totalPages ?? 1,
		}
	}

	async getFoodDetails(fdcId, options = {}) {
		const apiKey = this._resolveApiKey(options.apiKey)
		return this._request(`/api/fdc/foods/${fdcId}/details`, {
			body: { api_key: apiKey },
		})
	}

	async ingestFoods(fdcIds, options = {}) {
		if (!Array.isArray(fdcIds) || fdcIds.length === 0) {
			throw new Error('Provide at least one FDC ID to ingest.')
		}
		const apiKey = this._resolveApiKey(options.apiKey)
		return this._request('/api/fdc/ingest', {
			body: {
				api_key: apiKey,
				fdc_ids: fdcIds,
			},
		})
	}

	async quickIngest(searchTerm, count = 20, options = {}) {
		const apiKey = this._resolveApiKey(options.apiKey)
		return this._request('/api/fdc/quick-ingest', {
			body: {
				api_key: apiKey,
				search_term: searchTerm,
				count,
				data_types: options.dataTypes || options.dataType || null,
			},
		})
	}

	async cacheFoodInNeo4j(foodData, options = {}) {
		if (!foodData || !foodData.fdcId) {
			throw new Error('Food data must include an FDC ID')
		}
		return this.ingestFoods([foodData.fdcId], options)
	}

	async getFoodsByIds(fdcIds, options = {}) {
		console.warn('FDC Service: getFoodsByIds is not implemented with backend integration yet.')
		throw new Error('Fetching multiple foods by ID is not supported yet.')
	}

	async getNutrientsList(options = {}) {
		console.warn('FDC Service: getNutrientsList is not implemented with backend integration yet.')
		throw new Error('Fetching nutrient metadata is not supported yet.')
	}

	async linkFormulationToFDC(formulationId, ingredients) {
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
				ingredients,
			})

			console.log(`✓ FDC Service: Linked formulation ${formulationId} to FDC foods`)
		} catch (error) {
			console.error('FDC Service: Error linking formulation to FDC', error)
		}
	}

	async calculateFormulationNutrition(formulationId) {
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

			const nutrition = {}
			;(result.nodes || []).forEach((node) => {
				const props = node.properties || {}
				const name = props.nutrientName || 'Unknown'
				nutrition[name] = {
					value: props.totalValue,
					unit: props.unit,
					nutrientNumber: props.nutrientNumber,
				}
			})

			return nutrition
		} catch (error) {
			console.error('FDC Service: Error calculating formulation nutrition', error)
			return null
		}
	}

	async findAlternativeFoods(fdcId, similarityThreshold = 0.8) {
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
				threshold: 1 - similarityThreshold,
			})

			return (result.nodes || []).map((node) => ({
				fdcId: node.properties?.fdcId,
				description: node.properties?.description,
				dataType: node.properties?.dataType,
				foodCategory: node.properties?.foodCategory,
			}))
		} catch (error) {
			console.error('FDC Service: Error finding alternative foods', error)
			return []
		}
	}

	async syncFormulationWithFDC(formulationId) {
		console.log(`FDC Service: Syncing formulation ${formulationId} with FDC data`)
	}
}

export const fdcService = new FDCService()

export { FDCService }
