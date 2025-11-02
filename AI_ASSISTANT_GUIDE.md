# AI Assistant - Natural Language Query System

## Overview

The AI Assistant is an intelligent natural language interface for the Formulation Graph Studio that enables users to ask questions about formulations, analyze graph relationships, and receive actionable recommendations. It combines GPT-4 language models with Neo4j graph database queries to provide contextual, data-driven insights.

## Features

### 1. Natural Language Query Processing
- **Plain English Questions**: Ask questions in natural language without needing to know Cypher or database schemas
- **Query Analysis**: AI automatically identifies query type, entities, filters, metrics, and user intent
- **Multi-Source Integration**: Combines local formulation data, Neo4j graph data, and AI reasoning

### 2. Intelligent Cypher Generation
- **Automatic Query Generation**: Converts natural language to valid Cypher queries using GPT-4
- **Schema-Aware**: Understands the Neo4j graph schema (nodes, relationships, properties)
- **Context Injection**: Includes relevant context (active formulations, filters, time ranges) in query generation
- **Fallback Support**: Works with local data when Neo4j is unavailable

### 3. Comprehensive Response System
- **Answer Synthesis**: Generates clear, quantitative answers from multiple data sources
- **Confidence Scoring**: Shows reliability percentage for each response (0-100%)
- **Execution Metrics**: Displays query execution time
- **Source Attribution**: Lists all data sources used (formulations, Neo4j, LLM, calculations)

### 4. Node Highlights
- **Relevance Ranking**: Identifies and ranks the most relevant graph nodes for each query
- **Property Display**: Shows key properties for each highlighted node
- **Node Type Identification**: Clearly labels node types (Formulation, Ingredient, Recipe, etc.)
- **Top 10 Results**: Limits to most relevant results for clarity

### 5. Relationship Summaries
- **Pattern Analysis**: Identifies relationship patterns in query results
- **Type Grouping**: Groups relationships by type (CONTAINS, USES, DERIVED_FROM, etc.)
- **Count Statistics**: Shows how many relationships of each type were found
- **Example Display**: Provides concrete examples of each relationship type

### 6. Intelligent Recommendations
Generates actionable recommendations in five categories:

#### Cost Optimization
- Identifies high-cost ingredients
- Suggests bulk purchasing opportunities
- Highlights cost ratio issues

#### Yield Improvement
- Detects low-yield formulations (<90%)
- Recommends process optimization
- Sets target yield goals

#### Substitution
- Suggests alternatives for expensive ingredients
- Considers functional properties
- Calculates potential savings

#### Process Optimization
- Analyzes manufacturing efficiency
- Identifies bottlenecks
- Recommends equipment upgrades

#### Quality Enhancement
- Detects formulation imbalances
- Flags missing data
- Ensures compliance

### 7. Query Suggestions
Pre-built queries covering common use cases:
- "Show all recipes using mango concentrate with yield < 90%"
- "Suggest low-cost substitutes for vanilla extract"
- "What are the most expensive ingredients across all formulations?"
- "Which formulations have incomplete cost data?"
- "Summarize yield trends for formulations created this quarter"
- "Find ingredients that could be substituted to reduce cost"
- "What formulations contain preservatives and have high costs?"
- "Show relationships between master recipes and manufacturing plants"

### 8. Query History
- Maintains last 10 queries
- Click to re-execute any previous query
- Shows execution time and confidence for reference

## Usage

### Basic Query
1. Navigate to the "AI Assistant" tab
2. Type your question in the search bar
3. Click "Ask" or press Enter
4. View the comprehensive response with highlights and recommendations

### Using Suggestions
1. Browse the suggested questions displayed on first visit
2. Click any suggestion to execute immediately
3. Results appear with full analysis

### Re-running Queries
1. Scroll to "Recent Questions" section
2. Click any previous query to re-execute
3. Useful for tracking changes over time

### Copying Answers
1. Click the "Copy" button in the answer section
2. Answer text is copied to clipboard
3. Paste into reports, emails, or documentation

## Example Queries

### Search Queries
```
"Find all formulations using mango concentrate"
"Show ingredients with cost over $10/kg"
"List formulations with status 'approved'"
```

### Comparison Queries
```
"Compare yield between concentrate and final product formulations"
"Which is more cost-effective: vanilla extract or vanilla flavor?"
"Show the difference between Recipe A and Recipe B"
```

### Analysis Queries
```
"What's the average cost per unit across all formulations?"
"Analyze ingredient usage patterns"
"Calculate total cost for all draft formulations"
```

### Recommendation Queries
```
"Suggest low-cost substitutes for flavor X"
"How can I improve yield for Formulation Y?"
"What ingredients could be replaced to reduce cost?"
```

### Trend Queries
```
"Summarize yield loss trends for Q4"
"Show cost trends over time"
"Track formulation approval rates by month"
```

## Technical Architecture

### Query Processing Pipeline

1. **Query Analysis**
   - Parse natural language question
   - Identify query type (search, comparison, analysis, recommendation, summarization)
   - Extract entities, filters, metrics, and keywords
   - Determine if graph database access is needed

2. **Context Retrieval**
   - Gather relevant formulations from local storage
   - Generate Cypher query if Neo4j access required
   - Execute Cypher against Neo4j database
   - Enrich context with graph results

3. **Answer Generation**
   - Synthesize information from all sources
   - Format with specific data references
   - Calculate confidence score
   - Generate plain text response

4. **Enhancement**
   - Extract relevant nodes and rank by relevance
   - Summarize relationship patterns
   - Generate recommendations based on findings
   - Identify data sources used

### Data Flow

```
User Question
    ↓
Query Analyzer (GPT-4)
    ↓
[Graph Required?] → Yes → Cypher Generator (GPT-4)
    |                         ↓
    |                    Neo4j Query
    |                         ↓
    |                    Graph Results
    ↓                         ↓
Context Enricher ←────────────┘
    ↓
Answer Generator (GPT-4)
    ↓
[Answer | Highlights | Summaries | Recommendations]
```

### Key Components

#### AIAssistantService (`/src/lib/ai/ai-assistant.ts`)
- Main service class orchestrating all AI operations
- Methods: `query()`, `analyzeQuery()`, `retrieveGraphContext()`, `generateAnswer()`
- Handles error recovery and fallback logic

#### GenAIClient (`/src/lib/genai/genai-client.ts`)
- Cypher query generation from natural language
- Dual mode: Spark LLM (default) or Neo4j GenAI plugin
- Query validation and cleanup

#### Neo4jDriver (`/src/lib/drivers/neo4j-driver.ts`)
- Database connection management
- Query execution with session handling
- Connection pooling and timeout management

#### AIAssistantPanel (`/src/components/AIAssistantPanel.tsx`)
- React UI component
- Query input and history management
- Response visualization with highlights and recommendations

## Integration with Existing Features

### Formulation Data
- Accesses all formulations via props
- Recognizes active formulation for context
- Analyzes ingredient costs, percentages, functions
- Validates formulation completeness

### Neo4j Graph Database
- Executes Cypher queries when connected
- Falls back to local data when unavailable
- Retrieves node and relationship information
- Supports complex graph traversals

### GenAI Plugin (Optional)
- Uses Neo4j GenAI plugin if available on database
- Fallback to Spark LLM for Cypher generation
- Provides query confidence scoring

## Configuration

### Required
- Active formulations in local storage (via useKV)
- Spark runtime with LLM access

### Optional
- Neo4j database connection (configured in Backend Settings)
- Neo4j GenAI plugin (for advanced Cypher generation)

## Performance

### Typical Metrics
- Query analysis: ~500ms
- Cypher generation: ~1-2s
- Neo4j query execution: ~100-500ms (varies by complexity)
- Answer generation: ~1-2s
- **Total execution time: 2-4s typical**

### Optimization
- Parallel data fetching where possible
- Caching of graph schema
- Efficient query result processing
- Progressive UI updates

## Best Practices

### Writing Effective Queries
1. **Be Specific**: Include entity names, metrics, and constraints
   - ❌ "Show me some recipes"
   - ✅ "Show recipes using vanilla with cost over $5/kg"

2. **Use Natural Language**: Don't try to write pseudo-code
   - ❌ "SELECT formulation WHERE yield < 90"
   - ✅ "Find formulations with yield less than 90%"

3. **Include Context**: Mention time periods, status, or categories
   - ❌ "What's the average cost?"
   - ✅ "What's the average cost for approved formulations?"

4. **Ask Follow-up Questions**: Build on previous queries
   - "Now show me alternatives for those ingredients"

### Interpreting Results

1. **Confidence Score**: 
   - 85-100%: High confidence, data-backed answer
   - 70-84%: Good confidence, some assumptions
   - 50-69%: Moderate confidence, limited data
   - <50%: Low confidence, verify results

2. **Data Sources**: 
   - Check which sources were used
   - Neo4j results are live from database
   - Formulation data is from local storage
   - LLM provides reasoning and synthesis

3. **Recommendations**:
   - High impact: Priority actions with significant benefit
   - Medium impact: Valuable improvements
   - Low impact: Nice-to-have optimizations

## Troubleshooting

### "I was unable to generate a complete answer"
- **Cause**: Query too vague or data unavailable
- **Solution**: Rephrase question with more specifics

### Empty node highlights or relationship summaries
- **Cause**: Neo4j not connected or no matching data
- **Solution**: Check Neo4j connection in Backend Settings

### Low confidence scores
- **Cause**: Ambiguous question or limited data
- **Solution**: Add more context or constraints to query

### Slow response times (>5s)
- **Cause**: Complex graph queries or large result sets
- **Solution**: Add filters to narrow scope

## Future Enhancements

- Voice input support
- Query templates for common patterns
- Export recommendations to action items
- Integration with calculation engine
- Multi-turn conversational context
- Real-time graph visualization of results
- Comparison mode for multiple queries
- Scheduled queries and alerts

## API Reference

### Main Query Method

```typescript
interface AIQuery {
  question: string
  context?: {
    formulations?: Formulation[]
    activeFormulationId?: string
    timeRange?: { start: Date; end: Date }
  }
}

interface AIResponse {
  answer: string
  nodeHighlights?: NodeHighlight[]
  relationshipSummaries?: RelationshipSummary[]
  recommendations?: Recommendation[]
  cypher?: string
  executionTime: number
  confidence: number
  sources?: DataSource[]
}

await aiAssistant.query(request: AIQuery): Promise<AIResponse>
```

### Response Types

```typescript
interface NodeHighlight {
  nodeId: string
  nodeType: 'Formulation' | 'Ingredient' | 'Recipe' | ...
  name: string
  relevance: number  // 0-1
  properties: Record<string, any>
}

interface RelationshipSummary {
  relationshipType: string
  count: number
  description: string
  examples?: Array<{
    source: string
    target: string
    properties?: Record<string, any>
  }>
}

interface Recommendation {
  type: 'cost_optimization' | 'yield_improvement' | 'substitution' | ...
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  details?: Record<string, any>
}
```

## Security Considerations

- Queries are executed with existing Neo4j credentials
- No sensitive data is sent to external services beyond OpenAI API
- All data stays within your infrastructure
- Cypher queries are generated but validated before execution
- No destructive operations (CREATE, DELETE, MERGE) are generated

## Support

For issues or questions about the AI Assistant:
1. Check Neo4j connection status in Backend Settings
2. Review Recent Questions for query patterns
3. Try rephrasing ambiguous questions
4. Check documentation for example queries
5. Verify formulation data is loaded
