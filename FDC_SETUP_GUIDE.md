# FDC Setup & Validation Guide

**Date**: November 18, 2025  
**Status**: Ready to complete CAP-03 (final 11%)  
**Time Required**: 30 minutes

---

## Quick Start

### Step 1: Get USDA FDC API Key (5 minutes)

1. Visit: **https://fdc.nal.usda.gov/api-key-signup.html**
2. Fill in the form:
   - Email address
   - Organization (can be "Personal" or "Individual")
   - Intended use (e.g., "Recipe formulation research")
3. Submit and check your email
4. Copy the API key (format: `xxxxxxxxxx` - alphanumeric string)

### Step 2: Configure API Key (2 minutes)

Add to `backend/.env`:

```bash
# USDA FDC API Configuration
FDC_API_KEY=your_api_key_here
```

### Step 3: Start Backend (if not running)

```powershell
cd c:\Users\abcd\RECIPE\recipe-organizer\backend
python -m uvicorn app.main:app --reload --port 8000
```

Wait for: `Application startup complete.`

### Step 4: Run FDC Seed Script (5 minutes)

```powershell
cd c:\Users\abcd\RECIPE\recipe-organizer
npm run seed:fdc
```

**Expected Output:**
```
→ Seeding USDA FDC data via http://localhost:8000
  • Ingesting 10 foods for "apple"
    ✓ Success: 10 ingested, 0 failed (nodes: 10)
  • Ingesting 10 foods for "broccoli"
    ✓ Success: 10 ingested, 0 failed (nodes: 10)
  • Ingesting 10 foods for "chicken breast"
    ✓ Success: 10 ingested, 0 failed (nodes: 10)
  • Ingesting 10 foods for "milk"
    ✓ Success: 10 ingested, 0 failed (nodes: 10)
  • Ingesting 6 foods for "olive oil"
    ✓ Success: 6 ingested, 0 failed (nodes: 6)
✔ FDC seeding routine finished
```

### Step 5: Verify in Neo4j (5 minutes)

1. Open Neo4j Browser: **https://workspace-preview.neo4j.io/workspace/query**
2. Run verification queries:

```cypher
// Count total FDC foods
MATCH (f:FDCFood) 
RETURN count(f) as total_foods
// Expected: 46 foods

// Sample 10 foods
MATCH (f:FDCFood) 
RETURN f.foodName, f.category, f.fdcId 
LIMIT 10

// Check nutrient relationships
MATCH (f:FDCFood)-[r:HAS_NUTRIENT]->(n:Nutrient)
RETURN f.foodName, n.nutrientName, r.amount, r.unit
LIMIT 20
```

### Step 6: Test Backend API (3 minutes)

```powershell
# Test GET /api/fdc/foods
curl http://localhost:8000/api/fdc/foods?limit=10

# Test with category filter
curl "http://localhost:8000/api/fdc/foods?category=Dairy&limit=5"
```

**Expected Response:**
```json
{
  "total": 46,
  "foods": [
    {
      "fdcId": "123456",
      "foodName": "Apple, raw",
      "category": "Fruits",
      "nutrients": [...],
      "source": "USDA FDC"
    }
  ]
}
```

### Step 7: Test Frontend Panel (3 minutes)

1. Open application: **http://localhost:5173**
2. Navigate to FDC Data Ingestion panel
3. Verify:
   - Foods display in catalog
   - Pagination works
   - Category filtering works
   - Nutrient data displays

---

## Troubleshooting

### Error: "Provide an FDC API key"
**Solution**: Add `FDC_API_KEY=your_key` to `backend/.env`

### Error: "Connection refused"
**Solution**: Start backend with `python -m uvicorn app.main:app --reload --port 8000`

### Error: "Neo4j unavailable"
**Solution**: Check Neo4j credentials in `backend/.env`, test connection

### Error: "Quick ingest failed (401)"
**Solution**: Invalid API key, check if key is correct in `.env`

### Error: "Quick ingest failed (429)"
**Solution**: Rate limit exceeded, wait 1 minute and retry

---

## What Gets Created

### Neo4j Nodes
- **46 FDCFood nodes** with properties:
  - `fdcId` (unique identifier)
  - `foodName` (e.g., "Apple, raw")
  - `category` (e.g., "Fruits")
  - `description`
  - `source` (always "USDA FDC")

### Neo4j Relationships
- **HAS_NUTRIENT** relationships linking FDCFood → Nutrient
- Each food has 10-30 nutrients (protein, fat, carbs, vitamins, minerals)

### Example Data
```cypher
(f:FDCFood {
  fdcId: "171688",
  foodName: "Apple, raw, with skin",
  category: "Fruits",
  description: "Malus domestica",
  source: "USDA FDC"
})-[:HAS_NUTRIENT {amount: 0.26, unit: "g"}]->(n:Nutrient {
  nutrientName: "Protein"
})
```

---

## Validation Checklist

- [ ] API key obtained from USDA
- [ ] API key added to `backend/.env`
- [ ] Backend running on port 8000
- [ ] `npm run seed:fdc` completed without errors
- [ ] Neo4j shows 46 FDCFood nodes
- [ ] GET /api/fdc/foods returns data
- [ ] Frontend panel displays foods
- [ ] Pagination and filtering work

---

## Next Steps After Validation

1. **Update TASK_TRACKER.md**
   - Mark Task 3.7.1 as DONE
   - Update CAP-03 status to DN (Done)
   - Add completion notes

2. **Update CAP_COMPLETION_STATUS.md**
   - Change CAP-03 from 89% to 100%
   - Update summary to "4.5 of 5 CAPs complete"

3. **Move to CAP-04**
   - Start scoping (2 hours)
   - Create task breakdown (8 tasks)

---

**Estimated Time**: 30 minutes total
**Success Rate**: 99% (API key registration takes 5 min)
**Risk**: Low (all infrastructure already in place)
