# Cleanup Actions Required

## Overview
This document outlines specific cleanup actions to align the codebase with TypeScript best practices and remove technical debt identified in the architecture review.

---

## ✅ High Priority: Remove Duplicate .jsx Files

### Issue
The project contains duplicate files with both `.jsx` and `.tsx` extensions. Since this is a TypeScript project, only `.tsx` files should be used.

### Files to Remove

```bash
# Core files
src/App.jsx
src/ErrorFallback.jsx

# Component files
src/components/SearchBar.jsx
src/components/Toolbar.jsx
src/components/EmptyState.jsx
src/components/layout/Header.jsx
src/components/layout/Sidebar.jsx
src/components/layout/MainContent.jsx
src/components/views/GraphView.jsx
src/components/views/FormulationsView.jsx
src/components/views/IngestView.jsx
src/components/views/SettingsView.jsx

# Hook files
src/hooks/use-mobile.js

# Lib files
src/lib/utils.js
src/lib/api/service.js
```

### Verification Steps

After removing .jsx files:

1. **Check TypeScript compilation:**
   ```bash
   npm run build
   ```
   Should complete without errors.

2. **Verify no broken imports:**
   Search codebase for any imports referencing `.jsx` files:
   ```bash
   grep -r "\.jsx" src/
   ```
   Should return no results (except in comments).

3. **Test application:**
   ```bash
   npm run dev
   ```
   All features should work as expected.

---

## 🔧 Medium Priority: Remove Unused Dark Mode Theme

### Option 1: Remove Dark Mode (Recommended for Simplicity)

**File:** `src/main.css`

**Action:** Remove the entire `.dark` theme block (lines 72-104)

```css
/* REMOVE THIS BLOCK: */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... rest of dark theme ... */
}
```

**Reason:** PRD states "Do not implement dark mode unless explicitly requested" and no theme toggle is currently implemented.

### Option 2: Implement Dark Mode Toggle (Optional Enhancement)

If dark mode is desired, implement theme switching:

1. **Update App.tsx:**
   ```typescript
   import { ThemeProvider } from 'next-themes'
   
   function App() {
     return (
       <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
         {/* ... existing app content ... */}
       </ThemeProvider>
     )
   }
   ```

2. **Add theme toggle to Header.tsx:**
   ```typescript
   import { useTheme } from 'next-themes'
   import { Moon, Sun } from '@phosphor-icons/react'
   
   export function Header() {
     const { theme, setTheme } = useTheme()
     
     return (
       <header>
         {/* ... existing header content ... */}
         <Button
           variant="ghost"
           size="icon"
           onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
         >
           {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
         </Button>
       </header>
     )
   }
   ```

**Recommendation:** Remove dark mode theme unless specifically requested by stakeholders.

---

## ⚡ Medium Priority: Optimize Backend Health Check

### Issue
Backend health check runs every 30 seconds regardless of connection state, wasting resources when disconnected.

### Solution: Implement Exponential Backoff

**File:** `src/components/layout/Header.tsx`

**Replace the health check logic:**

```typescript
import { useState, useEffect, useRef } from 'react'

export function Header({ onMenuClick, backendUrl }: HeaderProps) {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [checkInterval, setCheckInterval] = useState(30000) // Start at 30s
  const intervalRef = useRef<number>()

  useEffect(() => {
    const checkBackend = async () => {
      setBackendStatus('checking')
      try {
        const response = await fetch(`${backendUrl}/health`, { 
          signal: AbortSignal.timeout(3000) 
        })
        if (response.ok) {
          setBackendStatus('connected')
          setCheckInterval(30000) // Reset to 30s when connected
        } else {
          setBackendStatus('disconnected')
          // Exponential backoff: 30s → 60s → 120s → max 300s (5min)
          setCheckInterval(prev => Math.min(prev * 2, 300000))
        }
      } catch {
        setBackendStatus('disconnected')
        // Exponential backoff
        setCheckInterval(prev => Math.min(prev * 2, 300000))
      }
    }

    // Initial check
    checkBackend()

    // Set up interval with current check interval
    intervalRef.current = window.setInterval(checkBackend, checkInterval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [backendUrl, checkInterval])

  // ... rest of component
}
```

**Benefits:**
- Reduces unnecessary network requests when backend is down
- Automatically recovers when backend comes back online
- Saves bandwidth and improves performance

---

## 📝 Low Priority: Add JSDoc Comments

### Files to Document

Add JSDoc comments to complex components and functions:

**Priority Files:**
1. `src/components/views/GraphView.tsx` - Complex graph visualization
2. `src/lib/api/service.ts` - API service layer
3. `src/lib/engines/*` - Calculation engines
4. `src/lib/graph/*` - Graph utilities
5. `src/hooks/use-*.ts` - Custom hooks

### Example Template

```typescript
/**
 * Interactive graph visualization component using Cytoscape.js
 * 
 * Displays formulation relationships as a network graph with multiple
 * layout algorithms, filtering, search, and lineage highlighting.
 * 
 * @component
 * @param {GraphViewProps} props - Component props
 * @param {string} props.backendUrl - API endpoint for fetching graph data
 * 
 * @example
 * ```tsx
 * <GraphView backendUrl="http://localhost:8000" />
 * ```
 * 
 * @features
 * - Multiple layout algorithms (hierarchical, force-directed, circular, etc.)
 * - Real-time search and filtering
 * - Node lineage path highlighting
 * - Export to PNG/JSON
 * - Zoom and pan controls
 * - Responsive tooltips
 * 
 * @performance
 * Handles 200+ nodes smoothly with 60fps interactions
 */
export function GraphView({ backendUrl }: GraphViewProps) {
  // ... implementation
}
```

---

## 🧪 Low Priority: Add Unit Tests

### Recommended Test Coverage

**Priority 1: Core Business Logic**
- `src/lib/engines/yield.ts` - Yield calculations
- `src/lib/engines/cost.ts` - Cost calculations
- `src/lib/engines/scaling.ts` - Recipe scaling
- `src/lib/engines/byproduct.ts` - Byproduct calculations

**Priority 2: API Layer**
- `src/lib/api/service.ts` - API service methods
- `src/lib/api/neo4j.ts` - Neo4j client
- `src/lib/api/plm.ts` - PLM integration
- `src/lib/api/mdg.ts` - MDG integration

**Priority 3: Custom Hooks**
- `src/hooks/use-formulation.ts`
- `src/hooks/use-bom.ts`
- `src/hooks/use-calculation.ts`

### Test Setup

The project already has vitest configured. Create test files:

```typescript
// Example: src/lib/engines/yield.test.ts
import { describe, it, expect } from 'vitest'
import { calculateYield } from './yield'

describe('Yield Calculator', () => {
  it('should calculate yield with process loss', () => {
    const ingredients = [
      { id: '1', name: 'Water', quantity: 100, unit: 'kg', percentage: 50, function: 'base' },
      { id: '2', name: 'Sugar', quantity: 100, unit: 'kg', percentage: 50, function: 'sweetener' },
    ]
    
    const result = calculateYield(ingredients, 10) // 10% loss
    
    expect(result.theoreticalYield).toBe(200)
    expect(result.actualYield).toBe(180)
    expect(result.yieldPercentage).toBe(90)
  })

  it('should handle zero ingredients', () => {
    const result = calculateYield([], 0)
    
    expect(result.theoreticalYield).toBe(0)
    expect(result.actualYield).toBe(0)
  })
})
```

**Run tests:**
```bash
npm run test
```

---

## 🛠️ Execution Plan

### Phase 1: Immediate (Before Deployment)
**Estimated Time: 30 minutes**

1. ✅ Remove all `.jsx` files
   ```bash
   # Execute in project root
   rm src/App.jsx
   rm src/ErrorFallback.jsx
   rm src/components/SearchBar.jsx
   rm src/components/Toolbar.jsx
   rm src/components/EmptyState.jsx
   rm src/components/layout/*.jsx
   rm src/components/views/*.jsx
   rm src/hooks/use-mobile.js
   rm src/lib/utils.js
   rm src/lib/api/service.js
   ```

2. ✅ Verify build
   ```bash
   npm run build
   ```

3. ✅ Test application
   ```bash
   npm run dev
   # Manually test all views and features
   ```

### Phase 2: Short-Term (Next Sprint)
**Estimated Time: 4-6 hours**

1. ⚡ Implement exponential backoff for health checks (1 hour)
2. 🔧 Remove or implement dark mode theme (30 minutes)
3. 📝 Add JSDoc to complex components (2-3 hours)
4. ✅ Code review and testing (1 hour)

### Phase 3: Long-Term (Future Iterations)
**Estimated Time: 1-2 weeks**

1. 🧪 Add unit tests for calculation engines (3-4 days)
2. 🧪 Add integration tests for API layer (2-3 days)
3. 🧪 Add E2E tests for critical user flows (3-4 days)
4. 📊 Set up test coverage reporting (1 day)

---

## ✅ Verification Checklist

After completing Phase 1 cleanup:

- [ ] All `.jsx` files removed
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] No import errors in console
- [ ] Application runs without errors (`npm run dev`)
- [ ] All views render correctly
  - [ ] Dashboard/Graph view
  - [ ] Formulations view
  - [ ] Data Ingestion view
  - [ ] Settings view
- [ ] Backend connection status indicator works
- [ ] Neo4j integration functions
- [ ] Graph visualization renders
- [ ] API calls succeed (or fail gracefully)

---

## 📊 Impact Assessment

### Removing .jsx Files
- **Risk:** Low
- **Impact:** High (improves type safety and code consistency)
- **Effort:** Minimal (30 minutes)
- **Recommended:** ✅ Yes, immediately

### Optimizing Health Checks
- **Risk:** Low
- **Impact:** Medium (reduces unnecessary network calls)
- **Effort:** Low (1 hour)
- **Recommended:** ✅ Yes, next sprint

### Dark Mode Decision
- **Risk:** Low
- **Impact:** Low (minor code cleanup)
- **Effort:** Minimal (remove) or Medium (implement)
- **Recommended:** ⚠️ Business decision required

### Adding Tests
- **Risk:** None (only improvements)
- **Impact:** High (improves code reliability)
- **Effort:** High (1-2 weeks)
- **Recommended:** ✅ Yes, but not blocking deployment

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Zero `.jsx` files in codebase
- ✅ Production build succeeds
- ✅ All features working in dev mode
- ✅ No TypeScript errors

### Phase 2 Complete When:
- ✅ Health check uses exponential backoff
- ✅ Dark mode theme removed or implemented
- ✅ Top 10 components have JSDoc
- ✅ Code review passed

### Phase 3 Complete When:
- ✅ 70%+ test coverage on calculation engines
- ✅ 60%+ test coverage on API layer
- ✅ Critical user flows have E2E tests
- ✅ CI/CD pipeline runs tests automatically

---

## 🎉 Cleanup Resources Ready

All cleanup resources have been prepared and are ready for execution:

### Created Files:
- ✅ **cleanup.sh** - Automated cleanup script (executable)
- ✅ **CLEANUP_COMPLETE.md** - Comprehensive completion report
- ✅ **ARCHITECTURE_REVIEW_SUMMARY.md** - Full review summary
- ✅ **PRE_DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment checklist

### Quick Start:
```bash
chmod +x cleanup.sh && ./cleanup.sh && npm run build && npm run dev
```

### Documentation:
- See **CLEANUP_COMPLETE.md** for detailed instructions
- See **PRE_DEPLOYMENT_CHECKLIST.md** for step-by-step guide
- See **ARCHITECTURE_REVIEW_SUMMARY.md** for review findings

---

**Document Version:** 1.1
**Last Updated:** 2024
**Status:** ✅ Resources Ready - Execute cleanup.sh When Ready for Deployment
