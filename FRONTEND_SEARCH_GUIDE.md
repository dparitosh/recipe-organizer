# Frontend Search Guide - How to Search from UI

**Date**: 2025-11-18  
**Status**: Complete Overview

---

## Overview

The frontend provides **3 primary search methods** that connect to the GraphRAG-powered backend:

1. **AI Assistant (Conversational Search)** - Natural language queries with GraphRAG
2. **Food Search Bar** - FDC ingredient/food lookup
3. **Formulations Search** - Filter/search existing recipes

---

## 1. AI Assistant Search (GraphRAG-Powered)

### Location
**View**: Conversation AI → AI Assistant Tab  
**Component**: `AIAssistantPanel.jsx`  
**API**: `/api/ai/query` (POST)

### How It Works

```javascript
// src/lib/ai/ai-assistant.runtime.js (lines 64-90)

async query(request) {
  const payload = { 
    query: question,              // User's natural language query
    context: context ?? null,     // Formulations, nutrition data
    service_mode: 'auto',         // online/offline/auto
    include_graph: true           // ✅ Enables GraphRAG retrieval
  }

  const resp = await fetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return resp.json()
}
```

### What Happens on Backend

```
User Query → Frontend
    ↓
POST /api/ai/query { query, include_graph: true }
    ↓
Backend (ai.py, line 278):
    ↓
graphrag_retrieval_service.retrieve(query, limit=5)
    ↓
  1. Embed query via Ollama (nomic-embed-text)
  2. Vector search Neo4j index (top 5 chunks)
  3. Load structured entities + relationships
  4. Return HybridRetrievalResult
    ↓
Combine with Ollama LLM response
    ↓
Return enriched answer with graph context
```

### User Experience

**Input**:
```
"Show all recipes using mango concentrate with yield < 90%"
```

**Output**:
```json
{
  "answer": "Found 3 formulations with mango concentrate...",
  "nodeHighlights": [
    { "nodeId": "f123", "name": "Tropical Smoothie", "type": "Formulation" },
    { "nodeId": "i456", "name": "Mango Concentrate", "type": "Ingredient" }
  ],
  "relationshipSummaries": [
    { "type": "CONTAINS", "count": 8, "description": "Ingredient relationships" }
  ],
  "recommendations": [
    { "type": "optimization", "description": "Consider increasing process temperature..." }
  ],
  "sources": [
    { "type": "neo4j", "description": "GraphRAG Knowledge Base" },
    { "type": "llm", "description": "OLLAMA AI" }
  ],
  "confidence": 0.85,
  "executionTime": 1245
}
```

### Configuration

**Enable/Disable GraphRAG**:
```javascript
// Frontend controls
aiAssistant.setIncludeGraph(true)   // Enable GraphRAG retrieval
aiAssistant.setIncludeGraph(false)  // Disable (pure LLM)

// Backend check (main.py, lines 186-206)
if settings.OLLAMA_EMBED_MODEL:
    graphrag_retrieval_service = GraphRAGRetrievalService(...)
    app.state.graphrag_retrieval_service = service
```

### Suggested Queries (Built-in)

```javascript
const SUGGESTED_QUERIES = [
  "Generate nutrition label for [formulation name]",
  "Show all recipes using mango concentrate with yield < 90%",
  "Suggest low-cost substitutes for vanilla extract",
  "What ingredients contribute most to calories in [formulation]?",
  "Recommend healthier alternatives for [formulation name]",
  "Find ingredients that could be substituted to reduce cost",
  "Calculate nutrition for 250mL serving of [formulation]",
  "What formulations have the highest protein content?"
]
```

### GraphRAG Integration Details

**When `include_graph: true`** (backend/app/api/endpoints/ai.py):

```python
# Lines 289-305
if include_graph and retrieval_service:
    try:
        retrieval_result = await asyncio.to_thread(
            retrieval_service.retrieve,
            query,
            limit=5,              # Top 5 semantic chunks
            structured_limit=25,  # Up to 25 graph entities
        )
        retrieval_chunks = retrieval_result.chunks
        structured_entities = retrieval_result.structured_entities
    except GraphRAGRetrievalError as exc:
        logger.warning("GraphRAG retrieval failed: %s", exc)

# Lines 307-313
if include_graph and retrieval_chunks:
    chunk_section = _summarize_chunk_context(retrieval_chunks)
    graph_context_sections.append(chunk_section)
    data_sources.append("GraphRAG Knowledge Base")

# Lines 315-320
if include_graph and structured_entities:
    node_highlights = _build_node_highlights_from_structured(structured_entities)
    relationship_summaries = _build_relationship_summaries_from_structured(...)
```

**Result**: User gets AI answer enriched with:
- ✅ Semantically relevant chunks from vector index
- ✅ Structured graph entities (nodes + properties)
- ✅ Relationship context (edges + metadata)
- ✅ Combined LLM reasoning + knowledge base facts

---

## 2. Food Search Bar (FDC Lookup)

### Location
**View**: Multiple views (Formulations, Calculator)  
**Component**: `SearchBar.jsx`  
**API**: `/api/fdc/foods` (GET)

### How It Works

```javascript
// SearchBar.jsx (lines 17-27)

useEffect(() => {
  const timer = setTimeout(() => {
    if (query) {
      onSearch(query)  // Triggers API call after 300ms debounce
      setIsOpen(true)
    }
  }, 300)

  return () => clearTimeout(timer)
}, [query, onSearch])
```

### User Experience

**Input**: Type "apple" in search bar

**API Call**:
```http
GET /api/fdc/foods?query=apple&limit=10
```

**Response**:
```json
[
  {
    "fdcId": 171688,
    "description": "Apple, raw",
    "dataType": "Survey (FNDDS)",
    "foodCategory": "Fruits and Fruit Juices",
    "nutrients": [...]
  },
  {
    "fdcId": 173951,
    "description": "Apple juice, canned or bottled",
    "dataType": "SR Legacy",
    "foodCategory": "Beverages",
    "nutrients": [...]
  }
]
```

**UI Display**:
- Dropdown with results
- Shows description, data type, category
- Click to select → adds to formulation

### Features

- ✅ Real-time search (300ms debounce)
- ✅ Dropdown results panel
- ✅ Category badges
- ✅ Loading skeletons
- ✅ Click outside to close

---

## 3. Formulations Search/Filter

### Location
**View**: Formulations View  
**Component**: `FormulationsView.jsx`  
**API**: `/api/formulations` (GET)

### How It Works

```javascript
// Client-side filtering
const filteredFormulations = formulations.filter(f => 
  f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  f.description?.toLowerCase().includes(searchQuery.toLowerCase())
)
```

### User Experience

**Input**: Filter box at top of formulations list

**Behavior**:
- Instant client-side filtering
- No API calls (already loaded)
- Filters by name or description
- Updates table in real-time

---

## Search Comparison Matrix

| Feature | AI Assistant | Food Search | Formulations Filter |
|---------|-------------|-------------|---------------------|
| **Type** | Natural language | Keyword | Keyword |
| **Backend** | GraphRAG + LLM | FDC API | Client-side |
| **Data Source** | Neo4j + Ollama | USDA FDC | Local state |
| **Response Time** | 1-5 seconds | 200-500ms | Instant |
| **Semantic Search** | ✅ Yes | ❌ No | ❌ No |
| **Graph Context** | ✅ Yes | ❌ No | ❌ No |
| **Recommendations** | ✅ Yes | ❌ No | ❌ No |
| **Complex Queries** | ✅ Yes | ❌ No | ❌ No |

---

## GraphRAG Search Flow (Detailed)

### Step-by-Step Execution

```
1. USER ACTION
   User types: "Find high protein smoothie recipes"
   Clicks "Ask" button

2. FRONTEND (AIAssistantPanel.jsx)
   handleSubmit() called
   ↓
   aiAssistant.query({
     question: "Find high protein smoothie recipes",
     context: { formulations: [...], activeFormulationId: "f123" },
     include_graph: true
   })

3. FRONTEND RUNTIME (ai-assistant.runtime.js)
   POST /api/ai/query
   Body: {
     "query": "Find high protein smoothie recipes",
     "context": {...},
     "service_mode": "auto",
     "include_graph": true
   }

4. BACKEND ENDPOINT (backend/app/api/endpoints/ai.py)
   async process_online_query(query, include_graph=True)
   ↓
   retrieval_service = app.state.graphrag_retrieval_service
   ↓
   retrieval_result = retrieval_service.retrieve(
     query="Find high protein smoothie recipes",
     limit=5,
     structured_limit=25
   )

5. GRAPHRAG SERVICE (backend/app/services/graphrag_retrieval.py)
   
   A. Embed Query
   query_vector = embedding_client.embed_texts([query])
   # Returns: [0.234, -0.567, 0.891, ...] (1024 dimensions)
   
   B. Vector Search Neo4j
   CALL db.index.vector.queryNodes('chunks', 5, $embedding)
   YIELD node, score
   # Returns top 5 semantically similar chunks
   
   C. Extract Entity IDs
   entity_ids = ["f123", "i456", "i789"]  # From chunk metadata
   
   D. Load Graph Context
   MATCH (n) WHERE n.id IN $entity_ids RETURN n
   MATCH (n)-[r]->(m) WHERE n.id IN $entity_ids RETURN r, m
   # Returns nodes + relationships
   
   E. Return HybridRetrievalResult
   {
     "chunks": [
       { "chunk_id": "c1", "score": 0.89, "content": "...", "metadata": {...} },
       { "chunk_id": "c2", "score": 0.85, "content": "...", "metadata": {...} }
     ],
     "structured_entities": [
       {
         "node": { "id": "f123", "name": "Protein Smoothie", "type": "Formulation" },
         "relationships": [
           { "type": "CONTAINS", "target": { "name": "Greek Yogurt" } }
         ]
       }
     ]
   }

6. BACKEND AI PROCESSING (ai.py)
   
   A. Build Context Sections
   chunk_context = _summarize_chunk_context(retrieval_chunks)
   entity_context = _summarize_structured_entities(structured_entities)
   
   B. Combine with LLM Prompt
   prompt = f"""
   User question: {query}
   
   Knowledge from graph:
   {chunk_context}
   {entity_context}
   
   Please provide a helpful answer.
   """
   
   C. Call Ollama
   answer = await ollama_service.generate_completion(prompt)
   
   D. Build Response
   {
     "answer": "I found 3 high-protein smoothie recipes...",
     "node_highlights": [...],
     "relationship_summaries": [...],
     "recommendations": [...],
     "data_sources": ["GraphRAG Knowledge Base", "OLLAMA AI"],
     "confidence": 0.85,
     "execution_time_ms": 1245
   }

7. FRONTEND DISPLAY (AIAssistantPanel.jsx)
   
   setResponse(result)
   
   UI Shows:
   - Answer text with markdown
   - Node highlights (clickable chips)
   - Relationship badges
   - Recommendation cards
   - Data sources list
   - Confidence indicator
   - Execution time
```

---

## Testing GraphRAG Search

### Test 1: Simple Query

**Frontend**:
```javascript
// In AI Assistant panel
await aiAssistant.query({
  question: "What formulations contain Greek yogurt?",
  context: { formulations: [...] },
  include_graph: true
})
```

**Expected Backend Log**:
```
INFO [graphrag_retrieval] Embedding query: "What formulations contain Greek yogurt?"
INFO [graphrag_retrieval] Vector search returned 5 chunks
INFO [graphrag_retrieval] Loading structured context for 3 entities
INFO [ai] GraphRAG retrieval successful: 5 chunks, 3 entities
```

**Expected Response**:
```json
{
  "answer": "Based on your formulations, Greek yogurt appears in...",
  "nodeHighlights": [
    { "name": "Green Smoothie", "type": "Formulation" },
    { "name": "Greek Yogurt", "type": "Ingredient" }
  ],
  "sources": [
    { "type": "neo4j", "description": "GraphRAG Knowledge Base" }
  ]
}
```

### Test 2: Complex Query

**Frontend**:
```javascript
await aiAssistant.query({
  question: "Find recipes with protein > 20g and suggest cost optimizations",
  include_graph: true
})
```

**Expected**:
- ✅ Vector search finds relevant formulation chunks
- ✅ Graph traversal loads ingredient details
- ✅ LLM analyzes nutrition + cost data
- ✅ Recommendations include substitution suggestions

### Test 3: Verify GraphRAG Active

**Browser Console**:
```javascript
// Check service availability
const health = await fetch('http://localhost:8000/api/health')
const data = await health.json()
console.log('GraphRAG Available:', data.graphrag_available)  // Should be true

// Check configuration
console.log('Include Graph:', aiAssistant.includeGraph)  // Should be true
```

**Expected**:
```javascript
{
  graphrag_available: true,
  neo4j_available: true,
  ollama_model: "llama3:latest"
}
```

---

## Enabling GraphRAG in Frontend

### Configuration Options

**1. Via UI Settings** (if available):
```
Settings → AI Service → Enable Graph Context ✅
```

**2. Via Code**:
```javascript
// src/lib/ai/ai-assistant.runtime.js
aiAssistant.setIncludeGraph(true)   // Enable GraphRAG
aiAssistant.setServiceMode('auto')  // Auto-detect online/offline
```

**3. Via Environment**:
```bash
# Backend .env
OLLAMA_EMBED_MODEL=nomic-embed-text
GRAPHRAG_CHUNK_INDEX_NAME=chunks  # Uncomment when index ready
```

---

## Troubleshooting

### Issue: GraphRAG Not Working

**Symptoms**:
- No "GraphRAG Knowledge Base" in data sources
- Empty node highlights
- Generic AI responses

**Checklist**:
```javascript
// 1. Check frontend setting
console.log(aiAssistant.includeGraph)  // Should be true

// 2. Check backend availability
fetch('http://localhost:8000/api/health')
  .then(r => r.json())
  .then(d => console.log('GraphRAG:', d.graphrag_available))

// 3. Check request payload
// In browser Network tab, verify POST /api/ai/query includes:
{
  "include_graph": true  // ← Must be present
}

// 4. Check backend logs
// Should see: "GraphRAG retrieval service initialized"
// Should NOT see: "GraphRAG retrieval skipped"
```

### Issue: Slow Responses

**Symptoms**:
- Queries take > 5 seconds
- Execution time > 3000ms

**Solutions**:
```javascript
// 1. Reduce retrieval limits
retrieval_service.retrieve(query, limit=3, structured_limit=10)

// 2. Enable caching (backend .env)
GRAPHRAG_CACHE_MAX_ENTRIES=100
GRAPHRAG_CACHE_TTL_SECONDS=300

// 3. Check vector index performance
// Neo4j: SHOW INDEXES WHERE type = 'VECTOR'
```

---

## Summary

### How to Search from Frontend

**Method 1: AI Assistant (Recommended for complex queries)**
1. Go to "Conversation AI" view
2. Type natural language question
3. Click "Ask" button
4. Get AI answer with graph context

**Method 2: Food Search Bar (For adding ingredients)**
1. Type ingredient name in search box
2. Wait 300ms (auto-search)
3. Select from dropdown
4. Add to formulation

**Method 3: Formulations Filter (For browsing recipes)**
1. Type in filter box
2. See instant results
3. Click to view details

### GraphRAG Status

✅ **Active**: Custom implementation using Ollama embeddings  
✅ **Endpoints**: `/api/ai/query` and `/api/ai/nutrition-query`  
✅ **Features**: Vector search + graph context + LLM reasoning  
✅ **Configuration**: `include_graph: true` in frontend, `graphrag_retrieval_service` in backend  

### Next Steps

1. **Create vector index** when ready to index orchestration outputs
2. **Test with sample queries** to verify GraphRAG responses
3. **Monitor performance** via execution times and confidence scores
4. **Iterate on prompts** to improve answer quality

