# GraphRAG Implementation Analysis & Migration Plan

**Date**: 2025-11-18  
**Status**: Review Complete - Migration Recommended

---

## Executive Summary

The project currently uses a **custom GraphRAG implementation** (`GraphRAGRetrievalService`) while having the **official `neo4j-graphrag 1.0.0` package installed**. This document analyzes both implementations and provides a migration roadmap.

### Key Findings

✅ **Current Custom Implementation Works**: Hybrid vector + graph retrieval functional  
⚠️ **Official Package Has Dependency Issues**: tf-keras conflict preventing imports  
🎯 **Migration Recommended**: Official package offers superior features and maintainability  

---

## Current Implementation Analysis

### Custom GraphRAGRetrievalService

**File**: `backend/app/services/graphrag_retrieval.py` (363 lines)

#### Capabilities

| Feature | Status | Implementation |
|---------|--------|----------------|
| Vector Search | ✅ Active | Uses Neo4j vector index (`db.index.vector.queryNodes`) |
| Embedding Integration | ✅ Active | Custom `EmbeddingClient` (Ollama nomic-embed-text, 1024-dim) |
| Structured Graph Context | ✅ Active | Cypher queries to load entity relationships |
| Hybrid Retrieval | ✅ Active | Combines vector chunks + graph traversal |
| Caching | ✅ Active | In-memory LRU cache with TTL |
| Metadata Extraction | ✅ Active | Parses chunk metadata for entity IDs |

#### Architecture

```python
retrieve(query) workflow:
1. Embed query text → vector (1024-dim)
2. Vector search → top K chunks from Neo4j vector index
3. Extract entity IDs from chunk metadata
4. Load structured context via Cypher (nodes + relationships)
5. Return HybridRetrievalResult(chunks, structured_entities)
```

#### Current Usage

**Endpoints Using GraphRAG**:
- `/api/ai/query` - AI queries with graph context
- `/api/ai/nutrition-query` - Nutrition queries with formulation retrieval
- `/api/graph/knowledge` - Direct knowledge base access

**Integration Points**:
- `GraphSearchService` - Combines with traditional Cypher queries
- `OrchestrationPersistence` - Data written to Neo4j becomes retrievable after ingestion

#### Strengths

✅ Fully integrated with existing codebase  
✅ Works with custom Ollama embedding service  
✅ Flexible metadata parsing logic  
✅ Built-in caching mechanism  
✅ Custom truncation and filtering  

#### Limitations

❌ Custom code requires maintenance  
❌ No built-in fulltext search integration  
❌ No Text2Cypher capabilities  
❌ No hybrid Cypher retriever (vector + graph in one step)  
❌ Manual relationship traversal logic  
❌ No agentic tooling support  

---

## Official neo4j-graphrag Package Analysis

### Package Details

**Version**: 1.0.0 (installed)  
**Status**: ⚠️ Import errors due to tf-keras dependency conflict

### Available Retrievers

Based on official documentation, the package provides:

#### 1. **VectorRetriever**
- Pure ANN vector similarity search
- Queries Neo4j vector index
- Returns semantically similar chunks
- **Use Case**: Unstructured text search, document Q&A

#### 2. **VectorCypherRetriever**
- Vector search + automatic Cypher traversal
- Enriches vector results with graph relationships
- **Use Case**: "Find similar recipes AND show their ingredients"

#### 3. **HybridRetriever**
- Combines vector + fulltext keyword search
- Better for exact term matching + semantic similarity
- **Use Case**: "Find recipes with 'chocolate' (exact) that are similar to cookies (semantic)"

#### 4. **HybridCypherRetriever**
- Hybrid search + Cypher graph traversal
- Most comprehensive retrieval strategy
- **Use Case**: Enterprise knowledge graphs with structured + unstructured data

#### 5. **Text2CypherRetriever**
- LLM translates natural language → Cypher queries
- No manual query writing required
- **Use Case**: "Show me all formulations created last month with protein > 20g"

#### 6. **ToolsRetriever** (Agentic)
- LLM agent selects appropriate retriever based on query
- Dynamic tool routing
- **Use Case**: General-purpose queries where retrieval strategy varies

### Advantages Over Custom Implementation

| Feature | Custom | Official |
|---------|--------|----------|
| Vector Search | ✅ Manual | ✅ Optimized |
| Fulltext Search | ❌ None | ✅ Built-in |
| Hybrid Search | ❌ None | ✅ Built-in |
| Text2Cypher | ❌ None | ✅ LLM-powered |
| Agentic Routing | ❌ None | ✅ ToolsRetriever |
| Graph Traversal | ✅ Manual Cypher | ✅ Automatic |
| Maintenance | ⚠️ Custom code | ✅ Neo4j supported |
| Updates | ❌ Manual | ✅ pip upgrade |

---

## Dependency Issue Analysis

### Current Error

```
ValueError: Your currently installed version of Keras is Keras 3, 
but this is not yet supported in Transformers. 
Please install the backwards-compatible tf-keras package with `pip install tf-keras`.
```

### Root Cause

`neo4j-graphrag` → `sentence-transformers` → `transformers` → Keras 3 incompatibility

### Resolution Options

#### Option A: Install tf-keras (Quick Fix)
```bash
pip install tf-keras
```
**Pros**: Simple, maintains current environment  
**Cons**: Adds TensorFlow dependency, may conflict with PyTorch workflows

#### Option B: Use Minimal Import (Recommended)
```python
# Import only needed classes, avoid heavy dependencies
from neo4j_graphrag.retrievers.base import Retriever
from neo4j_graphrag.llm import LLMInterface
```
**Pros**: Avoids transformers import  
**Cons**: May not have access to all features

#### Option C: Conditional Import with Fallback
```python
try:
    from neo4j_graphrag.retrievers import VectorRetriever
    OFFICIAL_RETRIEVERS_AVAILABLE = True
except ImportError:
    OFFICIAL_RETRIEVERS_AVAILABLE = False
    # Use custom implementation
```
**Pros**: Graceful degradation, no breaking changes  
**Cons**: Maintains dual code paths

---

## Migration Strategy

### Phase 1: Dependency Resolution (1-2 hours)

**Tasks**:
1. Install tf-keras: `pip install tf-keras`
2. Test imports: `from neo4j_graphrag.retrievers import VectorRetriever, HybridRetriever`
3. Update `requirements.txt`:
   ```
   neo4j-graphrag==1.0.0
   tf-keras>=2.16.0
   ```
4. Verify backend starts without errors

### Phase 2: Parallel Implementation (4-6 hours)

**Create adapter layer** that wraps official retrievers while maintaining current API:

```python
# backend/app/services/graphrag_official.py
from neo4j_graphrag.retrievers import (
    VectorRetriever, 
    HybridRetriever,
    VectorCypherRetriever
)
from app.services.graphrag_retrieval import (
    GraphRAGRetrievalService,  # Keep custom as fallback
    HybridRetrievalResult
)

class OfficialGraphRAGAdapter:
    """Adapter to use official neo4j-graphrag retrievers with existing API"""
    
    def __init__(self, neo4j_driver, embedder, index_name):
        self.vector_retriever = VectorRetriever(
            driver=neo4j_driver,
            index_name=index_name,
            embedder=embedder
        )
        self.hybrid_retriever = HybridRetriever(
            driver=neo4j_driver,
            vector_index_name=index_name,
            fulltext_index_name=f"{index_name}_fulltext",
            embedder=embedder
        )
    
    def retrieve(self, query: str, limit: int = 5) -> HybridRetrievalResult:
        """Maintains compatibility with current API"""
        # Use official retriever
        results = self.hybrid_retriever.search(query_text=query, top_k=limit)
        
        # Convert to current format
        return self._convert_to_hybrid_result(results)
```

### Phase 3: A/B Testing (2-3 hours)

**Compare performance**:
- Query latency
- Retrieval accuracy (precision@5, recall@10)
- Graph context richness
- Resource usage (memory, CPU)

**Test cases**:
```python
test_queries = [
    "Find high protein smoothie recipes",
    "Show formulations with broccoli and vitamin C",
    "What are the nutrients in Greek yogurt?",
    "Similar recipes to chocolate chip cookies"
]
```

### Phase 4: Feature Enhancement (6-8 hours)

**Implement missing capabilities**:

#### 4.1 Text2Cypher Integration
```python
from neo4j_graphrag.retrievers import Text2CypherRetriever

text2cypher = Text2CypherRetriever(
    driver=neo4j_driver,
    llm=ollama_llm,  # Use existing Ollama service
    neo4j_schema=graph_schema
)

# Enable natural language queries
result = text2cypher.search(
    "Show me all formulations created in November with calories < 300"
)
```

#### 4.2 Agentic Tool Routing
```python
from neo4j_graphrag.retrievers import ToolsRetriever

tools_retriever = ToolsRetriever(
    driver=neo4j_driver,
    llm=ollama_llm,
    retrievers=[
        ("vector", vector_retriever),
        ("hybrid", hybrid_retriever),
        ("text2cypher", text2cypher_retriever)
    ]
)

# LLM automatically selects best retriever
result = tools_retriever.search(user_query)
```

### Phase 5: Gradual Rollout (1-2 weeks)

1. **Week 1**: Deploy adapter in parallel, log performance metrics
2. **Week 2**: Switch 50% traffic to official retrievers
3. **Week 3**: Full migration if metrics positive
4. **Week 4**: Deprecate custom implementation

---

## Testing Plan

### Unit Tests

```python
# tests/services/test_graphrag_official.py

def test_vector_retriever_basic():
    """Test official VectorRetriever returns results"""
    retriever = VectorRetriever(driver, "chunks", embedder)
    results = retriever.search("high protein recipes", top_k=5)
    assert len(results) > 0
    assert all(r.score > 0 for r in results)

def test_hybrid_retriever_keyword_boost():
    """Test hybrid retriever boosts exact keyword matches"""
    hybrid = HybridRetriever(driver, "chunks", "chunks_fulltext", embedder)
    results = hybrid.search("Greek yogurt formulation", top_k=5)
    # Should rank "Greek yogurt" exact matches higher
    assert "greek" in results[0].content.lower()

def test_text2cypher_complex_query():
    """Test Text2Cypher generates correct Cypher"""
    t2c = Text2CypherRetriever(driver, ollama_llm, schema)
    query = "Find formulations with more than 3 ingredients created after 2025-01-01"
    result = t2c.search(query)
    # Verify Cypher was generated and executed
    assert result.cypher_query is not None
    assert "MATCH" in result.cypher_query
```

### Integration Tests

```python
def test_orchestration_output_retrievable():
    """Verify orchestration outputs are findable via GraphRAG"""
    # 1. Create orchestration run with test formulation
    persist_run(test_orchestration_data)
    
    # 2. Ingest to GraphRAG (create chunks + embeddings)
    ingest_orchestration_run(run_id)
    
    # 3. Query via retriever
    results = hybrid_retriever.search("test formulation green smoothie")
    
    # 4. Verify found
    assert any("green smoothie" in r.content.lower() for r in results)
```

### Performance Benchmarks

```python
def benchmark_retrieval_latency():
    """Compare custom vs official retriever speed"""
    queries = load_test_queries(100)
    
    # Custom implementation
    custom_times = [time_query(custom_retriever, q) for q in queries]
    
    # Official implementation
    official_times = [time_query(official_retriever, q) for q in queries]
    
    print(f"Custom avg: {mean(custom_times):.3f}s")
    print(f"Official avg: {mean(official_times):.3f}s")
    print(f"Speedup: {mean(custom_times)/mean(official_times):.2f}x")
```

---

## Orchestration Integration Plan

### Current Gap

**Orchestration persistence does NOT automatically create GraphRAG chunks**:
- Orchestration runs saved to Neo4j (nodes + relationships)
- No vector embeddings created
- Not indexed in vector search
- Not retrievable via semantic queries

### Solution: Post-Persistence Ingestion Hook

```python
# backend/app/services/orchestration_persistence_service.py

def persist_run(self, write_set: GraphWriteSet) -> PersistenceSummary:
    # ... existing persistence logic ...
    
    summary = PersistenceSummary(...)
    
    # NEW: Trigger GraphRAG ingestion
    if self.auto_ingest_to_graphrag:
        try:
            await self._ingest_run_to_graphrag(write_set)
        except Exception as e:
            logger.warning(f"GraphRAG ingestion failed: {e}")
            # Don't fail persistence if ingestion fails
    
    return summary

async def _ingest_run_to_graphrag(self, write_set: GraphWriteSet):
    """Create searchable chunks from orchestration output"""
    chunks = []
    
    # Chunk 1: Recipe summary
    recipe_text = f"""
    Recipe: {write_set.recipe_version['name']}
    Total Percentage: {write_set.recipe_version['totalPercentage']}%
    Ingredients: {len(write_set.graph_nodes)} items
    """
    chunks.append(create_chunk(recipe_text, "recipe_summary"))
    
    # Chunk 2: Graph structure
    graph_text = f"""
    Graph contains {len(write_set.graph_nodes)} nodes and {len(write_set.graph_edges)} edges
    Node types: {[n['type'] for n in write_set.graph_nodes]}
    """
    chunks.append(create_chunk(graph_text, "graph_structure"))
    
    # Chunk 3: UI config
    ui_text = f"""
    UI Theme: {write_set.ui_config['theme']}
    Layout: {write_set.ui_config['layout']}
    Components: {[c['id'] for c in write_set.ui_config['components']]}
    """
    chunks.append(create_chunk(ui_text, "ui_config"))
    
    # Embed and store
    embeddings = await self.embedding_service.embed_texts([c.content for c in chunks])
    await self.graphrag_ingestion.store_chunks(chunks, embeddings)
```

---

## Recommendation

### Immediate Actions (This Week)

1. ✅ **Fix tf-keras dependency** - Enable official package imports
2. ✅ **Test official VectorRetriever** - Verify basic functionality
3. ✅ **Create adapter layer** - Maintain API compatibility

### Short-Term (Next 2 Weeks)

4. 🔄 **Deploy parallel implementation** - A/B test performance
5. 🔄 **Add Text2Cypher endpoint** - Enable natural language queries
6. 🔄 **Integrate orchestration ingestion** - Make runs searchable

### Long-Term (Next Month)

7. 📅 **Full migration to official package** - Deprecate custom code
8. 📅 **Implement agentic routing** - ToolsRetriever for dynamic strategy
9. 📅 **Performance optimization** - Tune indexes, caching, batching

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dependency conflicts | Medium | High | Conditional imports, fallback to custom |
| Performance regression | Low | Medium | A/B testing, rollback capability |
| API breaking changes | Low | High | Adapter layer maintains compatibility |
| Neo4j version incompatibility | Low | High | Test against Neo4j 5.27.0 explicitly |
| Learning curve | Medium | Low | Comprehensive documentation, examples |

---

## Success Metrics

### Performance
- Retrieval latency < 200ms (p95)
- Vector search recall@10 > 80%
- Hybrid search precision@5 > 90%

### Functionality
- All 6 retriever types working
- Text2Cypher query success rate > 75%
- Orchestration runs searchable within 1 minute

### Maintainability
- Custom code reduced by 300+ lines
- Dependency on Neo4j official package
- Automated tests passing > 95%

---

## Next Steps

**Ready to proceed?** Choose migration path:

**Option 1: Conservative** - Fix dependencies, test official retrievers in sandbox  
**Option 2: Aggressive** - Deploy adapter layer, parallel A/B testing immediately  
**Option 3: Hybrid** - Keep custom for production, use official for new features  

**Recommended**: Option 2 (Aggressive) - Official package provides significant advantages worth rapid adoption.

