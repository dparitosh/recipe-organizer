# Formulation Graph Studio

An enterprise-grade Food & Beverage formulation management platform with integrated PLM, SAP MDG, Neo4j graph relationships, and **AI-powered natural language query assistant**.

## 🚀 Features

- ✨ **NEW: AI Assistant** - Natural language query interface powered by GPT-4 for intelligent formulation analysis, graph exploration, and actionable recommendations
- **Formulation Management** - Create, edit, and version control F&B formulations
- **BOM Configuration** - Generate Bills of Materials with process steps and cost calculations
- **Graph Visualization** - Interactive relationship graphs powered by Neo4j
- **Backend Integrations** - Connect to real enterprise systems:
  - **Neo4j** - Graph database for formulation relationships
  - **PLM** - Product Lifecycle Management for material specifications
  - **SAP MDG** - Master Data Governance for material master data
- **GenAI Integration** - Natural language queries and intelligent insights
- **Mock Mode** - Development-ready with realistic sample data (no backend required)

## 🤖 AI Assistant Capabilities

The AI Assistant enables you to:

- **Ask Natural Language Questions**: "Show all recipes using mango concentrate with yield < 90%"
- **Get Cost Insights**: "Suggest low-cost substitutes for vanilla extract"
- **Analyze Trends**: "Summarize yield loss trends for Q4"
- **Explore Relationships**: "Show relationships between master recipes and plants"
- **Receive Recommendations**: Intelligent suggestions for cost optimization, yield improvement, and substitution
- **Query Graph Data**: Automatic Cypher generation from natural language using Neo4j embeddings

**📖 Complete AI documentation:** [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md) | [Quick Reference](./AI_ASSISTANT_QUICK_REFERENCE.md)

## 🎯 Quick Start

### Using Mock Data (Default)

The application works out of the box with realistic mock data:

1. Click **"New Formulation"** to create your first formulation
2. Add ingredients, set quantities, and define specifications
3. View the **Relationship Graph** tab to see ingredient connections
4. Create a **BOM** to configure manufacturing details

No backend setup required!

### Connecting to Real Backend Services

To connect to your enterprise systems:

1. Click the **Settings** icon (⚙️) in the top-right
2. Configure your backend services (Neo4j, PLM, SAP MDG)
3. Test connections and save configurations
4. Toggle off Mock Mode for each service

**📖 Complete guide:** [CONNECTING_BACKEND_SERVICES.md](./CONNECTING_BACKEND_SERVICES.md)

## 📚 Documentation

### User Guides
- **[AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)** - AI Assistant complete documentation
- **[AI_ASSISTANT_QUICK_REFERENCE.md](./AI_ASSISTANT_QUICK_REFERENCE.md)** - AI Assistant quick reference
- **[CONNECTING_BACKEND_SERVICES.md](./CONNECTING_BACKEND_SERVICES.md)** - User guide for backend configuration

### Technical Documentation
- **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** - Technical architecture and API documentation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - REST API reference
- **[NEO4J_ARCHITECTURE.md](./NEO4J_ARCHITECTURE.md)** - Graph database schema
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[PRD.md](./PRD.md)** - Product requirements and design decisions

### Maintenance & Deployment
- **[CLEANUP_ACTIONS.md](./CLEANUP_ACTIONS.md)** - Code cleanup and optimization guide
- **[CLEANUP_COMPLETE.md](./CLEANUP_COMPLETE.md)** - Cleanup completion report and instructions
- **[SECURITY.md](./SECURITY.md)** - Security best practices

## 🏗️ Architecture

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui v4** components
- **Cytoscape.js** for graph visualization
- **Spark KV** for data persistence

### Backend Integrations
- **Neo4j Graph Database** - Relationship management
- **PLM REST API** - Material specifications
- **SAP MDG API** - Master data governance

### Mock Mode
All services support mock mode for development without backend dependencies.

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file for default backend configurations:

```bash
# Neo4j (configure in UI Settings)
# No environment variables needed

# PLM
VITE_PLM_API_URL=https://plm.company.com/api
VITE_PLM_API_KEY=your-plm-api-key

# SAP MDG
VITE_MDG_API_URL=https://sap.company.com/mdg/api
VITE_MDG_API_KEY=your-mdg-api-key
VITE_MDG_CLIENT=100
VITE_MDG_PLANT=1000
```

## 🛡️ Security

- All credentials stored in browser using Spark KV (encrypted)
- HTTPS/TLS required for API connections
- Token-based authentication
- No credentials committed to version control

See [SECURITY.md](./SECURITY.md) for security best practices.

## 🧪 Development

### Mock Mode Development

Perfect for rapid development:
- No backend setup required
- Realistic sample data
- Fast iteration cycles
- Test UI/UX without infrastructure

### Production Deployment

#### Pre-Deployment Cleanup

Before deploying, run the cleanup script to remove duplicate files:

```bash
# Make script executable
chmod +x cleanup.sh

# Run cleanup
./cleanup.sh

# Verify build
npm run build

# Test application
npm run dev
```

See [CLEANUP_COMPLETE.md](./CLEANUP_COMPLETE.md) for detailed instructions.

#### Configuration Steps

1. Configure backend services in Settings
2. Test all connections
3. Disable mock mode
4. Verify data synchronization
5. Monitor integration status

## 🎨 Key Components

- **FormulationEditor** - Create and edit formulations
- **BOMConfigurator** - Configure Bills of Materials
- **FormulationGraph** - Visualize relationships
- **IntegrationPanel** - Search and sync with backend services
- **BackendConfigPanel** - Configure service connections

## 📊 Data Flow

1. **Create Formulation** → Saved to local state (Spark KV)
2. **Sync to Neo4j** → Graph relationships created
3. **Enrich from PLM** → Specifications added
4. **Create BOM** → Components linked to SAP MDG
5. **Visualize** → Interactive graph from Neo4j

## 🤝 Integration Patterns

### Automatic Sync
- Formulations auto-sync to Neo4j on save
- Real-time status indicators
- Background synchronization

### Manual Operations
- Material search in PLM/MDG
- Custom Cypher queries
- Batch operations

### Fallback Behavior
- Mock mode activates on connection failure
- Graceful degradation
- User notifications for sync issues

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.

## 🙏 Acknowledgments

Built with:
- React, TypeScript, Tailwind CSS
- shadcn/ui, Radix UI
- Neo4j, Cytoscape.js
- Spark Runtime & KV Store
