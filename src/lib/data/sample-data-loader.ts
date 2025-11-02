import { neo4jManager } from '@/lib/managers/neo4j-manager'

export interface SampleDataStats {
  nodesCreated: number
  relationshipsCreated: number
  categories: string[]
  executionTime: number
}

export class SampleDataLoader {
  async loadAllSampleData(): Promise<SampleDataStats> {
    const startTime = Date.now()
    
    await this.clearExistingData()
    
    await this.createConstraints()
    
    await this.loadPotatoWaferChipsData()
    await this.loadBeveragesData()
    await this.loadJuicesData()
    
    const stats = await this.getDataStats()
    
    return {
      ...stats,
      executionTime: Date.now() - startTime
    }
  }

  private async clearExistingData(): Promise<void> {
    const cypher = `
      MATCH (n)
      DETACH DELETE n
    `
    await neo4jManager.query(cypher)
  }

  private async createConstraints(): Promise<void> {
    const constraints = [
      `CREATE CONSTRAINT IF NOT EXISTS FOR (f:Formulation) REQUIRE f.id IS UNIQUE`,
      `CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.fdcId IS UNIQUE`,
      `CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.nutrientId IS UNIQUE`,
      `CREATE CONSTRAINT IF NOT EXISTS FOR (r:Recipe) REQUIRE r.id IS UNIQUE`,
      `CREATE CONSTRAINT IF NOT EXISTS FOR (mr:MasterRecipe) REQUIRE mr.id IS UNIQUE`,
      `CREATE CONSTRAINT IF NOT EXISTS FOR (mfg:ManufacturingRecipe) REQUIRE mfg.id IS UNIQUE`,
    ]

    for (const constraint of constraints) {
      try {
        await neo4jManager.query(constraint)
      } catch (error) {
        console.warn('Constraint may already exist:', error)
      }
    }
  }

  private async loadPotatoWaferChipsData(): Promise<void> {
    const cypher = `
      // Create Potato Wafer Chips Formulation
      CREATE (f:Formulation {
        id: 'potato-chips-classic-001',
        name: 'Classic Potato Wafer Chips',
        version: '3.2',
        type: 'Snack Food',
        status: 'Production',
        targetYield: 1000,
        yieldUnit: 'kg',
        description: 'Premium classic salted potato wafer chips',
        createdBy: 'chef.snacks@tcs.com',
        createdDate: datetime('2024-01-10T10:00:00Z'),
        category: 'Savory Snacks'
      })

      // Create Master Recipe
      CREATE (mr:MasterRecipe {
        id: 'mr-potato-chips-001',
        name: 'Potato Chips Master Formula',
        version: '3.2',
        status: 'Approved',
        approvedBy: 'quality.manager@tcs.com',
        approvedDate: datetime('2024-01-08T14:30:00Z'),
        recipeType: 'Snack Food',
        targetMarket: 'Global'
      })

      // Create Manufacturing Recipes
      CREATE (mfg1:ManufacturingRecipe {
        id: 'mfg-potato-chips-line-a',
        name: 'Potato Chips Production Line A',
        batchSize: 5000,
        batchUnit: 'kg',
        efficiency: 0.96,
        productionRate: '800 kg/hr',
        equipmentLine: 'Frying Line A',
        plant: 'North Plant'
      })

      CREATE (mfg2:ManufacturingRecipe {
        id: 'mfg-potato-chips-line-b',
        name: 'Potato Chips Production Line B',
        batchSize: 3500,
        batchUnit: 'kg',
        efficiency: 0.94,
        productionRate: '600 kg/hr',
        equipmentLine: 'Frying Line B',
        plant: 'South Plant'
      })

      // Create Raw Materials (Foods)
      CREATE (potato:Food {
        fdcId: 170026,
        description: 'Potato, raw, flesh and skin',
        dataType: 'SR Legacy',
        foodCategory: 'Vegetables and Vegetable Products',
        servingSize: 100,
        servingSizeUnit: 'g',
        specificGravity: 1.08
      })

      CREATE (oil:Food {
        fdcId: 171028,
        description: 'Vegetable oil, palm',
        dataType: 'SR Legacy',
        foodCategory: 'Fats and Oils',
        servingSize: 100,
        servingSizeUnit: 'ml',
        specificGravity: 0.92
      })

      CREATE (salt:Food {
        fdcId: 169047,
        description: 'Salt, table',
        dataType: 'SR Legacy',
        foodCategory: 'Spices and Herbs',
        servingSize: 100,
        servingSizeUnit: 'g',
        specificGravity: 2.16
      })

      CREATE (antioxidant:Food {
        fdcId: 999001,
        description: 'Ascorbic acid (Vitamin C)',
        dataType: 'Food Additive',
        foodCategory: 'Food Additives',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Antioxidant'
      })

      CREATE (citricAcid:Food {
        fdcId: 999002,
        description: 'Citric acid',
        dataType: 'Food Additive',
        foodCategory: 'Food Additives',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Acidulant'
      })

      // Create Nutrients
      CREATE (n1:Nutrient {
        nutrientId: 1008,
        nutrientName: 'Energy',
        nutrientNumber: '208',
        unitName: 'kcal'
      })

      CREATE (n2:Nutrient {
        nutrientId: 1003,
        nutrientName: 'Protein',
        nutrientNumber: '203',
        unitName: 'g'
      })

      CREATE (n3:Nutrient {
        nutrientId: 1004,
        nutrientName: 'Total lipid (fat)',
        nutrientNumber: '204',
        unitName: 'g'
      })

      CREATE (n4:Nutrient {
        nutrientId: 1005,
        nutrientName: 'Carbohydrate, by difference',
        nutrientNumber: '205',
        unitName: 'g'
      })

      CREATE (n5:Nutrient {
        nutrientId: 1093,
        nutrientName: 'Sodium, Na',
        nutrientNumber: '307',
        unitName: 'mg'
      })

      // Create Food Categories
      CREATE (cat1:FoodCategory {
        categoryId: 'cat-vegetables',
        description: 'Vegetables and Vegetable Products'
      })

      CREATE (cat2:FoodCategory {
        categoryId: 'cat-oils',
        description: 'Fats and Oils'
      })

      CREATE (cat3:FoodCategory {
        categoryId: 'cat-additives',
        description: 'Food Additives'
      })

      // Create Plants
      CREATE (plant1:Plant {
        id: 'plant-north-snacks',
        name: 'North Regional Snacks Facility',
        location: 'Dallas, TX',
        region: 'North America',
        capacity: '15000 kg/day',
        certifications: ['FDA', 'HACCP', 'ISO 22000', 'FSSC 22000']
      })

      CREATE (plant2:Plant {
        id: 'plant-south-snacks',
        name: 'South Regional Snacks Facility',
        location: 'Atlanta, GA',
        region: 'South America',
        capacity: '10000 kg/day',
        certifications: ['FDA', 'HACCP', 'SQF']
      })

      // Create Sales Orders
      CREATE (order1:SalesOrder {
        id: 'so-chips-2024-q1-001',
        orderNumber: 'SO-2024-001',
        customer: 'SuperMart Chain',
        quantity: 100000,
        quantityUnit: 'bags',
        dueDate: datetime('2024-03-30T00:00:00Z'),
        priority: 'High',
        status: 'In Production'
      })

      CREATE (order2:SalesOrder {
        id: 'so-chips-2024-q1-002',
        orderNumber: 'SO-2024-002',
        customer: 'Wholesale Distributors Inc',
        quantity: 75000,
        quantityUnit: 'bags',
        dueDate: datetime('2024-04-15T00:00:00Z'),
        priority: 'Medium',
        status: 'Planning'
      })

      // Create Processes
      CREATE (p1:Process {
        id: 'proc-wash',
        name: 'Potato Washing and Peeling',
        processType: 'Preparation',
        duration: '15 min',
        temperature: '25°C',
        equipment: 'Industrial Washer-Peeler'
      })

      CREATE (p2:Process {
        id: 'proc-slice',
        name: 'Precision Slicing',
        processType: 'Size Reduction',
        duration: '5 min',
        thickness: '1.5 mm',
        equipment: 'High-Speed Slicer'
      })

      CREATE (p3:Process {
        id: 'proc-fry',
        name: 'Deep Frying',
        processType: 'Cooking',
        duration: '3 min',
        temperature: '180°C',
        equipment: 'Continuous Fryer'
      })

      CREATE (p4:Process {
        id: 'proc-season',
        name: 'Seasoning Application',
        processType: 'Flavoring',
        duration: '2 min',
        temperature: '70°C',
        equipment: 'Tumbling Drum'
      })

      CREATE (p5:Process {
        id: 'proc-cool',
        name: 'Cooling and Degreasing',
        processType: 'Cooling',
        duration: '5 min',
        temperature: '25°C',
        equipment: 'Vibrating Cooler'
      })

      CREATE (p6:Process {
        id: 'proc-pack',
        name: 'Nitrogen Flush Packaging',
        processType: 'Packaging',
        duration: '1 min',
        atmosphere: 'Nitrogen',
        equipment: 'VFFS Packaging Machine'
      })

      // Create Relationships - Recipe Hierarchy
      CREATE (f)-[:DERIVED_FROM {derivedDate: datetime('2024-01-09T09:00:00Z')}]->(mr)
      CREATE (mfg1)-[:DERIVED_FROM {derivedDate: datetime('2024-01-10T11:00:00Z'), scaleFactor: 5.0}]->(f)
      CREATE (mfg2)-[:DERIVED_FROM {derivedDate: datetime('2024-01-10T11:30:00Z'), scaleFactor: 3.5}]->(f)

      // Create Relationships - Formulation uses Foods
      CREATE (f)-[:USES_INGREDIENT {
        quantity: 1200,
        unit: 'kg',
        percentage: 92.3,
        function: 'Base Material',
        processingLoss: 0.08
      }]->(potato)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 80,
        unit: 'L',
        percentage: 6.15,
        function: 'Frying Medium',
        absorption: 0.35
      }]->(oil)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 18,
        unit: 'kg',
        percentage: 1.38,
        function: 'Flavor Enhancer'
      }]->(salt)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 1.5,
        unit: 'kg',
        percentage: 0.12,
        function: 'Antioxidant'
      }]->(antioxidant)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 0.5,
        unit: 'kg',
        percentage: 0.04,
        function: 'Acidity Regulator'
      }]->(citricAcid)

      // Create Relationships - Food Categories
      CREATE (potato)-[:BELONGS_TO_CATEGORY]->(cat1)
      CREATE (oil)-[:BELONGS_TO_CATEGORY]->(cat2)
      CREATE (salt)-[:BELONGS_TO_CATEGORY]->(cat3)
      CREATE (antioxidant)-[:BELONGS_TO_CATEGORY]->(cat3)
      CREATE (citricAcid)-[:BELONGS_TO_CATEGORY]->(cat3)

      // Create Relationships - Nutrients
      CREATE (potato)-[:CONTAINS_NUTRIENT {value: 77, unit: 'kcal', per100g: 77}]->(n1)
      CREATE (potato)-[:CONTAINS_NUTRIENT {value: 2.0, unit: 'g', per100g: 2.0}]->(n2)
      CREATE (potato)-[:CONTAINS_NUTRIENT {value: 0.1, unit: 'g', per100g: 0.1}]->(n3)
      CREATE (potato)-[:CONTAINS_NUTRIENT {value: 17.5, unit: 'g', per100g: 17.5}]->(n4)
      CREATE (potato)-[:CONTAINS_NUTRIENT {value: 6, unit: 'mg', per100g: 6}]->(n5)

      CREATE (oil)-[:CONTAINS_NUTRIENT {value: 884, unit: 'kcal', per100ml: 884}]->(n1)
      CREATE (oil)-[:CONTAINS_NUTRIENT {value: 100, unit: 'g', per100ml: 100}]->(n3)

      CREATE (salt)-[:CONTAINS_NUTRIENT {value: 38758, unit: 'mg', per100g: 38758}]->(n5)

      // Create Relationships - Processes
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 1, critical: true}]->(p1)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 2, critical: true}]->(p2)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 3, critical: true, criticalControlPoint: true}]->(p3)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 4, critical: false}]->(p4)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 5, critical: false}]->(p5)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 6, critical: true}]->(p6)

      // Create Relationships - Manufacturing
      CREATE (plant1)-[:PRODUCES {line: 'Frying Line A', efficiency: 0.96}]->(mfg1)
      CREATE (plant2)-[:PRODUCES {line: 'Frying Line B', efficiency: 0.94}]->(mfg2)

      // Create Relationships - Sales Orders
      CREATE (order1)-[:REQUIRES {quantity: 100000, unit: 'bags'}]->(mfg1)
      CREATE (order2)-[:REQUIRES {quantity: 75000, unit: 'bags'}]->(mfg2)

      RETURN count(*) as itemsCreated
    `

    await neo4jManager.query(cypher)
  }

  private async loadBeveragesData(): Promise<void> {
    const cypher = `
      // Create Cola Beverage Formulation
      CREATE (f:Formulation {
        id: 'cola-classic-001',
        name: 'Classic Cola Beverage',
        version: '5.1',
        type: 'Carbonated Soft Drink',
        status: 'Production',
        targetYield: 10000,
        yieldUnit: 'L',
        description: 'Premium carbonated cola beverage',
        createdBy: 'beverages.rd@tcs.com',
        createdDate: datetime('2024-01-12T09:00:00Z'),
        category: 'Beverages'
      })

      // Create Master Recipe
      CREATE (mr:MasterRecipe {
        id: 'mr-cola-001',
        name: 'Cola Master Formula',
        version: '5.1',
        status: 'Approved',
        approvedBy: 'head.beverages@tcs.com',
        approvedDate: datetime('2024-01-10T16:00:00Z'),
        recipeType: 'Beverage',
        targetMarket: 'Global'
      })

      // Create Manufacturing Recipe
      CREATE (mfg:ManufacturingRecipe {
        id: 'mfg-cola-line-001',
        name: 'Cola Production Line 1',
        batchSize: 50000,
        batchUnit: 'L',
        efficiency: 0.98,
        productionRate: '12000 L/hr',
        equipmentLine: 'Beverage Line 1',
        plant: 'Central Beverage Plant'
      })

      // Create Raw Materials
      CREATE (water:Food {
        fdcId: 171283,
        description: 'Water, bottled, generic',
        dataType: 'SR Legacy',
        foodCategory: 'Beverages',
        servingSize: 100,
        servingSizeUnit: 'ml'
      })

      CREATE (sugar:Food {
        fdcId: 169655,
        description: 'Sugars, granulated',
        dataType: 'SR Legacy',
        foodCategory: 'Sweets',
        servingSize: 100,
        servingSizeUnit: 'g'
      })

      CREATE (colaConc:Food {
        fdcId: 999101,
        description: 'Cola concentrate blend',
        dataType: 'Proprietary',
        foodCategory: 'Flavor Concentrates',
        servingSize: 100,
        servingSizeUnit: 'ml',
        components: 'Caffeine, Phosphoric acid, Natural flavors'
      })

      CREATE (co2:Food {
        fdcId: 999102,
        description: 'Carbon dioxide, food grade',
        dataType: 'Processing Aid',
        foodCategory: 'Gases',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Carbonation'
      })

      CREATE (preservative:Food {
        fdcId: 999103,
        description: 'Sodium benzoate',
        dataType: 'Food Additive',
        foodCategory: 'Preservatives',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Preservative'
      })

      // Create Nutrients for Beverages
      CREATE (n6:Nutrient {
        nutrientId: 1089,
        nutrientName: 'Iron, Fe',
        nutrientNumber: '303',
        unitName: 'mg'
      })

      CREATE (n7:Nutrient {
        nutrientId: 1087,
        nutrientName: 'Calcium, Ca',
        nutrientNumber: '301',
        unitName: 'mg'
      })

      // Create Food Categories
      CREATE (catBev:FoodCategory {
        categoryId: 'cat-beverages',
        description: 'Beverages'
      })

      CREATE (catSweets:FoodCategory {
        categoryId: 'cat-sweets',
        description: 'Sweets'
      })

      CREATE (catConc:FoodCategory {
        categoryId: 'cat-concentrates',
        description: 'Flavor Concentrates'
      })

      // Create Plant
      CREATE (plantBev:Plant {
        id: 'plant-central-bev',
        name: 'Central Beverage Production Facility',
        location: 'Memphis, TN',
        region: 'Central USA',
        capacity: '500000 L/day',
        certifications: ['FDA', 'HACCP', 'ISO 22000', 'FSSC 22000', 'SQF']
      })

      // Create Sales Order
      CREATE (orderBev:SalesOrder {
        id: 'so-cola-2024-q1-001',
        orderNumber: 'SO-BEV-2024-001',
        customer: 'National Restaurant Chain',
        quantity: 500000,
        quantityUnit: 'L',
        dueDate: datetime('2024-04-01T00:00:00Z'),
        priority: 'High',
        status: 'In Production'
      })

      // Create Processes
      CREATE (pb1:Process {
        id: 'proc-bev-mix',
        name: 'Syrup Mixing',
        processType: 'Blending',
        duration: '30 min',
        temperature: '25°C',
        equipment: 'High Shear Mixer'
      })

      CREATE (pb2:Process {
        id: 'proc-bev-filter',
        name: 'Filtration',
        processType: 'Clarification',
        duration: '10 min',
        filterSize: '5 micron',
        equipment: 'Cartridge Filter'
      })

      CREATE (pb3:Process {
        id: 'proc-bev-carb',
        name: 'Carbonation',
        processType: 'Gas Infusion',
        duration: '5 min',
        temperature: '4°C',
        co2Volume: '4.0 volumes',
        equipment: 'Carbonator'
      })

      CREATE (pb4:Process {
        id: 'proc-bev-fill',
        name: 'Filling and Capping',
        processType: 'Packaging',
        duration: '1 min',
        temperature: '4°C',
        equipment: 'Aseptic Filler'
      })

      CREATE (pb5:Process {
        id: 'proc-bev-pasteurize',
        name: 'Tunnel Pasteurization',
        processType: 'Preservation',
        duration: '20 min',
        temperature: '60°C',
        equipment: 'Tunnel Pasteurizer'
      })

      // Create Relationships - Recipe Hierarchy
      CREATE (f)-[:DERIVED_FROM {derivedDate: datetime('2024-01-11T10:00:00Z')}]->(mr)
      CREATE (mfg)-[:DERIVED_FROM {derivedDate: datetime('2024-01-12T14:00:00Z'), scaleFactor: 5.0}]->(f)

      // Create Relationships - Formulation uses Foods
      CREATE (f)-[:USES_INGREDIENT {
        quantity: 8900,
        unit: 'L',
        percentage: 89.0,
        function: 'Base Liquid'
      }]->(water)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 1000,
        unit: 'kg',
        percentage: 10.0,
        function: 'Sweetener'
      }]->(sugar)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 90,
        unit: 'L',
        percentage: 0.9,
        function: 'Flavor System'
      }]->(colaConc)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 80,
        unit: 'kg',
        percentage: 0.08,
        function: 'Carbonation Agent',
        dissolutionRate: 'Variable'
      }]->(co2)

      CREATE (f)-[:USES_INGREDIENT {
        quantity: 2,
        unit: 'kg',
        percentage: 0.02,
        function: 'Preservative',
        maxLevel: '0.02%'
      }]->(preservative)

      // Create Relationships - Food Categories
      CREATE (water)-[:BELONGS_TO_CATEGORY]->(catBev)
      CREATE (sugar)-[:BELONGS_TO_CATEGORY]->(catSweets)
      CREATE (colaConc)-[:BELONGS_TO_CATEGORY]->(catConc)

      // Create Relationships - Nutrients
      CREATE (water)-[:CONTAINS_NUTRIENT {value: 0, unit: 'kcal', per100ml: 0}]->(n1)
      CREATE (sugar)-[:CONTAINS_NUTRIENT {value: 387, unit: 'kcal', per100g: 387}]->(n1)
      CREATE (sugar)-[:CONTAINS_NUTRIENT {value: 99.8, unit: 'g', per100g: 99.8}]->(n4)

      // Create Relationships - Processes
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 1, critical: true}]->(pb1)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 2, critical: true}]->(pb2)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 3, critical: true, criticalControlPoint: true}]->(pb3)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 4, critical: true, criticalControlPoint: true}]->(pb4)
      CREATE (f)-[:REQUIRES_PROCESS {sequence: 5, critical: true, criticalControlPoint: true}]->(pb5)

      // Create Relationships - Manufacturing
      CREATE (plantBev)-[:PRODUCES {line: 'Beverage Line 1', efficiency: 0.98}]->(mfg)

      // Create Relationships - Sales Orders
      CREATE (orderBev)-[:REQUIRES {quantity: 500000, unit: 'L'}]->(mfg)

      RETURN count(*) as itemsCreated
    `

    await neo4jManager.query(cypher)
  }

  private async loadJuicesData(): Promise<void> {
    const cypher = `
      // Create Orange Juice Formulation
      CREATE (f1:Formulation {
        id: 'orange-juice-001',
        name: 'Premium Orange Juice',
        version: '2.3',
        type: 'Fruit Juice',
        status: 'Production',
        targetYield: 5000,
        yieldUnit: 'L',
        description: '100% pure orange juice from concentrate',
        createdBy: 'juice.rd@tcs.com',
        createdDate: datetime('2024-01-15T08:00:00Z'),
        category: 'Juices'
      })

      // Create Mixed Berry Juice Formulation
      CREATE (f2:Formulation {
        id: 'berry-blend-001',
        name: 'Mixed Berry Juice Blend',
        version: '1.8',
        type: 'Fruit Juice Blend',
        status: 'Production',
        targetYield: 3000,
        yieldUnit: 'L',
        description: 'Premium blend of strawberry, blueberry, and raspberry',
        createdBy: 'juice.rd@tcs.com',
        createdDate: datetime('2024-01-16T09:30:00Z'),
        category: 'Juices'
      })

      // Create Master Recipes
      CREATE (mr1:MasterRecipe {
        id: 'mr-orange-juice-001',
        name: 'Orange Juice Master Formula',
        version: '2.3',
        status: 'Approved',
        approvedBy: 'head.juices@tcs.com',
        approvedDate: datetime('2024-01-14T15:00:00Z'),
        recipeType: 'Juice',
        targetMarket: 'North America'
      })

      CREATE (mr2:MasterRecipe {
        id: 'mr-berry-juice-001',
        name: 'Berry Blend Master Formula',
        version: '1.8',
        status: 'Approved',
        approvedBy: 'head.juices@tcs.com',
        approvedDate: datetime('2024-01-15T16:30:00Z'),
        recipeType: 'Juice Blend',
        targetMarket: 'Premium Markets'
      })

      // Create Manufacturing Recipes
      CREATE (mfg1:ManufacturingRecipe {
        id: 'mfg-oj-line-001',
        name: 'Orange Juice Production Line 1',
        batchSize: 25000,
        batchUnit: 'L',
        efficiency: 0.97,
        productionRate: '6000 L/hr',
        equipmentLine: 'Juice Line 1',
        plant: 'Juice Facility A'
      })

      CREATE (mfg2:ManufacturingRecipe {
        id: 'mfg-berry-line-001',
        name: 'Berry Juice Production Line 1',
        batchSize: 15000,
        batchUnit: 'L',
        efficiency: 0.95,
        productionRate: '4000 L/hr',
        equipmentLine: 'Juice Line 2',
        plant: 'Juice Facility A'
      })

      // Create Raw Materials - Orange Juice
      CREATE (ojConc:Food {
        fdcId: 169098,
        description: 'Orange juice, frozen concentrate, unsweetened',
        dataType: 'SR Legacy',
        foodCategory: 'Fruits and Fruit Juices',
        servingSize: 100,
        servingSizeUnit: 'ml',
        brixLevel: 65.0
      })

      CREATE (waterJ:Food {
        fdcId: 171284,
        description: 'Water, filtered, UV treated',
        dataType: 'SR Legacy',
        foodCategory: 'Beverages',
        servingSize: 100,
        servingSizeUnit: 'ml'
      })

      CREATE (vitC:Food {
        fdcId: 999201,
        description: 'Ascorbic acid (Vitamin C)',
        dataType: 'Food Additive',
        foodCategory: 'Vitamins',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Nutrient Fortification'
      })

      // Create Raw Materials - Berry Juice
      CREATE (strawConc:Food {
        fdcId: 169926,
        description: 'Strawberry puree concentrate',
        dataType: 'Foundation',
        foodCategory: 'Fruits and Fruit Juices',
        servingSize: 100,
        servingSizeUnit: 'ml',
        brixLevel: 45.0
      })

      CREATE (blueConc:Food {
        fdcId: 171711,
        description: 'Blueberry puree concentrate',
        dataType: 'Foundation',
        foodCategory: 'Fruits and Fruit Juices',
        servingSize: 100,
        servingSizeUnit: 'ml',
        brixLevel: 48.0
      })

      CREATE (raspConc:Food {
        fdcId: 167755,
        description: 'Raspberry puree concentrate',
        dataType: 'Foundation',
        foodCategory: 'Fruits and Fruit Juices',
        servingSize: 100,
        servingSizeUnit: 'ml',
        brixLevel: 42.0
      })

      CREATE (sugarJ:Food {
        fdcId: 169655,
        description: 'Cane sugar, refined',
        dataType: 'SR Legacy',
        foodCategory: 'Sweets',
        servingSize: 100,
        servingSizeUnit: 'g'
      })

      CREATE (pectinase:Food {
        fdcId: 999202,
        description: 'Pectinase enzyme',
        dataType: 'Processing Aid',
        foodCategory: 'Enzymes',
        servingSize: 100,
        servingSizeUnit: 'g',
        function: 'Clarification'
      })

      // Create Nutrients
      CREATE (n8:Nutrient {
        nutrientId: 1162,
        nutrientName: 'Vitamin C, total ascorbic acid',
        nutrientNumber: '401',
        unitName: 'mg'
      })

      CREATE (n9:Nutrient {
        nutrientId: 1079,
        nutrientName: 'Fiber, total dietary',
        nutrientNumber: '291',
        unitName: 'g'
      })

      CREATE (n10:Nutrient {
        nutrientId: 1092,
        nutrientName: 'Potassium, K',
        nutrientNumber: '306',
        unitName: 'mg'
      })

      // Create Food Categories
      CREATE (catJuice:FoodCategory {
        categoryId: 'cat-juices',
        description: 'Fruits and Fruit Juices'
      })

      CREATE (catVit:FoodCategory {
        categoryId: 'cat-vitamins',
        description: 'Vitamins and Fortification'
      })

      // Create Plant
      CREATE (plantJuice:Plant {
        id: 'plant-juice-a',
        name: 'Juice Production Facility A',
        location: 'Orlando, FL',
        region: 'Southeast USA',
        capacity: '200000 L/day',
        certifications: ['FDA', 'HACCP', 'ISO 22000', 'FSSC 22000', 'Organic']
      })

      // Create Sales Orders
      CREATE (orderOJ:SalesOrder {
        id: 'so-oj-2024-q1-001',
        orderNumber: 'SO-JUICE-2024-001',
        customer: 'Grocery Chain East',
        quantity: 200000,
        quantityUnit: 'L',
        dueDate: datetime('2024-03-25T00:00:00Z'),
        priority: 'High',
        status: 'In Production'
      })

      CREATE (orderBerry:SalesOrder {
        id: 'so-berry-2024-q1-001',
        orderNumber: 'SO-JUICE-2024-002',
        customer: 'Premium Markets',
        quantity: 100000,
        quantityUnit: 'L',
        dueDate: datetime('2024-04-10T00:00:00Z'),
        priority: 'Medium',
        status: 'Planning'
      })

      // Create Processes - Orange Juice
      CREATE (pj1:Process {
        id: 'proc-juice-reconstitute',
        name: 'Reconstitution',
        processType: 'Blending',
        duration: '20 min',
        temperature: '20°C',
        equipment: 'Blending Tank'
      })

      CREATE (pj2:Process {
        id: 'proc-juice-pasteurize',
        name: 'HTST Pasteurization',
        processType: 'Thermal Treatment',
        duration: '15 sec',
        temperature: '95°C',
        equipment: 'Plate Heat Exchanger'
      })

      CREATE (pj3:Process {
        id: 'proc-juice-cool',
        name: 'Rapid Cooling',
        processType: 'Cooling',
        duration: '30 sec',
        temperature: '4°C',
        equipment: 'Cooling Section'
      })

      CREATE (pj4:Process {
        id: 'proc-juice-fill',
        name: 'Aseptic Filling',
        processType: 'Packaging',
        duration: '1 min',
        temperature: '4°C',
        equipment: 'Aseptic Filler'
      })

      // Create Processes - Berry Juice
      CREATE (pj5:Process {
        id: 'proc-berry-blend',
        name: 'Berry Concentrate Blending',
        processType: 'Blending',
        duration: '25 min',
        temperature: '18°C',
        equipment: 'High Shear Blender'
      })

      CREATE (pj6:Process {
        id: 'proc-berry-enzyme',
        name: 'Enzymatic Treatment',
        processType: 'Clarification',
        duration: '60 min',
        temperature: '45°C',
        equipment: 'Enzyme Reactor'
      })

      CREATE (pj7:Process {
        id: 'proc-berry-filter',
        name: 'Ultra Filtration',
        processType: 'Clarification',
        duration: '15 min',
        filterSize: '0.2 micron',
        equipment: 'Membrane Filter'
      })

      // Create Relationships - Recipe Hierarchy (Orange Juice)
      CREATE (f1)-[:DERIVED_FROM {derivedDate: datetime('2024-01-14T16:00:00Z')}]->(mr1)
      CREATE (mfg1)-[:DERIVED_FROM {derivedDate: datetime('2024-01-15T10:00:00Z'), scaleFactor: 5.0}]->(f1)

      // Create Relationships - Recipe Hierarchy (Berry Juice)
      CREATE (f2)-[:DERIVED_FROM {derivedDate: datetime('2024-01-15T17:00:00Z')}]->(mr2)
      CREATE (mfg2)-[:DERIVED_FROM {derivedDate: datetime('2024-01-16T11:00:00Z'), scaleFactor: 5.0}]->(f2)

      // Create Relationships - Orange Juice Ingredients
      CREATE (f1)-[:USES_INGREDIENT {
        quantity: 800,
        unit: 'L',
        percentage: 16.0,
        function: 'Flavor Base',
        reconstitutionRatio: '1:5'
      }]->(ojConc)

      CREATE (f1)-[:USES_INGREDIENT {
        quantity: 4180,
        unit: 'L',
        percentage: 83.6,
        function: 'Diluent'
      }]->(waterJ)

      CREATE (f1)-[:USES_INGREDIENT {
        quantity: 20,
        unit: 'kg',
        percentage: 0.4,
        function: 'Fortification',
        targetLevel: '60 mg/100ml'
      }]->(vitC)

      // Create Relationships - Berry Juice Ingredients
      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 450,
        unit: 'L',
        percentage: 15.0,
        function: 'Primary Flavor'
      }]->(strawConc)

      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 300,
        unit: 'L',
        percentage: 10.0,
        function: 'Secondary Flavor'
      }]->(blueConc)

      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 150,
        unit: 'L',
        percentage: 5.0,
        function: 'Accent Flavor'
      }]->(raspConc)

      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 2050,
        unit: 'L',
        percentage: 68.3,
        function: 'Base Liquid'
      }]->(waterJ)

      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 45,
        unit: 'kg',
        percentage: 1.5,
        function: 'Sweetener'
      }]->(sugarJ)

      CREATE (f2)-[:USES_INGREDIENT {
        quantity: 5,
        unit: 'kg',
        percentage: 0.17,
        function: 'Processing Aid',
        removalByFiltration: true
      }]->(pectinase)

      // Create Relationships - Food Categories
      CREATE (ojConc)-[:BELONGS_TO_CATEGORY]->(catJuice)
      CREATE (strawConc)-[:BELONGS_TO_CATEGORY]->(catJuice)
      CREATE (blueConc)-[:BELONGS_TO_CATEGORY]->(catJuice)
      CREATE (raspConc)-[:BELONGS_TO_CATEGORY]->(catJuice)
      CREATE (vitC)-[:BELONGS_TO_CATEGORY]->(catVit)

      // Create Relationships - Nutrients (Orange Juice)
      CREATE (ojConc)-[:CONTAINS_NUTRIENT {value: 446, unit: 'kcal', per100ml: 446}]->(n1)
      CREATE (ojConc)-[:CONTAINS_NUTRIENT {value: 6.7, unit: 'g', per100ml: 6.7}]->(n2)
      CREATE (ojConc)-[:CONTAINS_NUTRIENT {value: 108, unit: 'g', per100ml: 108}]->(n4)
      CREATE (ojConc)-[:CONTAINS_NUTRIENT {value: 293, unit: 'mg', per100ml: 293}]->(n8)
      CREATE (ojConc)-[:CONTAINS_NUTRIENT {value: 1435, unit: 'mg', per100ml: 1435}]->(n10)

      // Create Relationships - Nutrients (Berry Concentrates)
      CREATE (strawConc)-[:CONTAINS_NUTRIENT {value: 32, unit: 'kcal', per100ml: 32}]->(n1)
      CREATE (strawConc)-[:CONTAINS_NUTRIENT {value: 7.7, unit: 'g', per100ml: 7.7}]->(n4)
      CREATE (strawConc)-[:CONTAINS_NUTRIENT {value: 58.8, unit: 'mg', per100ml: 58.8}]->(n8)

      CREATE (blueConc)-[:CONTAINS_NUTRIENT {value: 57, unit: 'kcal', per100ml: 57}]->(n1)
      CREATE (blueConc)-[:CONTAINS_NUTRIENT {value: 14.5, unit: 'g', per100ml: 14.5}]->(n4)
      CREATE (blueConc)-[:CONTAINS_NUTRIENT {value: 9.7, unit: 'mg', per100ml: 9.7}]->(n8)
      CREATE (blueConc)-[:CONTAINS_NUTRIENT {value: 2.4, unit: 'g', per100ml: 2.4}]->(n9)

      CREATE (raspConc)-[:CONTAINS_NUTRIENT {value: 52, unit: 'kcal', per100ml: 52}]->(n1)
      CREATE (raspConc)-[:CONTAINS_NUTRIENT {value: 11.9, unit: 'g', per100ml: 11.9}]->(n4)
      CREATE (raspConc)-[:CONTAINS_NUTRIENT {value: 26.2, unit: 'mg', per100ml: 26.2}]->(n8)
      CREATE (raspConc)-[:CONTAINS_NUTRIENT {value: 6.5, unit: 'g', per100ml: 6.5}]->(n9)

      // Create Relationships - Processes (Orange Juice)
      CREATE (f1)-[:REQUIRES_PROCESS {sequence: 1, critical: true}]->(pj1)
      CREATE (f1)-[:REQUIRES_PROCESS {sequence: 2, critical: true, criticalControlPoint: true}]->(pj2)
      CREATE (f1)-[:REQUIRES_PROCESS {sequence: 3, critical: true}]->(pj3)
      CREATE (f1)-[:REQUIRES_PROCESS {sequence: 4, critical: true, criticalControlPoint: true}]->(pj4)

      // Create Relationships - Processes (Berry Juice)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 1, critical: true}]->(pj5)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 2, critical: false}]->(pj6)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 3, critical: true}]->(pj7)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 4, critical: true, criticalControlPoint: true}]->(pj2)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 5, critical: true}]->(pj3)
      CREATE (f2)-[:REQUIRES_PROCESS {sequence: 6, critical: true, criticalControlPoint: true}]->(pj4)

      // Create Relationships - Manufacturing
      CREATE (plantJuice)-[:PRODUCES {line: 'Juice Line 1', efficiency: 0.97}]->(mfg1)
      CREATE (plantJuice)-[:PRODUCES {line: 'Juice Line 2', efficiency: 0.95}]->(mfg2)

      // Create Relationships - Sales Orders
      CREATE (orderOJ)-[:REQUIRES {quantity: 200000, unit: 'L'}]->(mfg1)
      CREATE (orderBerry)-[:REQUIRES {quantity: 100000, unit: 'L'}]->(mfg2)

      RETURN count(*) as itemsCreated
    `

    await neo4jManager.query(cypher)
  }

  private async getDataStats(): Promise<Omit<SampleDataStats, 'executionTime'>> {
    const cypher = `
      MATCH (n)
      WITH labels(n) as nodeLabels, count(n) as nodeCount
      UNWIND nodeLabels as label
      WITH label, sum(nodeCount) as totalCount
      RETURN collect(DISTINCT label) as categories
    `

    const result = await neo4jManager.query(cypher)
    
    const nodeCountResult = await neo4jManager.query('MATCH (n) RETURN count(n) as count')
    const relCountResult = await neo4jManager.query('MATCH ()-[r]->() RETURN count(r) as count')

    const categories = result.nodes[0]?.properties?.categories || []
    const nodesCreated = nodeCountResult.nodes[0]?.properties?.count || 0
    const relationshipsCreated = relCountResult.nodes[0]?.properties?.count || 0

    return {
      nodesCreated: Number(nodesCreated),
      relationshipsCreated: Number(relationshipsCreated),
      categories
    }
  }

  async clearDatabase(): Promise<void> {
    await this.clearExistingData()
  }
}

export const sampleDataLoader = new SampleDataLoader()
