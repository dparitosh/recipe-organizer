# Pre-Deployment Checklist

## 🎯 Quick Reference for Deployment Team

This checklist ensures all cleanup actions are completed before production deployment.

> ⚠️ **Current Status:** Phase 1 cleanup is 50% complete. Dark mode CSS has been removed. Duplicate .jsx files still need to be removed.

---

## ⚡ Quick Start

```bash
# 1. Execute cleanup
chmod +x cleanup.sh && ./cleanup.sh

# 2. Verify build
npm run build

# 3. Test application
npm run dev
```

**Time Required:** 30 minutes  
**Risk Level:** Low  
**Impact:** High (code quality improvement)  
**Status:** ⚠️ Manual action required

---

## 📋 Cleanup Progress

### Already Completed ✅
- [x] **Dark Mode CSS Removal** - Removed unused `.dark` theme block from `src/main.css` (33 lines removed)

### Pending Manual Action ⚠️
- [ ] **Remove Duplicate .jsx Files** - Execute cleanup script to remove 15 duplicate files

---

## ✅ Step-by-Step Checklist

### Step 1: Pre-Cleanup Verification
- [ ] Git status is clean (commit any pending changes)
- [ ] You're on the correct branch
- [ ] Node modules are installed (`npm install`)
- [ ] Current codebase builds successfully (`npm run build`)

### Step 2: Execute Cleanup Script
- [ ] Navigate to project root directory
- [ ] Make script executable: `chmod +x cleanup.sh`
- [ ] Run cleanup script: `./cleanup.sh`
- [ ] Confirm deletion when prompted (type 'y')
- [ ] Verify success message displays

**Expected Output:**
```
✅ Cleanup complete!

Files removed:
  - src/App.jsx
  - src/ErrorFallback.jsx
  [... 15 files total ...]
```

### Step 3: Build Verification
- [ ] Run: `npm run build`
- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] No missing module errors
- [ ] Build output looks normal

**Expected Output:**
```
✓ built in [time]ms
```

### Step 4: Runtime Verification
- [ ] Run: `npm run dev`
- [ ] Application starts without errors
- [ ] No console errors in terminal
- [ ] Open browser to application URL

### Step 5: Functional Testing

#### Basic Functionality
- [ ] Application loads successfully
- [ ] No errors in browser console (F12)
- [ ] Header displays correctly
- [ ] Sidebar navigation works

#### View Testing
- [ ] **Dashboard/Graph Tab:** Loads and displays correctly
- [ ] **Formulations Tab:** Can create new formulation
- [ ] **Relationships Tab:** Graph visualization renders
- [ ] **Data Ingestion Tab:** Sample data panel accessible
- [ ] **API Testing Tab:** Endpoint selector works
- [ ] **AI Assistant Tab:** Chat interface displays
- [ ] **Settings Tab:** Configuration panel opens

#### Integration Testing
- [ ] **Backend Status:** Connection indicator displays (green/red/yellow)
- [ ] **Neo4j Toggle:** Mock mode switch functions
- [ ] **Graph Rendering:** Cytoscape canvas displays
- [ ] **Data Persistence:** useKV saves data across refresh
- [ ] **Toast Notifications:** Sonner toasts appear on actions

### Step 6: Import Verification
- [ ] Run: `grep -r "\.jsx" src/`
- [ ] No results found (or only in comments)
- [ ] Run: `grep -r "\.js'" src/`
- [ ] No imports referencing .jsx files

### Step 7: Code Quality Check
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint` (if configured)
- [ ] File structure is clean and organized
- [ ] Only `.tsx` and `.ts` files in codebase

### Step 8: Documentation Review
- [ ] README.md includes cleanup instructions
- [ ] CLEANUP_COMPLETE.md reviewed
- [ ] ARCHITECTURE_REVIEW_SUMMARY.md reviewed
- [ ] All documentation links work

---

## 🚨 Troubleshooting

### Issue: Script Permission Denied
**Solution:**
```bash
chmod +x cleanup.sh
```

### Issue: Build Fails After Cleanup
**Solution:**
```bash
# Clear caches
rm -rf node_modules .vite
npm install
npm run build
```

### Issue: Missing Module Errors
**Check:** Ensure you're not importing from deleted files
```bash
grep -r "from '.*\.jsx'" src/
```

### Issue: Runtime Errors
**Steps:**
1. Open browser console (F12)
2. Check specific error message
3. Verify all imports resolve correctly
4. Clear browser cache and reload

### Issue: TypeScript Errors
**Solution:**
```bash
npx tsc --noEmit
# Review specific errors and fix imports
```

---

## 📊 Expected Results

### Files Removed: 15
- Core: `App.jsx`, `ErrorFallback.jsx`
- Components: `SearchBar.jsx`, `Toolbar.jsx`, `EmptyState.jsx`
- Layout: `Header.jsx`, `Sidebar.jsx`, `MainContent.jsx`
- Views: `GraphView.jsx`, `FormulationsView.jsx`, `IngestView.jsx`, `SettingsView.jsx`
- Hooks: `use-mobile.js`
- Lib: `utils.js`, `service.js`

### Build Time: ~30-60 seconds
### Dev Server Start: ~3-5 seconds
### Application Load: ~2-3 seconds

---

## 🎯 Success Criteria

### All Must Pass ✅
- [ ] Cleanup script executed successfully
- [ ] All 15 files removed
- [ ] Build succeeds without errors
- [ ] Dev server starts without errors
- [ ] All views render correctly
- [ ] No console errors
- [ ] All features functional
- [ ] Data persistence works
- [ ] Backend indicators work
- [ ] Graph visualization renders

### Deployment Ready When:
✅ All checkboxes above are checked  
✅ No errors in console or terminal  
✅ Manual testing completed  
✅ Documentation reviewed

---

## 📁 Quick Links

- **Cleanup Script:** `/workspaces/spark-template/cleanup.sh`
- **Detailed Guide:** [CLEANUP_COMPLETE.md](./CLEANUP_COMPLETE.md)
- **Review Summary:** [ARCHITECTURE_REVIEW_SUMMARY.md](./ARCHITECTURE_REVIEW_SUMMARY.md)
- **Action Items:** [CLEANUP_ACTIONS.md](./CLEANUP_ACTIONS.md)
- **Main README:** [README.md](./README.md)

---

## 🚀 Deployment Commands

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

### Verify Production Build
```bash
# Build and test
npm run build && npm run preview

# Check build size
du -sh dist/

# Verify assets
ls -lh dist/assets/
```

---

## 📝 Post-Deployment Notes

### Document What Changed
- [ ] Update deployment log
- [ ] Note cleanup completion date
- [ ] Record any issues encountered
- [ ] Document resolution steps

### Monitor After Deployment
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Verify all features work
- [ ] Test backend connections

### Follow-Up Tasks
- [ ] Schedule Phase 2 cleanup (health check optimization)
- [ ] Decide on dark mode implementation
- [ ] Plan Phase 3 testing strategy
- [ ] Review documentation with team

---

## ✅ Sign-Off

### Cleanup Completed By:
- **Name:** ________________
- **Date:** ________________
- **Time:** ________________

### Verification Completed By:
- **Name:** ________________
- **Date:** ________________
- **Time:** ________________

### Deployment Approved By:
- **Name:** ________________
- **Date:** ________________
- **Time:** ________________

---

## 🎉 You're Done!

Once all checkboxes are completed and signed off, the application is ready for production deployment.

**Next Steps:**
1. Commit cleanup changes to git
2. Push to remote repository
3. Deploy to production environment
4. Monitor application health
5. Plan Phase 2/3 improvements

---

**Checklist Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Use ✅
