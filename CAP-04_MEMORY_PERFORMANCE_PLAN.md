# CAP-04: Memory & Performance Optimization Plan

**Status**: 🔴 Planning Phase  
**Priority**: P1 (HIGH)  
**Target Completion**: November 25, 2025  
**Total Effort**: 22 hours (~3 days)

---

## Objectives

Ensure the orchestration system operates within defined memory and latency budgets to handle production workloads efficiently.

### Success Criteria
- **Memory**: Peak usage ≤ 600 MB during orchestration runs
- **Latency**: End-to-end p95 ≤ 4 seconds
- **Throughput**: Handle 3 concurrent orchestration requests
- **Error Rate**: < 2% over 10-minute windows
- **Observability**: Export Prometheus metrics for monitoring

---

## Background

CAP-01 established the orchestration pipeline but did not enforce memory or latency budgets. As documented in `CAP-01_ORCHESTRATION_PIPELINE.md`, each agent has target budgets:

| Agent | Target Latency | Max Memory | Notes |
|-------|----------------|------------|-------|
| Recipe Engineer | ≤ 800 ms | ≤ 150 MB | Capped at 20 ingredients |
| Scaling Calculator | ≤ 500 ms | ≤ 120 MB | Reuse cached density/cost maps |
| Graph Builder | ≤ 1.2 s | ≤ 200 MB | Stream node creation |
| QA Validator | ≤ 400 ms | ≤ 80 MB | Returns summaries only |
| UI Designer | ≤ 300 ms | ≤ 60 MB | No large assets |
| **Persistence** | ≤ 450 ms | ≤ 70 MB | Batch writes, max 500 nodes |
| **TOTAL** | **< 4 s** | **< 600 MB** | Global budget |

### Current Gaps
1. **No memory profiling** - Unknown actual memory usage per agent
2. **No caching** - Redundant ingredient/cost lookups every run
3. **No backpressure** - Could overload with concurrent requests
4. **No metrics** - Cannot monitor performance in production
5. **No enforcement** - Budgets documented but not validated

---

## Task Breakdown

### Phase 1: Measurement & Analysis (5 hours)

#### Task 4.1: Memory Profiling
**Effort**: 3 hours  
**Priority**: P1

**Objective**: Measure actual memory usage per agent during orchestration.

**Steps**:
1. Install memory-profiler: `pip install memory-profiler`
2. Add `@profile` decorator to each agent's main method
3. Run orchestration with memory profiling enabled
4. Document peak memory per agent
5. Identify memory hotspots (large data structures, leaks)

**Deliverables**:
- Memory profiling report (markdown)
- Per-agent memory breakdown table
- Recommendations for optimization

**Acceptance Criteria**:
- Profiling data collected for 10+ orchestration runs
- Peak memory documented for each agent
- Hotspots identified with line-level granularity

---

#### Task 4.2: Caching Strategy Design
**Effort**: 2 hours  
**Priority**: P1

**Objective**: Design caching layer to reduce redundant data fetching.

**Cache Targets**:
1. **Ingredient Master Data** (RecipeEngineer)
   - Cache key: `ingredient:{id}`
   - TTL: 1 hour
   - Eviction: LRU (max 1000 items)
   
2. **Density Maps** (ScalingCalculator)
   - Cache key: `density:{ingredient_id}`
   - TTL: 24 hours
   - Eviction: LRU (max 500 items)

3. **Cost Maps** (ScalingCalculator)
   - Cache key: `cost:{ingredient_id}`
   - TTL: 6 hours (costs change frequently)
   - Eviction: LRU (max 500 items)

4. **FDC Nutrient Data** (NutritionService)
   - Cache key: `fdc_nutrients:{fdc_id}`
   - TTL: 7 days
   - Eviction: LRU (max 2000 items)

**Technology Options**:
- **Option A**: Redis (external, shared across instances)
- **Option B**: In-memory dict with TTL (simple, single instance)
- **Option C**: Python `cachetools` library (hybrid, LRU + TTL)

**Recommendation**: Start with **Option C** (cachetools) for simplicity, migrate to Redis if scaling needed.

**Deliverables**:
- Caching architecture diagram
- Cache key schema documentation
- TTL/eviction policy table

**Acceptance Criteria**:
- All cache targets documented with TTL
- Technology choice justified
- Implementation plan ready

---

### Phase 2: Implementation (12 hours)

#### Task 4.3: Implement Agent Caching
**Effort**: 4 hours  
**Priority**: P1

**Objective**: Add caching to high-frequency data fetches.

**Implementation**:

```python
# backend/app/core/cache.py
from cachetools import TTLCache, LRUCache
from functools import wraps
import asyncio

# Global caches
ingredient_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour
density_cache = TTLCache(maxsize=500, ttl=86400)  # 24 hours
cost_cache = TTLCache(maxsize=500, ttl=21600)  # 6 hours
fdc_cache = TTLCache(maxsize=2000, ttl=604800)  # 7 days

def cached_async(cache, key_func):
    """Decorator for async function caching"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = key_func(*args, **kwargs)
            if key in cache:
                return cache[key]
            result = await func(*args, **kwargs)
            cache[key] = result
            return result
        return wrapper
    return decorator

# Usage in services
@cached_async(ingredient_cache, lambda neo4j, ing_id: f"ing:{ing_id}")
async def get_ingredient_details(neo4j, ingredient_id: str):
    # Fetch from Neo4j
    ...
```

**Files to Modify**:
- `backend/app/core/cache.py` (NEW)
- `backend/app/services/recipe_engineer_service.py` (add caching)
- `backend/app/services/scaling_calculator_service.py` (add caching)
- `backend/app/services/nutrition_service.py` (add caching)

**Deliverables**:
- Cache module with decorators
- Updated services with @cached_async
- Unit tests for cache hit/miss

**Acceptance Criteria**:
- Cache hit rate > 60% for ingredient lookups
- Latency reduced by 30-50% on cache hits
- Memory usage for cache < 50 MB
- Tests pass with 80% coverage

---

#### Task 4.4: Backpressure Handler
**Effort**: 3 hours  
**Priority**: P1

**Objective**: Limit concurrent orchestration runs to prevent resource exhaustion.

**Implementation**:

```python
# backend/app/core/backpressure.py
import asyncio
from typing import Optional

class OrchestrationQueue:
    def __init__(self, max_concurrent: int = 3):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_count = 0
        self.queued_count = 0
    
    async def acquire(self, timeout: float = 10.0) -> bool:
        """Acquire slot or return False if queue full"""
        self.queued_count += 1
        try:
            acquired = await asyncio.wait_for(
                self.semaphore.acquire(), 
                timeout=timeout
            )
            self.active_count += 1
            return acquired
        except asyncio.TimeoutError:
            return False
        finally:
            self.queued_count -= 1
    
    def release(self):
        """Release slot"""
        self.semaphore.release()
        self.active_count -= 1

# Global queue
orchestration_queue = OrchestrationQueue(max_concurrent=3)

# Usage in orchestration endpoint
@router.post("/orchestrate")
async def orchestrate_pipeline(request: OrchestrationRequest):
    if not await orchestration_queue.acquire(timeout=10.0):
        raise HTTPException(
            status_code=429,
            detail="Too many concurrent requests. Please try again later."
        )
    
    try:
        result = await run_orchestration(request)
        return result
    finally:
        orchestration_queue.release()
```

**Files to Modify**:
- `backend/app/core/backpressure.py` (NEW)
- `backend/app/api/endpoints/orchestration.py` (add queue)
- `backend/app/api/endpoints/ai.py` (add queue if needed)

**Deliverables**:
- Backpressure queue module
- Updated endpoints with queue integration
- Tests with 10+ concurrent requests

**Acceptance Criteria**:
- Max 3 orchestrations run concurrently
- 4th request returns 429 (Too Many Requests)
- Queue timeout after 10 seconds
- No resource exhaustion with 20 concurrent requests

---

#### Task 4.5: Prometheus Metrics Export
**Effort**: 3 hours  
**Priority**: P2

**Objective**: Export performance metrics for observability.

**Metrics to Export**:
1. **orchestration_duration_seconds** (histogram)
   - Labels: status (success/partial/failed)
   - Buckets: [1, 2, 4, 8, 16, 32]

2. **orchestration_memory_bytes** (gauge)
   - Labels: agent_name
   - Updated during each run

3. **orchestration_error_rate** (counter)
   - Labels: error_type, agent_name
   - Increments on failures

4. **cache_hit_rate** (counter)
   - Labels: cache_name (ingredient/density/cost/fdc)
   - Increments on hit/miss

5. **queue_length** (gauge)
   - Current number of queued requests

**Implementation**:

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Define metrics
orchestration_duration = Histogram(
    'orchestration_duration_seconds',
    'Time spent orchestrating',
    ['status'],
    buckets=[1, 2, 4, 8, 16, 32]
)

orchestration_memory = Gauge(
    'orchestration_memory_bytes',
    'Memory usage per agent',
    ['agent_name']
)

# Add endpoint
@router.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
```

**Deliverables**:
- Metrics module with Prometheus integration
- `/metrics` endpoint
- Grafana dashboard JSON (optional)

**Acceptance Criteria**:
- `/metrics` endpoint returns Prometheus format
- All 5 metric types exported
- Metrics updated in real-time during runs
- Grafana can scrape metrics (manual test)

---

#### Task 4.6: Memory Budget Enforcement
**Effort**: 2 hours  
**Priority**: P2

**Objective**: Reject requests that would exceed memory budget.

**Implementation**:

```python
# backend/app/core/memory_guard.py
import psutil

class MemoryGuard:
    def __init__(self, max_memory_mb: int = 600):
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.process = psutil.Process()
    
    def check_budget(self) -> tuple[bool, float]:
        """Returns (within_budget, current_mb)"""
        memory_info = self.process.memory_info()
        current_bytes = memory_info.rss
        current_mb = current_bytes / (1024 * 1024)
        within_budget = current_bytes < self.max_memory_bytes
        return within_budget, current_mb
    
    def enforce(self):
        """Raise exception if over budget"""
        within_budget, current_mb = self.check_budget()
        if not within_budget:
            raise MemoryError(
                f"Memory budget exceeded: {current_mb:.1f}MB / {self.max_memory_mb}MB"
            )

memory_guard = MemoryGuard(max_memory_mb=600)

# Usage before each agent call
await memory_guard.enforce()
result = await agent.run()
```

**Deliverables**:
- Memory guard module
- Integration into orchestrator
- Tests with memory-intensive workloads

**Acceptance Criteria**:
- Requests rejected if memory > 600MB
- Log memory violations with details
- No crashes from OOM errors
- Grace period of 50MB (allow 650MB temporarily)

---

### Phase 3: Validation (5 hours)

#### Task 4.7: Latency Monitoring
**Effort**: 2 hours  
**Priority**: P2

**Objective**: Track per-agent latency and log violations.

**Implementation**:

```python
# backend/app/core/latency_monitor.py
import time
import logging
from typing import Dict

logger = logging.getLogger(__name__)

AGENT_LATENCY_TARGETS = {
    "RecipeEngineer": 0.8,  # 800ms
    "ScalingCalculator": 0.5,  # 500ms
    "GraphBuilder": 1.2,  # 1200ms
    "QAValidator": 0.4,  # 400ms
    "UIDesigner": 0.3,  # 300ms
}

class LatencyMonitor:
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.target = AGENT_LATENCY_TARGETS.get(agent_name, 1.0)
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        if duration > self.target:
            logger.warning(
                f"{self.agent_name} exceeded latency target: "
                f"{duration:.3f}s > {self.target:.3f}s"
            )
        orchestration_duration.labels(
            status="success" if exc_type is None else "failed"
        ).observe(duration)

# Usage
with LatencyMonitor("RecipeEngineer"):
    result = await recipe_engineer.run()
```

**Deliverables**:
- Latency monitor context manager
- Integration into all agents
- Latency violation logs

**Acceptance Criteria**:
- Per-agent latency logged for every run
- Warnings logged when target exceeded
- Histogram metrics populated
- Alert fires when p95 > 4s (manual Prometheus rule setup)

---

#### Task 4.8: Load Testing
**Effort**: 3 hours  
**Priority**: P2

**Objective**: Validate system under load with performance benchmarks.

**Test Scenarios**:

1. **Baseline Test** (10 sequential runs)
   - Measure p50, p95, p99 latency
   - Measure peak memory
   - Verify all runs succeed

2. **Concurrent Test** (3 concurrent runs × 10 iterations = 30 runs)
   - Verify queue limits to 3 concurrent
   - Measure latency degradation
   - Verify no OOM errors

3. **Stress Test** (10 concurrent runs)
   - Verify 7 requests return 429
   - Verify 3 complete successfully
   - Verify no crashes

4. **Sustained Load** (100 runs over 10 minutes)
   - Verify cache hit rate > 60%
   - Verify memory stable (no leaks)
   - Verify error rate < 2%

**Implementation**:

```python
# backend/tests/load/test_orchestration_load.py
import asyncio
import aiohttp
import statistics

async def run_orchestration(session, request_data):
    async with session.post(
        "http://localhost:8000/api/orchestration/run",
        json=request_data
    ) as response:
        duration = float(response.headers.get("X-Response-Time", 0))
        return {
            "status": response.status,
            "duration": duration,
            "success": response.status == 200
        }

async def load_test(num_runs=100, concurrent=3):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(num_runs):
            task = run_orchestration(session, get_test_request())
            tasks.append(task)
            if len(tasks) >= concurrent:
                results = await asyncio.gather(*tasks)
                yield results
                tasks = []
```

**Deliverables**:
- Load test script (Python or k6)
- Performance report with metrics
- Recommendations for tuning

**Acceptance Criteria**:
- Baseline: p95 < 4s, success rate 100%
- Concurrent: p95 < 5s, success rate 100%
- Stress: 7 requests get 429, 3 succeed
- Sustained: error rate < 2%, memory stable

---

## Dependencies

### External Services
- **Neo4j**: Must be available (connection already configured)
- **Ollama**: Must be running on `localhost:11434` (already configured)
- **Python venv**: All dependencies installed

### Python Packages (add to requirements.txt)
```text
memory-profiler==0.61.0
cachetools==5.3.2
prometheus-client==0.20.0
psutil==5.9.8
aiohttp==3.9.3  # for load testing
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Memory profiling slows system | Medium | Low | Profile in dev only, not production |
| Cache causes stale data | Medium | Medium | Set conservative TTLs, add cache invalidation |
| Backpressure too aggressive | Low | Medium | Make max_concurrent configurable |
| Metrics overhead | Low | Low | Prometheus client is lightweight |
| Load testing crashes system | Low | High | Run on isolated test environment |

---

## Timeline

**Week 1 (Nov 19-21) - Critical Path**
- Day 1 (Nov 19): Task 4.1 Memory Profiling (3h) + Task 4.2 Caching Design (2h)
- Day 2 (Nov 20): Task 4.3 Implement Caching (4h) + Task 4.4 Backpressure (1h)
- Day 3 (Nov 21): Task 4.4 Backpressure finish (2h) + Task 4.5 Prometheus (3h)

**Week 2 (Nov 22-25) - Monitoring & Validation**
- Day 4 (Nov 22): Task 4.6 Memory Enforcement (2h) + Task 4.7 Latency Monitoring (2h)
- Day 5 (Nov 25): Task 4.8 Load Testing (3h) + Buffer for fixes (2h)

**Total**: 22 hours estimated, 25 hours budgeted (3 hours buffer)

---

## Success Metrics

### Performance Targets
- [ ] Peak memory ≤ 600 MB (p95)
- [ ] End-to-end latency ≤ 4s (p95)
- [ ] Cache hit rate > 60%
- [ ] Error rate < 2% over 10 min

### Implementation Targets
- [ ] All 8 tasks complete
- [ ] All acceptance criteria met
- [ ] Load test passes (100 runs)
- [ ] Prometheus metrics exporting

### Business Value
- [ ] System handles 3 concurrent users
- [ ] Response time acceptable for UX (<4s)
- [ ] No OOM crashes in production
- [ ] Performance regressions detectable via metrics

---

## Related Documents

- `CAP-01_ORCHESTRATION_PIPELINE.md` - Original performance budgets
- `PENDING_TASKS_ACTION_PLAN.md` - Overall project roadmap
- `CAP_COMPLETION_STATUS.md` - Project status tracking

---

**Document Version**: 1.0  
**Created**: November 18, 2025  
**Next Review**: After Task 4.2 completion (caching strategy)
