# Connecting to Real Backend Services

This guide explains how to connect the Formulation Graph Studio to real backend services (Neo4j, PLM, and SAP MDG) instead of using mock data.

## Overview

The application supports three backend integrations:

1. **Neo4j Graph Database** - For storing and querying formulation relationships
2. **PLM (Product Lifecycle Management)** - For material specifications and regulatory data
3. **SAP MDG (Master Data Governance)** - For material master data and SAP integration

All services start in **Mock Mode** by default, which means they use simulated data and don't require real backend connections.

## Quick Start

### Step 1: Open Backend Configuration

1. Click the **Settings** icon (⚙️) in the top-right header
2. The "Backend Services Configuration" dialog will open

### Step 2: Configure Each Service

Navigate through the tabs (Neo4j, PLM, SAP MDG) and configure each service you want to use.

---

## Neo4j Configuration

### Prerequisites

- A Neo4j database instance (AuraDB, Enterprise, or Community Edition)
- Connection URI (e.g., `neo4j+s://xxxxx.databases.neo4j.io`)
- Username and password
- Database name (usually `neo4j`)

### Configuration Steps

1. Go to the **Neo4j** tab in Backend Services Configuration
2. Turn off **Mock Mode** toggle
3. Enter your connection details:
   - **Connection URI**: Your Neo4j server URI
   - **Username**: Database username (default: `neo4j`)
   - **Password**: Your database password
   - **Database**: Database name (default: `neo4j`)
4. Click **Test Connection** to verify
5. If successful, click **Save Config**

### Setting up Neo4j AuraDB (Free Tier)

1. Go to [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura)
2. Create a free account
3. Create a new AuraDB Free instance
4. Save the generated credentials
5. Use the connection URI format: `neo4j+s://xxxxx.databases.neo4j.io`

### Example Configuration

```typescript
{
  uri: "neo4j+s://abc12345.databases.neo4j.io",
  username: "neo4j",
  password: "your-secure-password",
  database: "neo4j"
}
```

### What Happens When Connected

Once Neo4j is connected:
- Formulations are automatically synced to the graph database
- Relationship graphs show real data from Neo4j
- You can execute custom Cypher queries in the Integration Panel
- Graph visualizations reflect actual database relationships

---

## PLM Configuration

### Prerequisites

- PLM system with REST API access
- API base URL
- API key or authentication token
- API endpoints compatible with the client interface

### Configuration Steps

1. Go to the **PLM** tab in Backend Services Configuration
2. Turn off **Mock Mode** toggle
3. Enter your PLM details:
   - **API Base URL**: Your PLM API endpoint (e.g., `https://plm.company.com/api`)
   - **API Key**: Your API authentication key
4. Check **Enable PLM Integration**
5. Click **Test Connection** to verify
6. If successful, click **Save Config**

### Expected API Endpoints

Your PLM system should support these endpoints:

```
GET  /health                          - Health check
GET  /materials/search?q={query}      - Search materials
GET  /materials/{materialId}          - Get material details
GET  /materials/{materialId}/specifications - Get specifications
POST /materials                       - Create material
PUT  /materials/{materialId}          - Update material
```

### Example Configuration

```typescript
{
  baseUrl: "https://plm.yourcompany.com/api",
  apiKey: "plm_api_key_abc123xyz",
  enabled: true
}
```

### What Happens When Connected

Once PLM is connected:
- Material search returns real PLM data
- Ingredient enrichment pulls specifications from PLM
- Regulatory information syncs from PLM
- Supplier data is retrieved from PLM

### Environment Variables (Optional)

You can pre-configure PLM settings using environment variables:

```bash
# .env
VITE_PLM_API_URL=https://plm.yourcompany.com/api
VITE_PLM_API_KEY=your-plm-api-key
```

---

## SAP MDG Configuration

### Prerequisites

- SAP system with MDG module
- API base URL
- API key or authentication token
- SAP client code (e.g., `100`)
- Plant code (e.g., `1000`)

### Configuration Steps

1. Go to the **SAP MDG** tab in Backend Services Configuration
2. Turn off **Mock Mode** toggle
3. Enter your SAP MDG details:
   - **API Base URL**: Your SAP MDG API endpoint (e.g., `https://sap.company.com/mdg/api`)
   - **API Key**: Your API authentication key
   - **SAP Client**: Your SAP client code (e.g., `100`)
   - **Plant Code**: Default plant for materials (e.g., `1000`)
4. Check **Enable SAP MDG Integration**
5. Click **Test Connection** to verify
6. If successful, click **Save Config**

### Expected API Endpoints

Your SAP MDG system should support these endpoints:

```
GET  /health?client={client}                     - Health check
GET  /materials/{materialNumber}?client={client} - Get master data
GET  /materials/search?q={query}&client={client} - Search materials
POST /materials                                  - Create material
PUT  /materials/{materialNumber}                 - Update material
POST /materials/validate                         - Validate material
POST /sync                                       - Sync materials
```

### Example Configuration

```typescript
{
  baseUrl: "https://sap.yourcompany.com/mdg/api",
  apiKey: "sap_mdg_api_key_xyz789",
  client: "100",
  plant: "1000",
  enabled: true
}
```

### What Happens When Connected

Once SAP MDG is connected:
- Material master data syncs with SAP
- BOM components link to SAP materials
- Cost data pulls from SAP
- Material creation pushes to SAP MDG

### Environment Variables (Optional)

You can pre-configure SAP MDG settings using environment variables:

```bash
# .env
VITE_MDG_API_URL=https://sap.yourcompany.com/mdg/api
VITE_MDG_API_KEY=your-mdg-api-key
VITE_MDG_CLIENT=100
VITE_MDG_PLANT=1000
```

---

## Testing Connections

### Individual Service Testing

Each service tab has a **Test Connection** button that:
- Verifies the connection parameters
- Measures latency
- Validates authentication
- Displays connection status

### Test All Connections

In the Integration Panel:
1. Click **Test Connections** button
2. All configured services will be tested
3. Results appear as toast notifications

### Connection Status Indicators

- **🟢 Green Badge**: Connected successfully
- **🔴 Red Badge**: Connection failed
- **🟡 Yellow Badge**: Not tested or mock mode
- **⚡ Lightning**: Testing in progress

---

## Using Real Data

### Syncing Formulations to Neo4j

Once Neo4j is connected, formulations are automatically synced when you:
- Create a new formulation
- Update ingredient details
- Modify formulation properties

Manual sync is also available through the Integration Panel.

### Enriching Ingredients from PLM

1. Create or edit a formulation
2. In the Integration Panel, go to the **PLM** tab
3. Search for a material
4. Click on a material to enrich ingredient data

### Creating Materials in SAP MDG

1. Create a BOM with ingredients
2. In the Integration Panel, go to the **SAP MDG** tab
3. Materials can be pushed to SAP from the BOM configurator

---

## Mock Mode vs Real Connections

### Mock Mode (Default)

**Advantages:**
- Works without any backend setup
- Fast development and testing
- Realistic sample data
- No authentication required

**Limitations:**
- Data doesn't persist across services
- No real-time synchronization
- Limited to predefined mock data

### Real Connections

**Advantages:**
- Production-ready data flow
- Real-time synchronization
- Integration with enterprise systems
- Persistent data storage

**Requirements:**
- Backend infrastructure setup
- Network connectivity
- Authentication credentials
- API endpoint availability

---

## Troubleshooting

### Neo4j Connection Issues

**Problem**: Connection test fails
**Solutions**:
- Verify URI format (should include protocol: `neo4j://` or `neo4j+s://`)
- Check username/password are correct
- Ensure database name matches your Neo4j instance
- Verify network connectivity and firewall rules
- For AuraDB, make sure you're using the provided connection string

**Problem**: Queries time out
**Solutions**:
- Check Neo4j server performance
- Reduce query complexity
- Add appropriate indexes to your database
- Increase timeout settings in the driver config

### PLM Connection Issues

**Problem**: API authentication fails
**Solutions**:
- Verify API key is correct and not expired
- Check API key permissions
- Ensure base URL includes protocol (`https://`)
- Verify API endpoint is accessible from your network

**Problem**: Material search returns no results
**Solutions**:
- Check PLM system has data
- Verify search endpoint format matches your PLM API
- Review API response format compatibility
- Check network logs for API errors

### SAP MDG Connection Issues

**Problem**: Client authentication fails
**Solutions**:
- Verify SAP client code is correct
- Check API key has proper authorization
- Ensure you're using the correct authentication method
- Verify plant code exists in SAP system

**Problem**: Material creation fails
**Solutions**:
- Check material validation rules in SAP
- Verify all required fields are provided
- Review material group and type combinations
- Check SAP transaction logs for errors

### General Debugging

**Enable Console Logging:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for connection messages marked with:
   - `✓` (success)
   - `✗` (failure)
   - `⚠️` (warning)

**Check Network Tab:**
1. Open Developer Tools > Network
2. Test a connection
3. Review API requests and responses
4. Check for CORS errors, 401/403 status codes

**Review Saved Configuration:**
All configurations are saved in browser storage using Spark's KV store:
- `neo4j-config` - Neo4j connection details
- `plm-config` - PLM configuration
- `mdg-config` - SAP MDG configuration
- `*-mock-mode` - Mock mode toggles

---

## Security Best Practices

### DO:
✅ Use environment variables for production credentials
✅ Use HTTPS/TLS for all API connections
✅ Rotate API keys regularly
✅ Use role-based access control (RBAC)
✅ Store credentials securely
✅ Monitor API usage and access logs

### DON'T:
❌ Commit credentials to version control
❌ Share API keys via email or chat
❌ Use production credentials in development
❌ Store passwords in plain text
❌ Expose API keys in client-side code
❌ Use overly permissive API keys

### Password Storage

The application stores connection credentials in browser storage (Spark KV). For production deployments:
- Consider using a secrets management service
- Implement server-side credential storage
- Use OAuth or token-based authentication
- Enable multi-factor authentication (MFA)

---

## API Rate Limiting

Some backend services may have rate limits. The application handles this by:
- Using mock mode as a fallback when limits are reached
- Caching frequent queries
- Batching requests where possible
- Showing rate limit errors in the UI

---

## Support and Resources

### Neo4j Resources
- [Neo4j Aura Documentation](https://neo4j.com/docs/aura/)
- [Neo4j Driver Documentation](https://neo4j.com/docs/javascript-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/)

### PLM Systems
- Check your PLM vendor documentation for API details
- Common PLM systems: Windchill, Teamcenter, Enovia, Arena

### SAP MDG Resources
- [SAP MDG Documentation](https://help.sap.com/mdg)
- [SAP API Business Hub](https://api.sap.com)
- Contact your SAP administrator for API access

---

## Next Steps

After connecting backend services:

1. **Create a Formulation** - Data will sync to Neo4j automatically
2. **Search PLM Materials** - Enrich ingredients with real specifications
3. **View Relationship Graph** - See actual Neo4j graph data
4. **Create a BOM** - Link materials to SAP MDG
5. **Execute Queries** - Run custom Cypher queries on Neo4j

Enjoy seamless integration with your enterprise backend systems! 🚀
