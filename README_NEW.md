# Formulation Graph Studio - Modern Architecture

A next-generation Food & Beverage formulation management platform with clean architectural separation: React frontend for immersive UX, Python FastAPI backend for robust business logic, and Neo4j for graph relationships.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TS)                    │
│  • Modern UI with Cytoscape.js graph visualization          │
│  • Tailwind CSS v4 + shadcn/ui components                   │
│  • Real-time graph interactions with physics                 │
│  • Responsive design with mobile-first approach             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                   REST API (JSON)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                BACKEND (Python FastAPI)                      │
│  • Async API endpoints with Pydantic validation             │
│  • Business logic & calculation engines                      │
│  • Neo4j integration via official driver                    │
│  • USDA FDC data ingestion service                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                 Neo4j Driver
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    NEO4J GRAPH DATABASE                      │
│  • Formulations, Ingredients, Recipes, Nutrients            │
│  • Relationship tracking & lineage paths                    │
│  • Cypher queries for complex graph operations              │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### Frontend (React)
- **🎨 Modern UX**: Clean, immersive interface following latest design trends
- **📊 Advanced Graph Viz**: Cytoscape.js with physics-based layouts, zoom, pan, filters
- **🎯 Interactive**: Real-time search, node selection, lineage highlighting
- **📱 Responsive**: Mobile-first design with collapsible panels
- **🎭 Smooth Animations**: Framer Motion for delightful micro-interactions
- **🔄 State Persistence**: useKV hook for client-side data persistence

### Backend (Python FastAPI)
- **⚡ Fast**: Async/await for high performance
- **✅ Validated**: Pydantic models with automatic validation
- **📚 Auto Docs**: OpenAPI/Swagger UI out of the box
- **🔌 Extensible**: Clean service layer architecture
- **🌐 CORS Ready**: Configured for cross-origin requests
- **🐍 Pythonic**: Idiomatic Python 3.10+ code

### Database (Neo4j)
- **🕸️ Graph Native**: Relationship-first data model
- **🔍 Query Power**: Cypher for complex graph traversals
- **📈 Scalable**: Enterprise-ready graph database
- **🔒 Secure**: Encrypted connections (neo4j+s)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- Neo4j database (local or cloud instance)

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Backend Setup

```bash
# Navigate to backend directory (create if needed)
mkdir backend && cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn neo4j python-dotenv pydantic httpx

# Create .env file with Neo4j credentials
cat > .env << EOF
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
FDC_API_KEY=your-fdc-key
CORS_ORIGINS=["http://localhost:5173"]
EOF

# Create main.py (see BACKEND_SETUP.md for full code)
# Start server
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` with docs at `/docs`

## 📁 Project Structure

```
formulation-graph-studio/
├── src/                          # Frontend source
│   ├── components/
│   │   ├── layout/              # Header, Sidebar, MainContent
│   │   ├── views/               # Main view components
│   │   │   ├── GraphView.tsx    # Cytoscape graph visualization
│   │   │   ├── FormulationsView.tsx
│   │   │   ├── IngestView.tsx
│   │   │   └── SettingsView.tsx
│   │   └── ui/                  # shadcn components
│   ├── lib/
│   │   ├── api/
│   │   │   └── service.ts       # Centralized API client
│   │   └── utils.ts
│   ├── App.tsx                  # Main app component
│   └── index.css                # Global styles
├── backend/                      # Python backend (to create)
│   ├── main.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── models/              # Pydantic models
│       ├── routes/              # API endpoints
│       ├── services/            # Business logic
│       └── config.py
├── BACKEND_SETUP.md             # Complete backend guide
├── PRD.md                       # Product requirements
└── README.md                    # This file
```

## 🎯 Frontend Views

### 1. Dashboard / Graph View
- Load and visualize complete knowledge graph
- Interactive node selection with details panel
- Multiple layout algorithms (hierarchical, force, circular, grid)
- Real-time search with node highlighting
- Filter by node type
- Export as PNG or JSON

### 2. Formulations View
- List all formulations
- Create new formulations
- View formulation details (ingredients, yield, status)
- Delete formulations
- Badge-based status indicators

### 3. Data Ingestion View
- Search USDA FoodData Central
- Ingest nutritional data into Neo4j
- Load sample datasets
- Clear database with confirmation

### 4. Settings View
- Configure backend API URL
- View architecture stack
- Backend connection status
- Setup instructions

## 🔌 API Integration

The frontend communicates with the backend via the centralized `apiService`:

```typescript
import { apiService } from '@/lib/api/service'

// Set backend URL
apiService.setBaseUrl('http://localhost:8000')

// Load graph data
const graphData = await apiService.getGraph()

// Create formulation
const formulation = await apiService.createFormulation({
  name: 'New Recipe',
  version: '1.0',
  // ...
})

// Search FDC
const foods = await apiService.searchFDC('orange juice')
```

## 🎨 Design System

### Colors (oklch)
- **Primary**: `oklch(0.55 0.20 255)` - Vibrant blue
- **Secondary**: `oklch(0.42 0.16 255)` - Deep blue
- **Accent**: `oklch(0.60 0.18 35)` - Warm orange
- **Background**: `oklch(0.99 0.002 240)` - Near white
- **Foreground**: `oklch(0.15 0.015 240)` - Near black

### Typography
- **Font**: Inter (Google Fonts)
- **Scale**: 12px (caption) → 14px (body) → 18px (h2) → 24-32px (h1)
- **Features**: Tabular numbers for data display

### Components
- shadcn/ui v4 components
- Phosphor Icons for iconography
- Tailwind CSS v4 utility-first styling
- Consistent 0.5rem radius

## 📊 Graph Visualization

Powered by Cytoscape.js with custom styling:

### Node Types & Colors
- **Formulation**: Blue (`#3b82f6`)
- **Ingredient/Food**: Purple (`#8b5cf6`)
- **Nutrient**: Orange (`#f59e0b`)
- **Process**: Indigo (`#6366f1`)
- **Recipe**: Blue (`#3b82f6`)
- **MasterRecipe**: Sky (`#0ea5e9`)
- **ManufacturingRecipe**: Violet (`#7c3aed`)
- **Plant**: Teal (`#14b8a6`)
- **SalesOrder**: Orange (`#f59e0b`)

### Interactions
- **Click node**: View properties in side panel
- **Search**: Real-time filtering with dimming
- **Layouts**: Smooth transitions between layouts
- **Zoom**: Mouse wheel or buttons (0.2x - 4x)
- **Pan**: Drag canvas
- **Export**: PNG (2x resolution) or JSON

## 🔐 Security Considerations

### Frontend
- Backend URL stored in useKV (browser storage)
- No hardcoded credentials
- CORS-compliant requests

### Backend
- Environment variables for secrets
- Pydantic validation on all inputs
- CORS middleware configured
- Connection pooling for Neo4j

## 🧪 Testing

### Frontend
```bash
npm run build    # Test production build
npm run preview  # Preview production build
```

### Backend
```bash
# Test health endpoint
curl http://localhost:8000/health

# View API docs
open http://localhost:8000/docs
```

## 📦 Deployment

### Frontend (Static Hosting)
```bash
npm run build
# Deploy dist/ folder to Vercel, Netlify, or similar
```

### Backend (Docker)
```bash
cd backend
docker build -t formulation-backend .
docker run -p 8000:8000 --env-file .env formulation-backend
```

Or use platforms like Railway, Render, or AWS ECS.

### Database
Use Neo4j Aura (cloud) or self-hosted Neo4j instance.

## 🛣️ Roadmap

- [ ] Authentication & authorization (JWT)
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced calculations (yield, cost, nutrition)
- [ ] Recipe versioning & approval workflows
- [ ] BOM generation & export
- [ ] AI-powered formulation suggestions
- [ ] Mobile app (React Native)
- [ ] GraphQL alternative API

## 🤝 Contributing

1. Follow the architecture: React (UI) → FastAPI (API) → Neo4j (Data)
2. Use TypeScript for type safety
3. Write Pydantic models for all data structures
4. Document new API endpoints in BACKEND_SETUP.md
5. Follow the design system in PRD.md

## 📄 License

See LICENSE file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful components
- **Cytoscape.js** for graph visualization
- **FastAPI** for modern Python APIs
- **Neo4j** for graph database excellence
- **Phosphor Icons** for icon set
- **Tailwind CSS** for utility-first styling

---

**Built with ❤️ for the F&B industry**
