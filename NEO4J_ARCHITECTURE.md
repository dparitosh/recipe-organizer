# Neo4j Integration Architecture

## Overview

This application uses a modular architecture for Neo4j integration with three main layers:

1. **Drivers Layer** (`/lib/drivers/`) - Low-level database connectivity
2. **GenAI Layer** (`/lib/genai/`) - AI-powered Cypher query generation
3. **Managers Layer** (`/lib/managers/`) - High-level business logic and orchestration

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                     (React Components)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Managers Layer                            │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Neo4jManager                                      │     │
│  │  • Connection orchestration                        │     │
│  │  • Mock mode management                            │     │
│  │  • Query routing                                   │     │
│  └───────────────────────────────────────────────────┘     │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
         ┌─────────▼────────┐   ┌────────▼─────────┐
         │  Neo4j Driver    │   │  GenAI Client    │
         │  • Connection    │   │  • LLM calls     │
         │  • Pooling       │   │  • Cypher gen    │
         │  • Sessions      │   │  • Plugin support│
         └──────────────────┘   └──────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │   Neo4j Database │
         │   (or Mock Data) │
         └──────────────────┘
```

## Layer Details

### 1. Drivers Layer (`/lib/drivers/`)

**Neo4jDriver** - Direct Neo4j database connectivity using the official `neo4j-driver` package.

**Features:**
- Connection pooling and session management
- Automatic reconnection handling
- Transaction support (READ/WRITE)
- Multi-database support
- Type-safe query execution

**Key Methods:**
```typescript
// Connect to database
await neo4jDriver.connect({
  uri: 'neo4j+s://xxxxx.databases.neo4j.io',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
})

// Execute read query
const result = await neo4jDriver.executeQuery(
  'MATCH (n:Ingredient) RETURN n LIMIT 10'
)

// Execute write query
await neo4jDriver.executeWriteQuery(
  'CREATE (n:Ingredient {name: $name})',
  { name: 'Flour' }
)

// Execute transaction
await neo4jDriver.executeTransaction(async (tx) => {
  await tx.run('CREATE (n:Node)')
  await tx.run('CREATE (m:Node)')
}, 'WRITE')
```

### 2. GenAI Layer (`/lib/genai/`)

**GenAIClient** - AI-powered natural language to Cypher query conversion.

**Modes:**
- **Spark LLM Mode** (default): Uses the built-in Spark LLM API
- **Neo4j Plugin Mode**: Uses Neo4j GenAI plugin if available

**Features:**
- Natural language query parsing
- Cypher query generation
- Context-aware query building
- Fallback mechanism (plugin → Spark LLM)

**Key Methods:**
```typescript
// Generate Cypher from natural language
const response = await genAIClient.generateCypher({
  naturalLanguageQuery: 'Find all recipes that use flour',
  context: { limit: 10 }
})
// Returns: { cypher: 'MATCH (r:Recipe)-[:USES]->...', confidence: 0.85 }

// Execute natural language query directly
const result = await genAIClient.executeCypherFromNL(
  'Show me ingredients with allergens'
)
```

### 3. Managers Layer (`/lib/managers/`)

**Neo4jManager** - High-level orchestration and business logic.

**Features:**
- Mock mode for development/testing
- Connection status management
- Query result transformation
- Domain-specific query methods
- Automatic driver coordination

**Key Methods:**
```typescript
// Set mock mode
neo4jManager.setMockMode(true)

// Connect
await neo4jManager.connect({
  uri: 'neo4j+s://xxxxx.databases.neo4j.io',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
})

// Execute query (uses driver or mock based on mode)
const result = await neo4jManager.query(
  'MATCH (n:Ingredient) RETURN n'
)

// Natural language query
const nlResult = await neo4jManager.naturalLanguageQuery(
  'Find recipes with chocolate'
)

// Domain-specific methods
const graph = await neo4jManager.getFormulationGraph('formulation-id')
const relationships = await neo4jManager.getRelationshipGraph()

// Get connection status
const status = neo4jManager.getConnectionStatus()
// Returns: { isConnected, isMockMode, config, serverInfo }
```

## Configuration

### Storage

All Neo4j configuration is stored persistently using `useKV`:

```typescript
// Stored keys:
- 'neo4j-config': Neo4jDriverConfig
- 'neo4j-mock-mode': boolean
```

### Default Configuration

```typescript
{
  uri: '',
  username: '',
  password: '',
  database: 'neo4j'
}
```

## Usage Patterns

### Pattern 1: Development with Mock Mode

```typescript
// Enable mock mode for development
neo4jManager.setMockMode(true)

// Queries return mock data
const data = await neo4jManager.query('MATCH (n) RETURN n')
// Uses pre-defined mock data
```

### Pattern 2: Production with Live Database

```typescript
// Connect to Neo4j
await neo4jManager.connect({
  uri: 'neo4j+s://xxxxx.databases.neo4j.io',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
})

// Disable mock mode
neo4jManager.setMockMode(false)

// Queries hit real database
const data = await neo4jManager.query('MATCH (n) RETURN n')
```

### Pattern 3: Testing Connectivity

```typescript
// Test connection without modifying state
const isConnected = await neo4jManager.testConnection({
  uri: 'neo4j+s://xxxxx.databases.neo4j.io',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
})

if (isConnected) {
  console.log('Connection successful')
}
```

### Pattern 4: Natural Language Queries

```typescript
// Using GenAI to convert NL to Cypher
const result = await neo4jManager.naturalLanguageQuery(
  'Show me all manufacturing recipes produced in North America',
  { limit: 20 }
)

console.log('Generated Cypher:', result.generatedCypher)
console.log('Results:', result.nodes, result.relationships)
```

## Error Handling

All layers implement comprehensive error handling:

```typescript
try {
  await neo4jManager.connect(config)
} catch (error) {
  if (error.message.includes('authentication')) {
    // Handle auth error
  } else if (error.message.includes('network')) {
    // Handle network error
  }
}
```

## Testing

The application includes a `ConnectionTester` component for testing:

1. **Manager Status Check** - Verifies manager state
2. **Mock Query Test** - Tests mock data functionality
3. **GenAI Cypher Generation** - Tests LLM query generation
4. **Live Neo4j Query** - Tests real database connectivity (if connected)

Access via Settings → Connection Tests tab.

## Security Considerations

- **Passwords**: Never logged or displayed in plain text
- **Connection Strings**: Stored securely in KV store
- **Sessions**: Automatically closed after queries
- **Credentials**: Not included in error messages

## Performance

- **Connection Pooling**: Max 50 connections
- **Connection Lifetime**: 3 hours
- **Session Management**: Automatic cleanup
- **Query Timeout**: 2 minutes acquisition timeout

## Neo4j Driver Features Used

- ✅ Official Neo4j JavaScript Driver
- ✅ Connection pooling
- ✅ Session lifecycle management
- ✅ Transaction support
- ✅ Multi-database support
- ✅ Secure TLS/SSL connections
- ✅ Automatic retry logic
- ✅ Integer handling (lossless disabled)

## GenAI Plugin Support

If your Neo4j instance has the GenAI plugin installed:

```cypher
// The GenAI client will attempt to use:
CALL genai.cypher.generate($naturalLanguageQuery, $context)
YIELD cypher, confidence
RETURN cypher, confidence
```

Falls back to Spark LLM if plugin is unavailable.

## Troubleshooting

### Connection Issues

1. Verify URI format: `neo4j+s://` for secure, `neo4j://` for local
2. Check firewall rules for port 7687
3. Verify credentials in Neo4j database
4. Test with `testConnection()` method

### Query Issues

1. Check Cypher syntax
2. Verify node labels and relationship types exist
3. Review query in mock mode first
4. Check database permissions

### Mock Mode Issues

1. Ensure mock mode is enabled: `neo4jManager.setMockMode(true)`
2. Check mock data in `neo4j-manager.ts`
3. Verify mock data structure matches expected schema

## Future Enhancements

- [ ] Query result caching
- [ ] Batch query support
- [ ] GraphQL integration
- [ ] Query performance monitoring
- [ ] Connection health checks
- [ ] Multi-cluster support
- [ ] Query builder UI
