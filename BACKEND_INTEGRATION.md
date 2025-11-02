# Backend Integration Guide

## Overview

The Formulation Graph Studio now has **full backend integration** with real services:

- **Neo4j** - Graph database for relationships and formulation data
- **SAP MDG** - Master Data Governance for material management
- **PLM** - Product Lifecycle Management for specifications

## Quick Start

### For Users: Connecting to Real Services

**📖 See [CONNECTING_BACKEND_SERVICES.md](./CONNECTING_BACKEND_SERVICES.md) for a complete user guide on connecting to real backend services.**

The comprehensive guide includes:
- Step-by-step configuration for each service
- Connection testing procedures
- Troubleshooting common issues
- Security best practices
- Environment variable setup

### For Developers: Architecture Overview

Continue reading below for the technical architecture and API documentation.

## Architecture

### Integration Manager (`/src/lib/managers/integration-manager.ts`)

The `IntegrationManager` orchestrates all backend connections and provides a unified API:

```typescript
import { integrationManager } from '@/lib/managers/integration-manager'

// Initialize all connections
await integrationManager.initializeConnections({
  neo4j: {
    uri: 'neo4j+s://xxxxx.databases.neo4j.io',
    username: 'neo4j',
    password: 'your-password',
    database: 'neo4j'
  },
  plm: {
    baseUrl: 'https://plm.company.com/api',
    apiKey: 'your-api-key',
    enabled: true
  },
  mdg: {
    baseUrl: 'https://sap.company.com/mdg/api',
    apiKey: 'your-api-key',
    client: '100',
    plant: '1000',
    enabled: true
  }
})
```

### Key Features

1. **Unified Connection Management**
   - Single point to initialize all backend connections
   - Automatic retry and error handling
   - Connection status monitoring

2. **Data Synchronization**
   - Sync formulations to Neo4j graph
   - Enrich ingredients from PLM
   - Create materials in SAP MDG
   - Real-time sync status tracking

3. **Query Execution**
   - Execute Cypher queries on Neo4j
   - Search materials in PLM and MDG
   - Natural language query support (with GenAI)

## API Endpoints

### Neo4j Operations

```typescript
// Query Neo4j
const result = await integrationManager.queryNeo4j(
  'MATCH (n:Formulation) RETURN n LIMIT 10'
)

// Sync formulation to Neo4j
await integrationManager.syncFormulationToNeo4j(formulation)

// Check connection
const isConnected = integrationManager.isNeo4jConnected()
```

### PLM Operations

```typescript
import { plmClient } from '@/lib/api/plm'

// Search materials
const materials = await plmClient.searchMaterials('orange')

// Get material details
const material = await plmClient.getMaterial('PLM-001')

// Get specifications
const specs = await plmClient.getSpecifications('PLM-001')

// Create material
const materialId = await plmClient.createMaterial({
  description: 'New Material',
  type: 'raw',
  status: 'active',
  // ...
})
```

### MDG Operations

```typescript
import { mdgClient } from '@/lib/api/mdg'

// Search materials
const materials = await mdgClient.searchMaterials('juice')

// Get master data
const masterData = await mdgClient.getMasterData('10001234')

// Create material
const materialNumber = await mdgClient.createMaterial({
  materialDescription: 'Orange Juice Concentrate',
  materialGroup: 'CONCEN',
  materialType: 'FERT',
  baseUnit: 'KG',
  // ...
})

// Validate material
const validation = await mdgClient.validateMaterial(material)
```

## REST API Endpoints

The application provides REST-compatible API endpoints:

### Formulation API

```typescript
import { FormulationAPI } from '@/lib/api/rest-endpoints'

// Create formulation
const response = await FormulationAPI.create(formulation, userId)

// Scale formulation
const scaled = await FormulationAPI.scale(
  formulationId,
  targetQuantity,
  targetUnit,
  userId,
  userName
)

// Validate yield
const validation = await FormulationAPI.validateYield(formulation)
```

### Manufacturing API

```typescript
import { ManufacturingAPI } from '@/lib/api/rest-endpoints'

// Generate manufacturing recipe
const mfgRecipe = await ManufacturingAPI.generate(
  masterRecipeId,
  batchSize,
  plant,
  userId,
  userName
)

// Calculate yield
const yieldResult = await ManufacturingAPI.calculateYield(
  manufacturingRecipeId,
  operations,
  userId,
  userName
)
```

### Sales Order API

```typescript
import { SalesOrderAPI } from '@/lib/api/rest-endpoints'

// Derive recipes from sales order
const derived = await SalesOrderAPI.derive(
  salesOrderId,
  lineNumbers,
  userId,
  userName
)

// Validate order
const validation = await SalesOrderAPI.validateOrder(order)
```

## Configuration

### Neo4j Configuration

Configure in the Settings dialog or programmatically:

```typescript
import { neo4jManager } from '@/lib/managers/neo4j-manager'

// Connect
await neo4jManager.connect({
  uri: 'neo4j+s://xxxxx.databases.neo4j.io',
  username: 'neo4j',
  password: 'your-password',
  database: 'neo4j'
})

// Test connection
const isConnected = await neo4jManager.testConnection(config)

// Toggle mock mode
neo4jManager.setMockMode(false)

// Get connection status
const status = neo4jManager.getConnectionStatus()
```

### Environment Variables

You can configure API endpoints via environment variables:

```bash
# .env
VITE_PLM_API_URL=https://plm.company.com/api
VITE_PLM_API_KEY=your-plm-api-key

VITE_MDG_API_URL=https://sap.company.com/mdg/api
VITE_MDG_API_KEY=your-mdg-api-key
VITE_MDG_CLIENT=100
VITE_MDG_PLANT=1000
```

## Mock Mode

All services support mock mode for development and testing:

```typescript
// Neo4j
neo4jManager.setMockMode(true)

// PLM (set in constructor)
const plmClient = new PLMClient(true)

// MDG (set in constructor)
const mdgClient = new MDGClient(true)
```

When in mock mode:
- No actual API calls are made
- Realistic mock data is returned
- Useful for development without backend access

## Data Flow

### Formulation Creation Flow

1. User creates formulation in UI
2. Formulation saved to local state (useKV)
3. Optional: Sync to Neo4j for graph relationships
4. Optional: Enrich ingredients from PLM
5. Optional: Create materials in SAP MDG

### BOM Configuration Flow

1. Select formulation
2. Create BOM with components
3. Add process steps
4. Calculate yields and costs
5. Sync to Neo4j for tracking
6. Export to SAP for production planning

### Graph Visualization Flow

1. Query Neo4j for formulation relationships
2. Transform to Cytoscape format
3. Render interactive graph
4. Support filtering, search, layout changes
5. Display node details and lineage

## Testing

### Test All Connections

```typescript
const results = await integrationManager.testAllConnections()
// Returns: { neo4j: boolean, plm: boolean, mdg: boolean }
```

### Monitor Sync Status

```typescript
const statuses = integrationManager.getAllSyncStatuses()
// Returns array of: { service, connected, lastSync, error }
```

## Error Handling

All API methods use try-catch and return structured responses:

```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: string[]
  }
  metadata?: {
    timestamp: Date
    executionTime: number
    version: string
  }
}
```

Example:

```typescript
const response = await FormulationAPI.create(formulation, userId)

if (response.success) {
  console.log('Formulation created:', response.data)
} else {
  console.error('Error:', response.error?.message)
}
```

## Best Practices

1. **Always test connections** before executing operations
2. **Use mock mode** during development
3. **Handle errors gracefully** with user-friendly messages
4. **Monitor sync status** for real-time feedback
5. **Validate data** before syncing to backend systems
6. **Use transactions** for multi-step operations
7. **Cache frequently accessed data** to reduce API calls
8. **Log all backend operations** for debugging

## Next Steps

1. Configure your Neo4j connection in Settings
2. Test the connection
3. Disable mock mode
4. Create a formulation and sync to Neo4j
5. View in the Relationship Graph
6. Search PLM/MDG for materials
7. Enrich ingredients with real data

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify connection settings in Settings dialog
- Test connections using the "Test Connections" button
- Review sync status badges in Integration Panel
