# Pending Tasks - Action Plan

**Date**: November 18, 2025  
**Project**: Recipe Organizer  
**Overall Status**: 80% Complete → Target 100%

---

## Overview

This document provides a prioritized action plan for completing the remaining 20% of the Recipe Organizer project. All critical capabilities (CAP-01, CAP-02, CAP-05) are complete. Focus areas: finalize CAP-03, scope and implement CAP-04, comprehensive testing.

---

## Priority 1: Complete CAP-03 (IMMEDIATE)

### Task: FDC Data Validation

**Effort**: 2 hours  
**Priority**: P1 (High)  
**Status**: 🟡 89% complete, only validation remaining  
**Owner**: TBD

#### Steps

1. **Obtain USDA FDC API Key** (15 minutes)
   - Visit: https://fdc.nal.usda.gov/api-key-signup.html
   - Register with email (free)
   - Receive API key via email
   - Store in `.env` file: `FDC_API_KEY=your_key_here`

2. **Run FDC Ingestion** (30 minutes)
   ```bash
   # Navigate to project root
   cd c:\Users\abcd\RECIPE\recipe-organizer
   
   # Ensure backend is running
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   
   # In new terminal, run seed script
   npm run seed:fdc
   ```

3. **Verify Data in Neo4j** (30 minutes)
   - Open Neo4j Browser: https://workspace-preview.neo4j.io/workspace/query
   - Run verification queries:
   ```cypher
   // Count FDC foods
   MATCH (f:FDCFood) RETURN count(f) as total_foods
   
   // Sample 10 foods
   MATCH (f:FDCFood) RETURN f LIMIT 10
   
   // Check nutrient relationships
   MATCH (f:FDCFood)-[r:HAS_NUTRIENT]->(n:Nutrient)
   RETURN f.foodName, n.nutrientName, r.amount
   LIMIT 20
   ```

4. **Test FDC Endpoint** (15 minutes)
   ```bash
   # Test GET /api/fdc/foods endpoint
   curl http://localhost:8000/api/fdc/foods?limit=10
   
   # Test with filters
   curl "http://localhost:8000/api/fdc/foods?category=Dairy&limit=5"
   ```

5. **Test Frontend Panel** (15 minutes)
   - Open application: http://localhost:5173
   - Navigate to FDC Data Ingestion panel
   - Verify foods display in catalog
   - Test pagination
   - Test category filtering

6. **Update Documentation** (15 minutes)
   - Mark Task 3.7.1 as DONE in TASK_TRACKER.md
   - Update CAP-03 status to DN (Done)
   - Add completion notes with data counts

#### Acceptance Criteria
- [ ] API key obtained and configured
- [ ] `npm run seed:fdc` completes without errors
- [ ] At least 100 FDC foods in Neo4j
- [ ] GET /api/fdc/foods returns paginated data
- [ ] FDCDataIngestionPanel displays catalog
- [ ] Task 3.7.1 marked DONE
- [ ] CAP-03 status updated to DN

#### Deliverables
- `.env` with FDC_API_KEY
- Neo4j with FDC data
- Updated TASK_TRACKER.md
- Optional: FDC validation report (1-page summary)

---

## Priority 2: CAP-04 Scoping (IMMEDIATE)

### Task: Create CAP-04 Task Breakdown

**Effort**: 2 hours  
**Priority**: P1 (High)  
**Status**: 🔴 Not started  
**Owner**: TBD

#### Steps

1. **Research Performance Requirements** (30 minutes)
   - Review CAP-01_ORCHESTRATION_PIPELINE.md for memory/latency budgets
   - Document current performance metrics (if available)
   - Identify bottlenecks from logs

2. **Draft Task List** (60 minutes)

**Proposed Tasks**:

| ID | Task | Description | Effort | Priority |
|----|------|-------------|--------|----------|
| 4.1 | Memory Profiling | Profile each agent's memory usage during orchestration | 3h | P1 |
| 4.2 | Caching Strategy Design | Design Redis/in-memory cache for density/cost maps | 2h | P1 |
| 4.3 | Implement Agent Caching | Add caching to RecipeEngineer and ScalingCalculator | 4h | P1 |
| 4.4 | Backpressure Handler | Implement queue with max 3 concurrent runs | 3h | P1 |
| 4.5 | Prometheus Metrics | Export orchestration_duration_ms, memory_mb, error_rate | 3h | P2 |
| 4.6 | Memory Budget Enforcement | Add memory checks, reject if >600MB peak | 2h | P2 |
| 4.7 | Latency Monitoring | Add per-agent latency tracking with alerts | 2h | P2 |
| 4.8 | Load Testing | Run 100-run load test, document performance | 3h | P2 |

**Total**: 22 hours (~3 days)

3. **Create CAP-04 Document** (30 minutes)
   ```markdown
   # CAP-04: Memory & Performance Optimization
   
   ## Objectives
   - Enforce memory budgets per agent (total <600MB)
   - Meet latency targets (<4s end-to-end p95)
   - Implement backpressure for concurrent runs
   - Export metrics for observability
   
   ## Tasks
   [Insert task table from above]
   
   ## Success Metrics
   - Memory usage <600MB peak during orchestration
   - p95 latency <4s for end-to-end runs
   - Error rate <2% over 10 min
   - 100-run load test passes without OOM
   ```

4. **Update TASK_TRACKER.md** (10 minutes)
   - Add 8 tasks to CAP-04 section
   - Update status from NS to IP (In Progress)
   - Set target completion date

#### Acceptance Criteria
- [ ] CAP-04 task breakdown created (8 tasks)
- [ ] Each task has effort estimate and priority
- [ ] CAP-04 document published
- [ ] TASK_TRACKER.md updated with tasks
- [ ] Target completion date set (recommend: Nov 25)

#### Deliverables
- `CAP-04_MEMORY_PERFORMANCE_PLAN.md` (new file)
- Updated TASK_TRACKER.md with 8 CAP-04 tasks

---

## Priority 3: User Acceptance Testing (SHORT TERM)

### Task: CAP-05 End-to-End Testing

**Effort**: 4 hours  
**Priority**: P1 (High)  
**Status**: 🟡 Implementation complete, testing pending  
**Owner**: TBD

#### Test Scenarios

**Phase 1: Orchestration History** (60 minutes)

1. **Run New Orchestration**
   - [ ] Start backend and frontend
   - [ ] Navigate to Orchestration view
   - [ ] Enter user request: "Create a sports drink with 5% protein"
   - [ ] Click "Run Orchestration"
   - [ ] Verify completes successfully
   - [ ] Note runId from response

2. **Browse History**
   - [ ] Click "Show History" button
   - [ ] Verify table displays with new run
   - [ ] Check columns: Run ID, Recipe Name, Status, Agents, Duration, Timestamp, Actions
   - [ ] Verify status badge is green (success)
   - [ ] Verify timestamp is relative (e.g., "2 minutes ago")

3. **Filter by Status**
   - [ ] Click "Success" filter button
   - [ ] Verify only successful runs shown
   - [ ] Click "All" to reset
   - [ ] Verify all runs appear

4. **View Historical Run**
   - [ ] Click "View" button on a run
   - [ ] Verify OrchestrationResultView displays
   - [ ] Check all tabs: Recipe, Calculation, Graph, Validation, UI Config
   - [ ] Verify data matches original run
   - [ ] Verify toast notification appears

5. **Pagination**
   - [ ] If >50 runs, verify pagination controls work
   - [ ] Click "Next" to load more runs
   - [ ] Click "Previous" to go back

**Phase 2: Nutrition Label History** (60 minutes)

1. **Generate First Label**
   - [ ] Navigate to Formulations view
   - [ ] Select a formulation
   - [ ] Click "Generate Nutrition Label"
   - [ ] Enter serving size: 100g
   - [ ] Click "Generate"
   - [ ] Verify label displays with version badge (v1)
   - [ ] Note calories value

2. **Check History**
   - [ ] Click "View History" button (if exists)
   - [ ] Verify table shows 1 label with version 1
   - [ ] Check columns: Version, Calories, Serving Size, Generated, Actions

3. **Modify Formulation**
   - [ ] Change ingredient percentage (e.g., increase protein by 5%)
   - [ ] Save formulation
   - [ ] Generate nutrition label again
   - [ ] Verify new label displays with version 2
   - [ ] Verify calories changed (if ingredient has calories)

4. **Compare Versions**
   - [ ] View history
   - [ ] Verify 2 labels in table
   - [ ] Check change indicator (↑ or ↓) next to calories
   - [ ] Click "Compare" button
   - [ ] Verify side-by-side comparison dialog opens
   - [ ] Check both labels display with differences highlighted

5. **Export CSV**
   - [ ] Click "Export CSV" button
   - [ ] Verify file downloads
   - [ ] Open CSV, check columns and data

**Phase 3: Graph Snapshot Viewer** (60 minutes)

1. **Load Graph**
   - [ ] Navigate to Orchestration view
   - [ ] View a historical run
   - [ ] Click "Graph" tab
   - [ ] Verify GraphSnapshotViewer displays

2. **Interact with Graph**
   - [ ] Verify nodes display with different colors (8 types)
   - [ ] Verify edges connect nodes
   - [ ] Verify legend shows all node types
   - [ ] Test zoom in (mouse wheel or +/- buttons)
   - [ ] Test zoom out
   - [ ] Test pan (click and drag)
   - [ ] Verify zoom limits work (min 0.1, max 3)

3. **Select Nodes**
   - [ ] Click on a node
   - [ ] Verify node selection panel appears
   - [ ] Check node properties display
   - [ ] Select different node type
   - [ ] Verify properties update

4. **Empty State**
   - [ ] View a run without graph data
   - [ ] Verify empty state message displays
   - [ ] Verify no errors in console

**Phase 4: UI Metrics Dashboard** (60 minutes)

1. **Load Dashboard**
   - [ ] Navigate to Orchestration view
   - [ ] View a run with UI config
   - [ ] Click "UI Config" tab
   - [ ] Verify UIMetricsDashboard displays

2. **Check Layout Section**
   - [ ] Verify layout type displays (e.g., "grid", "flex")
   - [ ] Verify sections list shows all sections
   - [ ] Verify columns display if defined
   - [ ] Verify breakpoints display if defined

3. **Check Theme Section**
   - [ ] Verify color palette displays with swatches
   - [ ] Count color swatches (should match theme)
   - [ ] Verify typography settings display
   - [ ] Verify spacing scale displays

4. **Check Components Section**
   - [ ] Verify component grid displays
   - [ ] Verify type badges show (e.g., "Card", "Button")
   - [ ] Verify variant badges if present
   - [ ] Test scrolling if >10 components

5. **Check Accessibility Section**
   - [ ] Verify WCAG level displays
   - [ ] Verify features list displays
   - [ ] Verify contrast ratios display

6. **Compare UI Configs**
   - [ ] Click "Compare" button (if exists)
   - [ ] Select 2 runs from dropdowns
   - [ ] Verify side-by-side comparison displays
   - [ ] Check color palette diff (yellow highlight for changes)
   - [ ] Check component comparison
   - [ ] Click "Export JSON"
   - [ ] Verify file downloads with timestamp

#### Test Report Template

```markdown
# CAP-05 User Acceptance Testing Report

**Date**: [Date]  
**Tester**: [Name]  
**Duration**: [Hours]

## Summary
- Total Scenarios: 20
- Passed: X
- Failed: Y
- Blocked: Z

## Phase 1: Orchestration History
- [ ] Run orchestration: PASS/FAIL
- [ ] Browse history: PASS/FAIL
- [ ] Filter by status: PASS/FAIL
- [ ] View historical run: PASS/FAIL
- [ ] Pagination: PASS/FAIL

## Phase 2: Nutrition Label History
- [ ] Generate first label: PASS/FAIL
- [ ] Check history: PASS/FAIL
- [ ] Modify and regenerate: PASS/FAIL
- [ ] Compare versions: PASS/FAIL
- [ ] Export CSV: PASS/FAIL

## Phase 3: Graph Snapshot Viewer
- [ ] Load graph: PASS/FAIL
- [ ] Zoom/pan: PASS/FAIL
- [ ] Select nodes: PASS/FAIL
- [ ] Empty state: PASS/FAIL

## Phase 4: UI Metrics Dashboard
- [ ] Load dashboard: PASS/FAIL
- [ ] Layout section: PASS/FAIL
- [ ] Theme section: PASS/FAIL
- [ ] Components section: PASS/FAIL
- [ ] Accessibility section: PASS/FAIL
- [ ] Compare configs: PASS/FAIL

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

#### Acceptance Criteria
- [ ] All 20 test scenarios executed
- [ ] Test report created with pass/fail status
- [ ] Issues documented with severity (critical, high, medium, low)
- [ ] Regression bugs filed if found
- [ ] Sign-off from product owner

---

## Priority 4: CAP-04 Implementation (SHORT TERM)

### Task: Memory & Performance Optimization

**Effort**: 22 hours (~3 days)  
**Priority**: P1 (High)  
**Status**: 🔴 Not started (blocked by scoping)  
**Owner**: TBD  
**Dependency**: Complete Priority 2 (CAP-04 scoping)

#### Implementation Order

**Week 1 (Nov 19-21) - Critical Path**

1. **Task 4.1: Memory Profiling** (3h)
   - Install memory-profiler: `pip install memory-profiler`
   - Profile each agent during orchestration
   - Document peak memory per agent
   - Create memory report

2. **Task 4.2: Caching Strategy** (2h)
   - Design cache schema (density_map, cost_map, ingredient_data)
   - Choose cache backend (Redis vs in-memory)
   - Define TTL and eviction policy

3. **Task 4.3: Implement Caching** (4h)
   - Add cache to RecipeEngineer (ingredient lookups)
   - Add cache to ScalingCalculator (density/cost maps)
   - Add cache warming on startup
   - Test cache hit/miss rates

4. **Task 4.4: Backpressure Handler** (3h)
   - Create orchestration queue (max 3 concurrent)
   - Add request queueing logic
   - Return 429 (Too Many Requests) if queue full
   - Test with 10 concurrent requests

**Week 2 (Nov 22-25) - Monitoring & Validation**

5. **Task 4.5: Prometheus Metrics** (3h)
   - Install prometheus-client: `pip install prometheus-client`
   - Export orchestration_duration_ms counter
   - Export memory_mb gauge
   - Export error_rate counter
   - Add /metrics endpoint

6. **Task 4.6: Memory Budget Enforcement** (2h)
   - Add memory check before each agent run
   - Reject request if peak >600MB
   - Log memory violations
   - Test with large formulations

7. **Task 4.7: Latency Monitoring** (2h)
   - Add per-agent latency tracking
   - Log if agent exceeds target (Recipe: 800ms, Calc: 500ms, etc.)
   - Add latency histogram metrics
   - Configure alerting thresholds

8. **Task 4.8: Load Testing** (3h)
   - Write load test script (100 concurrent orchestrations)
   - Run load test, measure p50/p95/p99 latency
   - Verify memory stays <600MB peak
   - Document performance report

#### Acceptance Criteria
- [ ] Memory profiling report shows per-agent usage
- [ ] Caching reduces ingredient lookups by 80%
- [ ] Backpressure handler limits to 3 concurrent runs
- [ ] Prometheus /metrics endpoint returns data
- [ ] Memory violations logged and rejected
- [ ] Per-agent latency tracked in logs
- [ ] Load test passes without OOM or timeouts
- [ ] Performance report published

---

## Priority 5: Testing Infrastructure (MID TERM)

### Task: Automated Test Suite

**Effort**: 8 hours  
**Priority**: P2 (Medium)  
**Status**: 🟡 Backend tests exist, frontend tests needed  
**Owner**: TBD

#### Tasks

1. **Frontend Unit Tests** (4h)
   - Install Vitest: `npm install -D vitest @testing-library/react`
   - Write tests for OrchestrationHistoryBrowser
   - Write tests for NutritionLabelHistory
   - Write tests for GraphSnapshotViewer
   - Write tests for UIMetricsDashboard
   - Target: 80% code coverage

2. **Integration Tests** (2h)
   - Install Playwright: `npm install -D @playwright/test`
   - Write E2E test for orchestration flow
   - Write E2E test for nutrition label flow
   - Write E2E test for history browsing

3. **Performance Tests** (2h)
   - Install k6: `choco install k6`
   - Write load test script (50 concurrent users)
   - Test orchestration endpoint latency
   - Test nutrition endpoint latency
   - Generate performance report

#### Acceptance Criteria
- [ ] Frontend unit tests with 80% coverage
- [ ] E2E tests pass in CI/CD
- [ ] Performance tests document p95 latencies
- [ ] All tests automated in package.json scripts

---

## Priority 6: Documentation (MID TERM)

### Task: Comprehensive Documentation

**Effort**: 4 hours  
**Priority**: P2 (Medium)  
**Status**: 🟡 Partial, needs cleanup  
**Owner**: TBD

#### Tasks

1. **Update CAP Documents** (1h)
   - Add CAP-05 completion summary to all phase docs
   - Create CAP-04 completion doc (after implementation)
   - Update CAP-03 with FDC validation notes

2. **Deployment Guide** (1h)
   - Document environment variables
   - Document Neo4j setup
   - Document Ollama setup
   - Document production checklist

3. **User Manual** (1h)
   - Document orchestration history features
   - Document nutrition label history features
   - Document graph viewer usage
   - Document UI dashboard features
   - Add screenshots

4. **Demo Videos** (1h)
   - Record orchestration flow (5 min)
   - Record nutrition label flow (3 min)
   - Record history browsing (3 min)
   - Upload to docs or YouTube

#### Acceptance Criteria
- [ ] All CAP documents updated and consistent
- [ ] Deployment guide tested by new developer
- [ ] User manual covers all CAP-05 features
- [ ] Demo videos published and linked in README

---

## Timeline Summary

| Week | Priority | Tasks | Effort | Target Completion |
|------|----------|-------|--------|-------------------|
| Nov 18-19 | P1 | CAP-03 FDC Validation | 2h | Nov 19 EOD |
| Nov 19-20 | P1 | CAP-04 Scoping | 2h | Nov 20 EOD |
| Nov 19-21 | P1 | CAP-05 UAT | 4h | Nov 21 EOD |
| Nov 19-25 | P1 | CAP-04 Implementation | 22h | Nov 25 EOD |
| Nov 22-29 | P2 | Testing Infrastructure | 8h | Nov 29 EOD |
| Nov 22-29 | P2 | Documentation Cleanup | 4h | Nov 29 EOD |

**Total Remaining Effort**: 42 hours (~5.5 days @ 8h/day)

---

## Success Metrics

### CAP-03 Complete
- [x] 8/9 tasks done
- [ ] FDC validation complete (Task 3.7.1)
- [ ] Status updated to DN

### CAP-04 Complete
- [ ] 8 tasks defined
- [ ] Memory profiling complete
- [ ] Caching implemented
- [ ] Backpressure handler working
- [ ] Prometheus metrics exported
- [ ] Load test passed

### Testing Complete
- [ ] Frontend unit tests >80% coverage
- [ ] E2E tests passing
- [ ] Performance benchmarks documented

### Documentation Complete
- [ ] All CAP docs updated
- [ ] Deployment guide published
- [ ] User manual published
- [ ] Demo videos recorded

### System Ready for Production
- [ ] All CAPs 100% complete
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance validated
- [ ] Deployment checklist complete

---

## Risk Mitigation

### Risk: FDC API Key Delayed
- **Mitigation**: Start CAP-04 scoping in parallel, mark CAP-03 as blocked
- **Fallback**: Use mock FDC data for testing

### Risk: CAP-04 Takes Longer Than Estimated
- **Mitigation**: Break into smaller tasks, deliver incrementally
- **Fallback**: Defer Task 4.8 (load testing) to after deployment

### Risk: UAT Finds Critical Bugs
- **Mitigation**: Allocate 4h buffer for bug fixes
- **Fallback**: Deploy with known non-critical bugs, fix in v2

---

## Next Steps

### Today (Nov 18)
1. Review this action plan
2. Assign owners to Priority 1 tasks
3. Obtain USDA FDC API key

### Tomorrow (Nov 19)
1. Complete CAP-03 FDC validation (2h)
2. Start CAP-04 scoping (2h)
3. Begin UAT for CAP-05 (2h)

### This Week (Nov 19-22)
1. Complete CAP-04 scoping and start implementation
2. Finish UAT for CAP-05
3. Fix any critical bugs found in testing

### Next Week (Nov 25-29)
1. Complete CAP-04 implementation
2. Run load tests and performance validation
3. Update all documentation
4. Prepare for deployment

---

**Document Version**: 1.0  
**Last Updated**: November 18, 2025  
**Next Review**: November 19, 2025 (after CAP-03 completion)
