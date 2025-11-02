# AI Assistant Quick Reference

## Quick Start
1. Navigate to **AI Assistant** tab
2. Type question or click a suggestion
3. Press **Enter** or click **Ask**
4. Review answer, highlights, and recommendations

## Example Questions

### Find & Filter
```
Show all recipes using mango concentrate
Find formulations with yield < 90%
List ingredients costing more than $10/kg
Which formulations are in review status?
```

### Cost Analysis
```
What are the most expensive ingredients?
Suggest low-cost substitutes for vanilla extract
What's the total cost of all draft formulations?
Find high-cost ingredients in active formulation
```

### Yield & Optimization
```
Which formulations have the lowest yield?
Summarize yield trends for Q4
Find formulations with yield loss > 20%
Show process steps with high waste
```

### Substitution & Alternatives
```
Suggest alternatives for ingredient X
Find low-cost substitutes for flavor Y
What ingredients can replace preservative Z?
Show alternative suppliers for ingredient A
```

### Relationships & Lineage
```
Show relationships between recipes and plants
Trace lineage from sales order to ingredients
Find all manufacturing recipes for plant X
What recipes are derived from master recipe Y?
```

### Data Quality
```
Which formulations have incomplete cost data?
Find ingredients missing nutritional information
Show formulations with percentage errors
List recipes without supplier information
```

## Response Components

### Answer
- Direct, clear response to your question
- Includes quantitative data and specific references
- Shows confidence score (0-100%)
- Execution time in milliseconds

### Node Highlights
- Top 10 most relevant graph nodes
- Sorted by relevance percentage
- Shows node type and key properties
- Click to explore in graph view (future feature)

### Relationship Summaries
- Groups relationships by type
- Shows count of each relationship type
- Provides human-readable descriptions
- Includes example relationships

### Recommendations
- Up to 5 actionable suggestions
- Categorized by type:
  - 💰 Cost Optimization
  - 📈 Yield Improvement
  - 🔄 Substitution
  - ⚙️ Process Optimization
  - ✨ Quality Enhancement
- Impact level: High, Medium, Low
- Marked as actionable or informational

## Tips for Better Results

### Be Specific
- ❌ "Show me recipes"
- ✅ "Show recipes using vanilla with yield < 85%"

### Include Constraints
- ❌ "Find expensive ingredients"
- ✅ "Find ingredients costing more than $15/kg"

### Use Natural Language
- ❌ "SELECT * FROM formulation WHERE yield < 90"
- ✅ "Find formulations with yield less than 90%"

### Add Context
- ❌ "What's the average cost?"
- ✅ "What's the average cost per unit for approved formulations?"

## Understanding Confidence

| Score | Meaning | Action |
|-------|---------|--------|
| 85-100% | High confidence, data-backed | Trust and act on results |
| 70-84% | Good confidence, some inference | Verify key details |
| 50-69% | Moderate confidence, limited data | Cross-check findings |
| <50% | Low confidence, unclear | Rephrase question |

## Recommendation Impact Levels

| Level | Icon | Meaning | Priority |
|-------|------|---------|----------|
| High | 🔴 | Significant benefit/issue | Address immediately |
| Medium | 🟡 | Valuable improvement | Schedule for action |
| Low | 🔵 | Nice-to-have optimization | Consider when time permits |

## Data Sources

| Source | Icon | Description |
|--------|------|-------------|
| Formulations | 📝 | Local formulation data from your workspace |
| Neo4j | 🗄️ | Live graph database query results |
| LLM | ✨ | AI reasoning and natural language processing |
| Calculation | 🧮 | Computed metrics and derived values |

## Common Issues

### No results found
- **Check**: Is data loaded? Are formulations created?
- **Fix**: Create formulations or check Neo4j connection

### Low confidence score
- **Check**: Is question too vague?
- **Fix**: Add specific constraints and context

### Slow responses (>5s)
- **Check**: Is Neo4j query complex?
- **Fix**: Narrow scope with filters

### Empty relationship summaries
- **Check**: Is Neo4j connected?
- **Fix**: Configure Neo4j in Backend Settings

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Submit query |
| Esc | Clear input (when empty) |

## Suggested Query Categories

### 🔍 Discovery
- "Show all recipes using [ingredient]"
- "Find formulations with [criteria]"
- "List ingredients with [property]"

### 💰 Cost
- "What are the most expensive ingredients?"
- "Suggest low-cost substitutes for [ingredient]"
- "Calculate total cost for [formulation]"

### 📊 Analysis
- "Summarize yield trends for [period]"
- "Compare [formulation A] and [formulation B]"
- "Analyze ingredient usage patterns"

### 🔄 Optimization
- "How can I reduce cost for [formulation]?"
- "Suggest yield improvements"
- "Find substitution opportunities"

### 🗺️ Relationships
- "Show relationships between [entity A] and [entity B]"
- "Trace lineage from [start] to [end]"
- "Find all connections for [entity]"

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Natural Language Query | ✅ Live | Fully functional |
| Cypher Generation | ✅ Live | Uses GPT-4 |
| Node Highlights | ✅ Live | Top 10 results |
| Relationship Summaries | ✅ Live | Auto-grouped |
| Recommendations | ✅ Live | 5 types |
| Query History | ✅ Live | Last 10 queries |
| Neo4j Integration | ✅ Live | When connected |
| Voice Input | 🚧 Planned | Future release |
| Graph Visualization | 🚧 Planned | Click nodes to view |

## Performance Expectations

| Operation | Typical Time |
|-----------|--------------|
| Query Analysis | ~500ms |
| Cypher Generation | 1-2s |
| Neo4j Execution | 100-500ms |
| Answer Generation | 1-2s |
| **Total** | **2-4s** |

## Best Practices Checklist

- ✅ Use specific ingredient/formulation names
- ✅ Include numeric constraints (>, <, =)
- ✅ Specify status or category filters
- ✅ Ask one clear question at a time
- ✅ Review confidence score before acting
- ✅ Check data sources used
- ✅ Copy answers for documentation
- ✅ Review recommendations regularly
- ✅ Use query history to track patterns
- ✅ Keep Neo4j connected for best results

## Getting Help

1. **Try Suggested Questions**: Pre-built examples that work well
2. **Review Recent Questions**: See what worked previously
3. **Check Data Sources**: Ensure required data is available
4. **Rephrase Query**: Use different words or structure
5. **Simplify Request**: Break complex questions into parts
6. **Review Documentation**: Read full AI_ASSISTANT_GUIDE.md

---

**Pro Tip**: The AI learns from context. If asking follow-up questions, reference previous results for continuity.
