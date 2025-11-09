/**
 * @typedef {Object} FoodNutrient
 * @property {number} nutrientId
 * @property {string} nutrientName
 * @property {string} nutrientNumber
 * @property {string} unitName
 * @property {number} value
 * @property {string} [derivationCode]
 * @property {string} [derivationDescription]
 */

/**
 * @typedef {Object} FoodData
 * @property {number} fdcId
 * @property {string} description
 * @property {string} dataType
 * @property {string} [foodCategory]
 * @property {FoodNutrient[]} foodNutrients
 * @property {number} [servingSize]
 * @property {string} [servingSizeUnit]
 * @property {string} [brandOwner]
 * @property {string} [brandName]
 * @property {string} [subbrandName]
 * @property {string} [gtinUpc]
 * @property {string} [ingredients]
 * @property {string} [publicationDate]
 * @property {string} [marketCountry]
 * @property {string} [householdServingFullText]
 */

/**
 * @typedef {Object} FoodNode
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {FoodData} foodData
 * @property {string} category
 * @property {string} color
 */

/**
 * @typedef {Object} Edge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {number} [similarity]
 */

/**
 * @typedef {Object} GraphData
 * @property {FoodNode[]} nodes
 * @property {Edge[]} edges
 */

/**
 * @typedef {Object} ViewTransform
 * @property {number} x
 * @property {number} y
 * @property {number} scale
 */

/**
 * @typedef {Object} SearchResult
 * @property {number} fdcId
 * @property {string} description
 * @property {string} dataType
 * @property {string} [foodCategory]
 * @property {string} [brandOwner]
 * @property {string} [brandName]
 */

// This module intentionally exports nothing; it provides shared typedefs for JSDoc consumers.
export {}
