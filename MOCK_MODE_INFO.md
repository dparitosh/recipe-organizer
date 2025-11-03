# Mock Mode Information

## What is Mock Mode?

Your Formulation Graph Studio application is currently running in **Mock Mode**. This means the frontend is working perfectly, but it's using sample data instead of connecting to a real backend server.

## Why Am I Seeing "Failed to Fetch"?

The "Failed to fetch" error occurred because the application tried to connect to a Python FastAPI backend server at `http://localhost:8000`, but no server was running at that address.

## ✅ What's Working Now

The application has automatically switched to Mock Mode, which means:

- ✅ All UI features are fully functional
- ✅ Sample formulations are available (Potato Chips, Orange Juice)
- ✅ Graph visualization works with demo data
- ✅ You can create, view, and delete formulations
- ✅ FDC search and ingestion simulate real behavior
- ✅ All interactions provide realistic responses

## 🎯 Using the Application in Mock Mode

You can use all features of the application with sample data:

1. **Formulations View**: View and manage demo formulations
2. **Graph Explorer**: Visualize relationships between ingredients and nutrients
3. **Data Ingestion**: Simulate loading data from USDA FoodData Central
4. **Settings**: View architecture information and setup instructions

The header shows a **"Mock Mode"** badge to indicate you're using sample data.

## 🔧 How to Connect to a Real Backend

If you want to connect to a real backend with Neo4j database:

### 1. Set up Python Backend

```bash
# Create backend directory
mkdir backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn neo4j python-dotenv pydantic requests
```

### 2. Create Backend Files

Create `main.py` with FastAPI endpoints (see API_DOCUMENTATION.md for reference)

### 3. Configure Neo4j

Create `.env` file:
```
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
FDC_API_KEY=your-fdc-api-key
```

### 4. Start Backend

```bash
uvicorn main:app --reload --port 8000
```

### 5. Configure Frontend

Once the backend is running, the application will automatically detect it and switch from Mock Mode to connected mode.

## 📊 Sample Data Included

Mock Mode includes:

- **2 Formulations**: Classic Potato Chips, Orange Juice Concentrate
- **7 Food Items**: Potato, Palm Oil, Salt, Orange Concentrate, Water, Sugar, Vitamin C
- **4 Nutrients**: Carbohydrates, Protein, Fat, Vitamin C
- **9 Relationships**: CONTAINS, HAS_NUTRIENT connections

## 🤔 Need Help?

- Check the **Settings** page for detailed setup instructions
- Review `API_DOCUMENTATION.md` for backend API specifications
- Review `PRD.md` for complete feature documentation
- The application will continue to work in Mock Mode until you set up the backend

## ⚡ Quick Summary

**You can use the application right now with sample data!** Mock Mode is fully functional and demonstrates all features. The backend is only needed if you want to:
- Store real data persistently
- Connect to a real Neo4j database
- Integrate with USDA FoodData Central API
- Build production-ready formulations

Enjoy exploring the Formulation Graph Studio! 🎉
