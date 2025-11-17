# Ollama & AI Pipeline Analysis - Cause and Effect

## Executive Summary
This document analyzes the Ollama integration and AI pipeline architecture across the Orchestration page and AI Assistant components in the Recipe Organizer application.

---

## 1. Ollama Integration Architecture

### 1.1 Configuration Layer
**Location**: `backend/app/core/config.py` & Frontend environment settings

**Cause**: Application needs local LLM capabilities
**Effect**: 
- `OLLAMA_BASE_URL`: Default `http://localhost:11434` for local Ollama server
- `OLLAMA_MODEL`: Model selection (e.g., `llama3`, `mistral`, `phi3`)
- `OLLAMA_EMBED_MODEL`: Embedding model for GraphRAG (e.g., `nomic-embed-text`)
- `OLLAMA_EMBED_BATCH_SIZE`: Batch size for embedding operations

**Configuration Source**: `src/components/integrations/EnvironmentConfigPanel.jsx`
```javascript
{
  key: 'OLLAMA_BASE_URL',
  label: 'Ollama Base URL',
  defaultValue: 'http://localhost:11434',
  group: 'ollama'
},
{
  key: 'OLLAMA_MODEL',
  label: 'Ollama Model',
  defaultValue: 'llama3',
  group: 'ollama'
}
```

---

## 2. Multi-Agent Orchestration Pipeline

### 2.1 Agent Pipeline Architecture
**Location**: `src/lib/orchestration/orchestrator.js`

**Agents in Sequential Order**:
1. **Recipe Engineer** (`recipe-engineer-agent.js`)
   - **Cause**: User provides natural language formulation request
   - **Effect**: Parses structure, validates yields, extracts ingredients
   - **Output**: Structured recipe object with ingredients and metadata

2. **Scaling Calculator** (`scaling-calculator-agent.js`)
   - **Cause**: Receives structured recipe from Recipe Engineer
   - **Effect**: Computes scaled quantities for target batch size
   - **Output**: Calculation object with scaled quantities and costs

3. **Graph Builder** (`graph-builder-agent.js`)
   - **Cause**: Receives recipe + calculation data
   - **Effect**: Prepares Neo4j graph structure with nodes and relationships
   - **Output**: Graph visualization data structure

4. **QA Validator** (`qa-validator-agent.js`)
   - **Cause**: Receives complete formulation data
   - **Effect**: Validates consistency, checks constraints, ensures data quality
   - **Output**: Validation report with pass/fail status

5. **UI Designer** (`ui-designer-agent.js`)
   - **Cause**: Receives validated formulation
   - **Effect**: Generates UI component configurations
   - **Output**: UI config for rendering formulation interface

### 2.2 Orchestration Flow
**Location**: `src/components/orchestration/OrchestrationView.jsx`

```javascript
const AGENT_PIPELINE = [
  { name: 'Recipe Engineer', desc: 'Parses structure & validates yields', Icon: Wrench },
  { name: 'Scaling Calculator', desc: 'Computes quantities & costs', Icon: ChartLine },
  { name: 'Graph Builder', desc: 'Prepares Neo4j visualization', Icon: ShareNetwork },
  { name: 'QA Validator', desc: 'Checks consistency & constraints', Icon: CheckCircle },
  { name: 'UI Designer', desc: 'Generates component configs', Icon: PaintBrush },
]
```

**Status Management**:
- `idle` → `pending` → `running` → `success` | `failed`
- Failed agents trigger `skipped` status for downstream agents
- Real-time status updates via callbacks: `onAgentStart`, `onAgentComplete`

---

## 3. AI Assistant Integration

### 3.1 AI Runtime Service
**Location**: `src/lib/ai/ai-assistant.runtime.js`

**Service Modes**:
- **online**: Uses backend API endpoint `/api/ai/query`
- **offline**: Falls back to local mock handler
- **auto**: Attempts online, falls back to offline on failure

**Cause-Effect Chain**:
```javascript
User Query → AIAssistantService.query() 
  → Backend /api/ai/query endpoint
    → Ollama LLM processing (if configured)
      → Neo4j GraphRAG context retrieval
        → LLM response with graph context
          → Frontend rendering
```

### 3.2 GraphRAG Integration
**Location**: `backend/scripts/graphrag_ingest.py`

**Embedding Pipeline**:
```python
OllamaEmbeddingClient(
  base_url=settings.OLLAMA_BASE_URL,
  model=settings.OLLAMA_EMBED_MODEL,
  batch_size=settings.OLLAMA_EMBED_BATCH_SIZE
)
```

**Cause**: Document chunks need vector embeddings for semantic search
**Effect**:
1. Text chunks sent to Ollama embedding model
2. Vector embeddings stored in Neo4j
3. GraphRAG can retrieve semantically similar context
4. LLM receives enriched context for better responses

---

## 4. Ollama Health Check

**Location**: `src/components/integrations/EnvironmentConfigPanel.jsx`

```javascript
case 'ollama': {
  const health = await checkService('ollama')
  if (health?.status === 'ok') {
    setSuccess(`Ollama responding (model: ${health.ollama_model || 'unknown'})`)
  } else {
    setFailure('Ollama service is not reachable')
  }
}
```

**Health Check Endpoint**: `/api/health`
**Expected Response**:
```json
{
  "status": "ok",
  "ollama_status": "ok",
  "ollama_model": "llama3"
}
```

---

## 5. Cause and Effect Summary

### 5.1 Orchestration Page Flow

| Cause | Effect | Component |
|-------|--------|-----------|
| User enters formulation request | OrchestrationView triggers agent pipeline | `OrchestrationView.jsx` |
| Agent pipeline starts | Status changes to `pending` for all agents | `orchestrator.js` |
| Recipe Engineer executes | Parses natural language → structured recipe | `recipe-engineer-agent.js` |
| Recipe parsed successfully | Scaling Calculator receives recipe input | `orchestrator.js` |
| Scaling calculated | Graph Builder receives calculation data | `orchestrator.js` |
| Graph built | QA Validator checks constraints | `qa-validator-agent.js` |
| Validation passes | UI Designer generates component config | `ui-designer-agent.js` |
| Pipeline completes | Result persisted to Neo4j with session tracking | `orchestration-service.js` |
| Ollama available | LLM powers agent reasoning and text generation | Backend AI service |
| Ollama unavailable | Agents use fallback logic or fail gracefully | `ai-assistant.runtime.js` |

### 5.2 AI Assistant Flow

| Cause | Effect | Component |
|-------|--------|-----------|
| User asks question | Query sent to backend `/api/ai/query` | `AIAssistantPanel.jsx` |
| Backend receives query | Ollama LLM processes with GraphRAG context | Backend AI endpoint |
| GraphRAG activated | Neo4j retrieves semantically similar nodes | `graphrag_service.py` |
| Embeddings matched | Relevant formulation data added to context | Ollama Embedding Client |
| LLM generates response | Answer includes graph-aware insights | Ollama LLM |
| Response returned | Frontend displays AI answer with citations | `AIAssistantPanel.jsx` |
| Nutrition label requested | Separate API calculates label from formulation | `/api/formulations/{id}/nutrition-label` |
| Impact analysis requested | AI compares ingredient alternatives with costs | `handleAnalyzeImpact()` |

---

## 6. Dependencies and Requirements

### 6.1 Ollama Setup Required For:
✅ **Orchestration agents** (Recipe Engineer, QA Validator)
✅ **AI Assistant natural language queries**
✅ **GraphRAG semantic search**
✅ **Embedding generation for document chunks**

### 6.2 Fallback Behavior When Ollama Unavailable:
⚠️ **Orchestration**: Agents use template-based parsing (reduced intelligence)
⚠️ **AI Assistant**: Falls back to offline mock responses
⚠️ **GraphRAG**: Cannot generate embeddings for new content
⚠️ **Semantic Search**: Exact keyword matching only

---

## 7. Performance Considerations

### 7.1 Ollama Model Selection Impact

| Model | Speed | Quality | Memory | Use Case |
|-------|-------|---------|--------|----------|
| phi3 (3B) | Fast | Good | 2GB | Quick responses, simple queries |
| llama3 (8B) | Medium | Excellent | 4GB | Balanced performance |
| mistral (7B) | Medium | Very Good | 4GB | Technical analysis |
| llama3:70b | Slow | Outstanding | 40GB+ | Complex reasoning (server only) |

### 7.2 Batch Size Impact on Embedding

**Small batches (10-50)**: Lower memory, slower total time
**Large batches (100-500)**: Higher memory, faster total time, risk of timeout

**Recommendation**: 
- Development: `OLLAMA_EMBED_BATCH_SIZE=50`
- Production: `OLLAMA_EMBED_BATCH_SIZE=200`

---

## 8. Updated Architecture After Changes

### 8.1 Removed Components
❌ **ConversationAIView** - Removed standalone conversation page
❌ **Conversation AI sidebar item** - Removed from navigation

### 8.2 New Integrated Structure
✅ **AIAssistantPanel with Tabs**:
  - Tab 1: AI Assistant (GraphRAG + Ollama)
  - Tab 2: Professional Calculator (ISA-88 BOM)

✅ **Professional Calculator** now accessible from:
  1. Formulations page → Professional tab
  2. AI Assistant (integrated as tab 2)

---

## 9. Configuration Best Practices

### 9.1 Recommended Settings

```bash
# .env or runtime.config.json
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_EMBED_BATCH_SIZE=200

# GenAI Provider Selection
GENAI_PROVIDER=ollama  # or azure-openai, openai, neo4j-plugin
```

### 9.2 Testing Ollama Integration

```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/tags

# 2. Pull required models
ollama pull llama3
ollama pull nomic-embed-text

# 3. Test embedding
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test embedding"
}'

# 4. Test chat completion
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "What is a formulation?"
}'
```

---

## 10. Troubleshooting

### 10.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Ollama service not reachable" | Ollama not running | Start Ollama: `ollama serve` |
| "Model not found" | Model not pulled | `ollama pull llama3` |
| Slow embedding generation | Large batch size | Reduce `OLLAMA_EMBED_BATCH_SIZE` |
| Out of memory | Model too large | Switch to smaller model (phi3) |
| GraphRAG not finding context | Embeddings not generated | Run `graphrag_ingest.py` script |
| AI responses generic | No graph context | Check Neo4j connection and data |

---

## 11. Conclusion

The Ollama integration provides local LLM capabilities across:
- **Orchestration**: Multi-agent pipeline for formulation generation
- **AI Assistant**: Natural language queries with GraphRAG context
- **Embeddings**: Semantic search for ingredient and formulation data

**Key Benefit**: Privacy-first AI with no external API dependencies, full control over models, and offline operation capability.

**Integration Point**: Professional Calculator now embedded in AI Assistant for seamless workflow between AI recommendations and BOM creation.
