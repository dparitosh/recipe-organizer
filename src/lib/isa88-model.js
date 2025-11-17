/**
 * ISA-88 Batch Control Standard Data Model
 * For food/beverage manufacturing process modeling
 */

// Unit Operations (ISA-88 Physical Model)
export const UNIT_OPERATIONS = {
  mixing: {
    id: 'mixing',
    name: 'Mixing/Blending',
    equipment_types: ['Ribbon Blender', 'Paddle Mixer', 'High Shear Mixer', 'Planetary Mixer'],
    parameters: ['rpm', 'torque', 'power_kw', 'batch_size_L'],
    typical_time_min: 15,
    cost_per_hour: 45,
    quality_metrics: ['homogeneity', 'particle_size', 'viscosity']
  },
  heating: {
    id: 'heating',
    name: 'Heating/Pasteurization',
    equipment_types: ['Jacketed Vessel', 'Heat Exchanger', 'Pasteurizer', 'UHT System'],
    parameters: ['temperature_C', 'hold_time_sec', 'flow_rate_L_min', 'heat_transfer_rate'],
    typical_time_min: 30,
    cost_per_hour: 65,
    quality_metrics: ['temperature_uniformity', 'microbial_load', 'nutrient_retention']
  },
  cooling: {
    id: 'cooling',
    name: 'Cooling',
    equipment_types: ['Plate Cooler', 'Glycol Chiller', 'Flash Cooler'],
    parameters: ['target_temp_C', 'cooling_rate_C_min', 'pressure_bar'],
    typical_time_min: 20,
    cost_per_hour: 40,
    quality_metrics: ['cooling_rate', 'condensation', 'energy_efficiency']
  },
  filtration: {
    id: 'filtration',
    name: 'Filtration/Clarification',
    equipment_types: ['Membrane Filter', 'Centrifuge', 'Plate Filter', 'Bag Filter'],
    parameters: ['pore_size_micron', 'pressure_diff_psi', 'flow_rate_L_min'],
    typical_time_min: 45,
    cost_per_hour: 55,
    quality_metrics: ['clarity_NTU', 'yield_percent', 'flux_rate']
  },
  homogenization: {
    id: 'homogenization',
    name: 'Homogenization',
    equipment_types: ['High Pressure Homogenizer', 'Colloid Mill', 'Ultrasonic Homogenizer'],
    parameters: ['pressure_bar', 'passes', 'flow_rate_L_hr'],
    typical_time_min: 10,
    cost_per_hour: 75,
    quality_metrics: ['particle_size_nm', 'stability', 'emulsion_quality']
  },
  carbonation: {
    id: 'carbonation',
    name: 'Carbonation',
    equipment_types: ['Carbonator', 'CO2 Injection System'],
    parameters: ['co2_volumes', 'pressure_psi', 'temperature_C', 'contact_time_sec'],
    typical_time_min: 8,
    cost_per_hour: 50,
    quality_metrics: ['co2_retention', 'nucleation_sites', 'foam_stability']
  },
  filling: {
    id: 'filling',
    name: 'Filling/Packaging',
    equipment_types: ['Volumetric Filler', 'Aseptic Filler', 'Hot Fill', 'Counter Pressure Filler'],
    parameters: ['fill_volume_ml', 'fill_speed_bpm', 'headspace_mm', 'fill_accuracy_percent'],
    typical_time_min: 5,
    cost_per_hour: 85,
    quality_metrics: ['fill_weight_variance', 'seal_integrity', 'rejection_rate']
  },
  fermentation: {
    id: 'fermentation',
    name: 'Fermentation',
    equipment_types: ['Fermenter', 'Bioreactor'],
    parameters: ['pH', 'dissolved_oxygen_ppm', 'agitation_rpm', 'temperature_C', 'duration_hrs'],
    typical_time_min: 1440, // 24 hours
    cost_per_hour: 35,
    quality_metrics: ['cell_density', 'metabolite_concentration', 'viability_percent']
  },
  evaporation: {
    id: 'evaporation',
    name: 'Evaporation/Concentration',
    equipment_types: ['Vacuum Evaporator', 'Falling Film Evaporator', 'Multiple Effect Evaporator'],
    parameters: ['vacuum_pressure_mbar', 'temperature_C', 'concentration_brix'],
    typical_time_min: 60,
    cost_per_hour: 70,
    quality_metrics: ['solids_content_brix', 'color_change', 'flavor_retention']
  },
  drying: {
    id: 'drying',
    name: 'Spray Drying',
    equipment_types: ['Spray Dryer', 'Drum Dryer', 'Freeze Dryer'],
    parameters: ['inlet_temp_C', 'outlet_temp_C', 'feed_rate_kg_hr', 'atomizer_speed_rpm'],
    typical_time_min: 120,
    cost_per_hour: 95,
    quality_metrics: ['moisture_content_percent', 'bulk_density', 'particle_size_distribution']
  }
}

// Material Grades (Food Safety & Quality)
export const MATERIAL_GRADES = {
  food_grade: {
    id: 'food_grade',
    name: 'Food Grade',
    certifications: ['FDA 21 CFR', 'EU 10/2011', 'NSF'],
    cost_multiplier: 1.0,
    applications: ['Direct food contact', 'Ingredients']
  },
  pharma_grade: {
    id: 'pharma_grade',
    name: 'Pharmaceutical Grade',
    certifications: ['USP', 'EP', 'GMP'],
    cost_multiplier: 1.5,
    applications: ['Nutraceuticals', 'Medical foods', 'Supplements']
  },
  organic: {
    id: 'organic',
    name: 'Organic Certified',
    certifications: ['USDA Organic', 'EU Organic', 'JAS'],
    cost_multiplier: 1.8,
    applications: ['Organic products', 'Natural foods']
  },
  kosher: {
    id: 'kosher',
    name: 'Kosher Certified',
    certifications: ['OU', 'OK', 'Star-K'],
    cost_multiplier: 1.2,
    applications: ['Kosher products']
  },
  halal: {
    id: 'halal',
    name: 'Halal Certified',
    certifications: ['IFANCA', 'HFA', 'JAKIM'],
    cost_multiplier: 1.2,
    applications: ['Halal products']
  },
  non_gmo: {
    id: 'non_gmo',
    name: 'Non-GMO Verified',
    certifications: ['Non-GMO Project'],
    cost_multiplier: 1.3,
    applications: ['Clean label', 'Natural products']
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Grade',
    certifications: ['ASTM', 'ISO'],
    cost_multiplier: 0.7,
    applications: ['Non-food use', 'Technical applications']
  }
}

// Equipment Capabilities (ISA-88 Equipment Module)
export const EQUIPMENT_CAPABILITIES = {
  batch_size_ranges: {
    'pilot': { min_L: 10, max_L: 100, fixed_cost: 200, variable_cost_per_L: 2 },
    'small': { min_L: 100, max_L: 1000, fixed_cost: 500, variable_cost_per_L: 1.5 },
    'medium': { min_L: 1000, max_L: 5000, fixed_cost: 1200, variable_cost_per_L: 1.0 },
    'large': { min_L: 5000, max_L: 20000, fixed_cost: 3000, variable_cost_per_L: 0.7 },
    'industrial': { min_L: 20000, max_L: 100000, fixed_cost: 8000, variable_cost_per_L: 0.4 }
  },
  
  processing_capabilities: {
    temperature_control: {
      precision: '±0.5°C',
      range: '-20°C to 150°C',
      ramp_rate: '2°C/min'
    },
    pressure_control: {
      range: '0.1 to 10 bar',
      accuracy: '±0.1 bar'
    },
    mixing_capabilities: {
      rpm_range: '10 to 3000 rpm',
      shear_rates: 'low/medium/high',
      viscosity_range: '1 to 50000 cP'
    }
  }
}

// Process Recipe Structure (ISA-88 Recipe Model)
export const createProcessRecipe = (formulationData) => {
  return {
    recipe_header: {
      recipe_id: formulationData.id,
      recipe_name: formulationData.name,
      version: '1.0',
      product_type: formulationData.product_type,
      batch_size: formulationData.target_batch_size_L,
      created_date: new Date().toISOString()
    },
    
    recipe_formula: {
      ingredients: formulationData.ingredients.map(ing => ({
        material_id: ing.id,
        material_name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        grade: ing.grade,
        tolerance: ing.tolerance || '±2%',
        sequence_number: ing.addition_sequence
      }))
    },
    
    recipe_procedure: {
      unit_procedures: [], // To be filled with operation steps
      process_parameters: {
        critical_control_points: [],
        quality_checks: []
      }
    },
    
    equipment_requirements: {
      preferred_equipment: [],
      min_batch_size: null,
      max_batch_size: null
    },
    
    yield_calculations: {
      theoretical_yield: 100,
      expected_yield_percent: 95,
      loss_sources: []
    }
  }
}

// Cost Calculation Model
export const calculateProcessingCost = (operations, batchSize, duration) => {
  if (!operations || operations.length === 0 || !batchSize || batchSize <= 0) {
    return {
      total_processing_cost: 0,
      cost_per_liter: 0,
      breakdown: {},
      scale_category: 'unknown'
    }
  }

  let totalCost = 0
  let breakdown = {}
  
  operations.forEach(op => {
    // Handle both string keys and objects with type property
    const opKey = typeof op === 'string' ? op : op?.type
    if (!opKey) return
    
    const unitOp = UNIT_OPERATIONS[opKey]
    if (!unitOp) return
    
    const hours = (typeof op === 'object' && op.duration_min) 
      ? op.duration_min / 60 
      : unitOp.typical_time_min / 60
    const operationCost = unitOp.cost_per_hour * hours
    
    breakdown[opKey] = {
      hours: hours.toFixed(2),
      rate: unitOp.cost_per_hour,
      cost: operationCost.toFixed(2)
    }
    
    totalCost += operationCost
  })
  
  // Add batch size factor (economies of scale)
  const batchSizeFactors = EQUIPMENT_CAPABILITIES.batch_size_ranges
  let scaleCategory = 'small'
  
  for (const [category, range] of Object.entries(batchSizeFactors)) {
    if (batchSize >= range.min_L && batchSize <= range.max_L) {
      scaleCategory = category
      totalCost += range.fixed_cost + (batchSize * range.variable_cost_per_L)
      break
    }
  }
  
  return {
    total_processing_cost: totalCost,
    cost_per_liter: totalCost / batchSize,
    breakdown,
    scale_category: scaleCategory
  }
}

// Quality Parameters by Operation
export const QUALITY_PARAMETERS = {
  mixing_homogeneity: { target: '>95%', method: 'RSD analysis' },
  pasteurization_lethality: { target: 'F₀ > 5', method: 'Time-temperature integration' },
  fill_accuracy: { target: '±0.5%', method: 'Statistical process control' },
  microbial_count: { target: '<10 CFU/ml', method: 'Plate count' },
  pH: { target: '±0.1', method: 'pH meter' },
  brix: { target: '±0.2°Bx', method: 'Refractometer' },
  color: { target: 'ΔE < 2', method: 'Spectrophotometer' },
  viscosity: { target: '±10%', method: 'Viscometer' }
}

export default {
  UNIT_OPERATIONS,
  MATERIAL_GRADES,
  EQUIPMENT_CAPABILITIES,
  createProcessRecipe,
  calculateProcessingCost,
  QUALITY_PARAMETERS
}
