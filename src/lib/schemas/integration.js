/**
 * Runtime Graph schema constants shared across services.
 */

/**
 * @type {{
 *   readonly CONTAINS: 'CONTAINS';
 *   readonly DERIVED_FROM: 'DERIVED_FROM';
 *   readonly REQUIRES: 'REQUIRES';
 *   readonly ENRICHES: 'ENRICHES';
 *   readonly ALTERNATIVE: 'ALTERNATIVE';
 *   readonly SUPPLIES: 'SUPPLIES';
 *   readonly PRODUCES: 'PRODUCES';
 *   readonly USES: 'uses';
 *   readonly derived_from: 'derived_from';
 *   readonly produces: 'produces';
 * }}
 */
export const RELATIONSHIP_TYPES = {
  CONTAINS: 'CONTAINS',
  DERIVED_FROM: 'DERIVED_FROM',
  REQUIRES: 'REQUIRES',
  ENRICHES: 'ENRICHES',
  ALTERNATIVE: 'ALTERNATIVE',
  SUPPLIES: 'SUPPLIES',
  PRODUCES: 'PRODUCES',
  SIMILAR_TO: 'SIMILAR_TO',
  USES: 'uses',
  derived_from: 'derived_from',
  produces: 'produces'
}

/**
 * @type {{
 *   readonly FORMULATION: 'Formulation';
 *   readonly INGREDIENT: 'Ingredient';
 *   readonly NUTRIENT: 'Nutrient';
 *   readonly PROCESS: 'Process';
 *   readonly EQUIPMENT: 'Equipment';
 *   readonly SUPPLIER: 'Supplier';
 *   readonly PRODUCT: 'Product';
 *   readonly RECIPE: 'Recipe';
 *   readonly MASTER_RECIPE: 'MasterRecipe';
 *   readonly MANUFACTURING_RECIPE: 'ManufacturingRecipe';
 *   readonly PLANT: 'Plant';
 *   readonly SALES_ORDER: 'SalesOrder';
 * }}
 */
export const NODE_LABELS = {
  FORMULATION: 'Formulation',
  INGREDIENT: 'Ingredient',
  NUTRIENT: 'Nutrient',
  PROCESS: 'Process',
  EQUIPMENT: 'Equipment',
  SUPPLIER: 'Supplier',
  PRODUCT: 'Product',
  RECIPE: 'Recipe',
  MASTER_RECIPE: 'MasterRecipe',
  MANUFACTURING_RECIPE: 'ManufacturingRecipe',
  PLANT: 'Plant',
  SALES_ORDER: 'SalesOrder'
}
