# Formulation Graph Studio

An enterprise-grade Food & Beverage formulation management platform with integrated Neo4j graph relationships, Ollama AI, USDA nutrition data, and **GraphRAG knowledge retrieval**.

> ✅ **Status:** Production ready. Backend API with Neo4j, Ollama, and FDC integration operational. GraphRAG retrieval service active. All tests passing (33/33).

## 🚀 Features

- ✨ **Multi-Agent Orchestration** - Automated recipe engineering, scaling calculations, cost analysis, graph building, QA validation, and UI generation with transactional persistence
- ✨ **AI Assistant** - Natural language query interface powered by Ollama LLM for intelligent formulation analysis, graph exploration, and actionable recommendations
- ✨ **GraphRAG** - Knowledge graph retrieval with embedding-based search for documentation and formulation insights
- ✨ **USDA Nutrition Data** - Integrated FoodData Central API for comprehensive nutritional information
- **Formulation Management** - Create, edit, and version control F&B formulations
- **BOM Configuration** - Generate Bills of Materials with process steps and cost calculations
- **Graph Visualization** - Interactive relationship graphs powered by Neo4j
- **Backend Integrations** - Connect to real enterprise systems:
  - **Neo4j** - Graph database for formulation relationships and knowledge chunks
  - **Ollama** - Local LLM for AI queries and embedding generation
  - **USDA FDC** - Food nutrition database integration
  - **PLM** - Product Lifecycle Management for material specifications
  - **SAP MDG** - Master Data Governance for material master data
- **Mock Mode** - Development-ready with realistic sample data (no backend required)

## 🤖 AI Assistant Capabilities

The AI Assistant (powered by Ollama) enables you to:

- **Ask Natural Language Questions**: "Show all recipes using mango concentrate with yield < 90%"
- **Get Cost Insights**: "Suggest low-cost substitutes for vanilla extract"
- **Analyze Nutrition**: "Compare protein content in chicken breast vs tofu"
- **Explore Relationships**: "Show relationships between master recipes and plants"
- **Query Graph Data**: Automatic Cypher generation from natural language using Neo4j
- **Knowledge Retrieval**: Semantic search across documentation and formulation data using GraphRAG
- **Receive Recommendations**: Intelligent suggestions for cost optimization, yield improvement, and substitution

**Models Used:**
- **LLM:** llama3:latest (or mistral, configurable)
- **Embeddings:** nomic-embed-text:latest (for vector search)

**📖 Complete AI documentation:** [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md) | [Quick Reference](./AI_ASSISTANT_QUICK_REFERENCE.md)

## 🎯 Quick Start

### Prerequisites
- **Node.js 18+** for frontend
- **Python 3.10+** for backend
- **Neo4j Database** (Aura Cloud recommended)
- **Ollama** AI runtime (local)
- **USDA FDC API Key** (free registration)

**📖 Complete installation guide:** [INSTALLATION.md](./INSTALLATION.md)

### Fast Setup (5 minutes)

```bash
# 1. Install frontend dependencies
npm install

# 2. Setup backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Neo4j, Ollama, and FDC credentials

# 4. Start services
npm run dev          # Frontend (Terminal 1)
cd backend && python main.py  # Backend (Terminal 2)
```

Open http://localhost:5173 and start creating formulations!

### Using Mock Data (No Backend)

The frontend works standalone with realistic mock data:

1. Just run `npm run dev`
2. Click **"New Formulation"** to create formulations
3. View **Relationship Graph** tab for connections
4. No backend setup required for basic functionality

**📖 Complete setup guide:** [INSTALLATION.md](./INSTALLATION.md)

## 📚 Documentation

### Getting Started
- **[INSTALLATION.md](./INSTALLATION.md)** - Complete installation and configuration guide
- **[START_HERE.md](./START_HERE.md)** - Quick orientation for new users
- **[TASK_TRACKER.md](./TASK_TRACKER.md)** - Current development status and pending tasks

### User Guides
- **[AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)** - AI Assistant complete documentation
- **[AI_ASSISTANT_QUICK_REFERENCE.md](./AI_ASSISTANT_QUICK_REFERENCE.md)** - AI Assistant quick reference
- **[docs/ORCHESTRATION_QUICK_START.md](./docs/ORCHESTRATION_QUICK_START.md)** - Multi-agent orchestration API usage
- **[FDC_INTEGRATION_GUIDE.md](./FDC_INTEGRATION_GUIDE.md)** - USDA nutrition data integration
- **[CONNECTING_BACKEND_SERVICES.md](./CONNECTING_BACKEND_SERVICES.md)** - Backend configuration guide

### Technical Documentation
- **[BACKEND_IMPLEMENTATION_SUMMARY.md](./BACKEND_IMPLEMENTATION_SUMMARY.md)** - Backend architecture overview
- **[CAP-01_ORCHESTRATION_PIPELINE.md](./CAP-01_ORCHESTRATION_PIPELINE.md)** - Multi-agent orchestration design and contracts
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - REST API reference
- **[NEO4J_ARCHITECTURE.md](./NEO4J_ARCHITECTURE.md)** - Graph database schema
- **[FDC_SCHEMA.md](./FDC_SCHEMA.md)** - FDC nutrition data schema
- **[CAP-03_GRAPH_RAG_PLAN.md](./CAP-03_GRAPH_RAG_PLAN.md)** - Knowledge graph retrieval architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[PRD.md](./PRD.md)** - Product requirements and design decisions

### Maintenance & Deployment
- **[CLEANUP_STATUS.md](./CLEANUP_STATUS.md)** - ⚠️ **Current cleanup status and pending actions**
- **[CLEANUP_ACTIONS.md](./CLEANUP_ACTIONS.md)** - Code cleanup and optimization guide
- **[CLEANUP_COMPLETE.md](./CLEANUP_COMPLETE.md)** - Cleanup completion report and instructions
- **[SECURITY.md](./SECURITY.md)** - Security best practices

## 🏗️ Architecture

### Frontend
- **React 19** with JavaScript (TypeScript cleanup completed)
- **Tailwind CSS** for styling
- **shadcn/ui v4** components
- **Cytoscape.js** for graph visualization
- **Spark KV** for client-side data persistence

### Backend
- **FastAPI** Python web framework
- **Neo4j** graph database with official Python driver
- **Ollama** local AI service (LLM + embeddings)
- **USDA FDC API** for nutrition data
- **Pydantic** for data validation

### Services Architecture
- **Neo4j Database** - Formulation relationships, FDC nutrition data, knowledge chunks
- **Ollama Runtime** - Natural language processing, Cypher generation, embeddings
- **USDA FDC** - Food nutritional information database
- **PLM REST API** - Material specifications (optional)
- **SAP MDG API** - Master data governance (optional)

### Mock Mode
All services support mock mode for development without backend dependencies.

## 🔧 Configuration

### Quick Configuration

All backend services can be configured via:
1. **UI Settings Panel** (⚙️ icon) - User-friendly configuration
2. **Environment Files** - `.env` for backend, `.env` for frontend
3. **JSON Override** - `backend/env.local.json` (takes precedence over `.env`)

### Backend Environment Variables

**Required:**
```bash
# Neo4j
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_PASSWORD=your-password

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest

# USDA FDC
FDC_API_KEY=your-fdc-api-key
```

**Optional:**
```bash
# PLM
VITE_PLM_API_URL=https://plm.company.com/api
VITE_PLM_API_KEY=your-plm-api-key

# SAP MDG
VITE_MDG_API_URL=https://sap.company.com/mdg/api
VITE_MDG_API_KEY=your-mdg-api-key
```

**📖 Complete configuration guide:** [INSTALLATION.md](./INSTALLATION.md)

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

### Standard Formulation Flow
1. **Create Formulation** → Saved to local state (Spark KV)
2. **Sync to Neo4j** → Graph relationships created automatically
3. **Enrich from FDC** → Nutritional data added from USDA database
4. **Generate Knowledge Chunks** → GraphRAG ingestion for AI retrieval
5. **AI Query** → Ollama generates Cypher, retrieves context, provides insights
6. **Visualize** → Interactive graph from Neo4j with nutrients and relationships

### Multi-Agent Orchestration Pipeline

**Purpose:** Automated end-to-end recipe generation, cost calculation, and quality validation with full audit trail.

**Agents:**
1. **RecipeEngineer** - Generates optimized ingredient lists based on user requirements
2. **ScalingCalculator** - Calculates scaled quantities, costs, and yields for target batch sizes
3. **GraphBuilder** - Creates Neo4j Cypher commands for relationship mapping
4. **QAValidator** - Validates recipe completeness, cost accuracy, and regulatory compliance
5. **UIDesigner** - Generates UI configuration for optimal data presentation

**Data Flow:**
1. **User Request** → Natural language or structured input (e.g., "Create a low-cost protein bar")
2. **Agent Execution** → Sequential agent invocations with hand-off contracts
3. **Artifact Collection** → Recipe, calculations, graph commands, validation reports, UI config
4. **Persistence** → Transactional write to Neo4j creating:
   - `OrchestrationRun` node (audit metadata)
   - `RecipeVersion` node (ingredient snapshot)
   - `CalculationResult` node (costs, yields)
   - `ValidationReport` node (QA outcomes)
   - `AgentInvocation` nodes (per-agent execution metadata)
5. **Relationships** → Links to existing `Ingredient`, `Nutrient`, `FoodCategory` nodes
6. **Retrieval** → Queryable history for analytics, replay, and GraphRAG context

**Performance Guardrails:**
- End-to-end: < 4 seconds
- Peak memory: < 600 MB
- Neo4j persistence: < 450 ms

**📖 Complete orchestration design:** [CAP-01_ORCHESTRATION_PIPELINE.md](./CAP-01_ORCHESTRATION_PIPELINE.md)

### GraphRAG Pipeline

1. **Ingestion** - Parse formulations, FDC data, and documentation
2. **Chunking** - Split into knowledge chunks (structured and unstructured)
3. **Embedding** - Generate vectors using Ollama (nomic-embed-text)
4. **Storage** - Store chunks and embeddings in Neo4j
5. **Retrieval** - Hybrid search (vector similarity + Cypher) for AI queries

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
- React, JavaScript, Tailwind CSS
- shadcn/ui, Radix UI
- Neo4j, Cytoscape.js
- FastAPI, Python, Pydantic
- Ollama (Local AI runtime)
- USDA FoodData Central
- Spark Runtime & KV Store

Special thanks to the open-source community for these excellent tools.
