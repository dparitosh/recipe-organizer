# Formulation Graph Studio

An enterprise-grade Food & Beverage formulation management platform with **Python FastAPI backend**, React JSX frontend, Neo4j graph relationships, and **AI-powered natural language query assistant with offline mode support**.

## 🏗️ Architecture

**Frontend:** React 19 + JSX + Tailwind CSS + shadcn/ui + Cytoscape.js  
**Backend:** Python FastAPI + OpenAI GPT-4 + Neo4j Python Driver  
**Database:** Neo4j Graph Database  
**AI:** OpenAI GPT-4 with automatic offline fallback

## 🚀 Features

- ✨ **AI Assistant with Offline Mode** - Natural language queries powered by GPT-4 with automatic fallback to local search when backend unavailable
- **Python Backend** - FastAPI REST API handling all AI logic, Cypher generation, and business logic
- **Service Modes** - Online (full AI), Offline (local search), Auto (seamless fallback)
- **Formulation Management** - Create, edit, and version control F&B formulations
- **BOM Configuration** - Generate Bills of Materials with process steps and cost calculations
- **Graph Visualization** - Interactive relationship graphs powered by Neo4j
- **Backend Integrations**:
  - **Neo4j** - Graph database for formulation relationships
  - **OpenAI GPT-4** - Natural language understanding and Cypher generation
  - **PLM** - Product Lifecycle Management for material specifications
  - **SAP MDG** - Master Data Governance for material master data

## 🤖 AI Assistant Capabilities

The AI Assistant provides **two modes** for maximum reliability:

### Online Mode (Full AI)
- **Natural Language Understanding**: "Show all recipes using mango concentrate with yield < 90%"
- **Cypher Generation**: Automatically converts questions to Neo4j Cypher queries
- **Cost Insights**: "Suggest low-cost substitutes for vanilla extract"
- **Trend Analysis**: "Summarize yield loss trends for Q4"
- **Relationship Exploration**: "Show relationships between master recipes and plants"
- **Intelligent Recommendations**: Cost optimization, yield improvement, substitution suggestions
- **Confidence Scoring**: 80-95% confidence with data source attribution

### Offline Mode (Local Fallback)
- **Keyword-Based Search**: Basic filtering of local formulations
- **No Backend Required**: Works when AI service unavailable
- **Generic Recommendations**: Simplified suggestions for common tasks
- **Automatic Fallback**: Seamlessly activates when backend down

### Auto Mode (Recommended)
- **Best of Both**: Attempts online first, falls back to offline automatically
- **Transparent**: Mode indicator badge shows current status
- **Configurable**: Retry attempts and timeout settings

**📖 Documentation:**
- [AI Assistant Guide](./AI_ASSISTANT_GUIDE.md)
- [Backend Integration](./BACKEND_INTEGRATION_GUIDE.md)
- [Backend Setup](./backend/README.md)

## 🎯 Quick Start

### Option 1: Offline Mode (No Setup)

The application works immediately with offline AI capabilities:

1. Open the app
2. Navigate to **AI Assistant** tab
3. Ask questions - uses local keyword search
4. No configuration needed!

### Option 2: Full AI with Backend (Recommended)

For complete AI capabilities with GPT-4:

#### 1. Setup Python Backend

```bash
# Run automated setup
chmod +x setup-backend.sh
./setup-backend.sh

# Or manual setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OpenAI API key
```

#### 2. Configure Environment

Edit `backend/.env`:

```env
NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=tcs12345
NEO4J_DATABASE=neo4j
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your OpenAI API key: https://platform.openai.com/api-keys

#### 3. Start Backend Server

```bash
chmod +x start-backend.sh
./start-backend.sh

# Or manually
cd backend
source venv/bin/activate
python main.py
```

Backend runs on `http://localhost:8000`

#### 4. Configure Frontend

1. Open the React app
2. Navigate to **Settings** → **AI Service** tab
3. Set Backend URL: `http://localhost:8000`
4. Click **Test** to verify connection
5. Click **Save**
6. Set Service Mode to **Auto** (recommended)

#### 5. Test AI Assistant

1. Navigate to **AI Assistant** tab
2. Ask: "Show all recipes using mango concentrate"
3. View answer, Cypher query, node highlights, and recommendations
4. Mode badge shows "Online" when backend connected

### Using Mock Data (For Development)

The application includes realistic mock data:

1. Click **"New Formulation"** to create formulations
2. Add ingredients, set quantities, and define specifications
3. View the **Relationship Graph** tab to see connections
4. Create a **BOM** to configure manufacturing details
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
- **[CLEANUP_STATUS.md](./CLEANUP_STATUS.md)** - ⚠️ **Current cleanup status and pending actions**
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
