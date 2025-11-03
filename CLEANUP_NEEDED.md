# Files to Delete - Cleanup Summary

## Duplicate JSX Files (Keep only .tsx versions)

### Root src/
- [ ] src/App.jsx (keep App.tsx)
- [ ] src/ErrorFallback.jsx (keep ErrorFallback.tsx)

### src/components/
- [ ] src/components/AIAssistantPanel.jsx
- [ ] src/components/AIServiceSettings.jsx
- [ ] src/components/APITester.jsx
- [ ] src/components/DataImportMapper.jsx
- [ ] src/components/DataLoaderPanel.jsx
- [ ] src/components/EmptyState.jsx
- [ ] src/components/FDCDataIngestionPanel.jsx
- [ ] src/components/SearchBar.jsx
- [ ] src/components/Toolbar.jsx

### src/components/layout/
- [ ] src/components/layout/Header.jsx
- [ ] src/components/layout/MainContent.jsx
- [ ] src/components/layout/Sidebar.jsx

### src/components/views/
- [ ] src/components/views/FormulationsView.jsx
- [ ] src/components/views/GraphView.jsx
- [ ] src/components/views/IngestView.jsx
- [ ] src/components/views/SettingsView.jsx
- [ ] src/components/views/SettingsView-new.tsx (duplicate)
- [ ] src/components/views/SettingsView2.tsx (duplicate)

### src/hooks/
- [ ] src/hooks/use-mobile.js (keep use-mobile.ts)

## Test Files (Not needed for production)
- [ ] src/__tests__/ (entire directory)
- [ ] src/test-setup.ts
- [ ] vitest.config.ts

## Excessive Documentation Files
- [ ] AI_ASSISTANT_GUIDE.md
- [ ] AI_ASSISTANT_QUICK_REFERENCE.md
- [ ] API_ARCHITECTURE.md
- [ ] API_DOCUMENTATION.md
- [ ] API_QUICK_REFERENCE.md
- [ ] ARCHITECTURE.md
- [ ] ARCHITECTURE_FIXES_SUMMARY.md
- [ ] ARCHITECTURE_REVIEW.md
- [ ] ARCHITECTURE_REVIEW_SUMMARY.md
- [ ] AUDIT_REPORT.md
- [ ] BACKEND_IMPLEMENTATION_SUMMARY.md
- [ ] BACKEND_INTEGRATION.md
- [ ] BACKEND_INTEGRATION_GUIDE.md
- [ ] BACKEND_SETUP.md
- [ ] CLEANUP_ACTIONS.md
- [ ] CLEANUP_COMPLETE.md
- [ ] CLEANUP_STATUS.md
- [ ] CLEANUP_SUMMARY.md
- [ ] CLEANUP_TYPESCRIPT_ACTION.md
- [ ] CLEANUP_VERIFICATION.md
- [ ] COMPLETE_SETUP_GUIDE.md
- [ ] CONNECTING_BACKEND_SERVICES.md
- [ ] CONVERSION_COMPLETE.md
- [ ] CONVERSION_GUIDE.md
- [ ] CONVERSION_SUMMARY.md
- [ ] DATA_IMPORT_AND_MOCKUP_REMOVAL.md
- [ ] DEPLOYMENT_SUMMARY.md
- [ ] FDC_INTEGRATION_GUIDE.md
- [ ] FINAL_FIXES_SUMMARY.md
- [ ] FIXES_APPLIED.md
- [ ] FIXES_EXECUTED.md
- [ ] MOCKUP_DATA_DELETION_SUMMARY.md
- [ ] MOCKUP_MODE_REMOVAL_SUMMARY.md
- [ ] MOCK_MODE_INFO.md
- [ ] NEO4J_ARCHITECTURE.md
- [ ] PRE_DEPLOYMENT_CHECKLIST.md
- [ ] README_NEW.md
- [ ] REVIEW_COMPLETE.md
- [ ] START_HERE.md
- [ ] TESTING_GUIDE.md
- [ ] TS_TO_JS_MASTERLIST.md
- [ ] TYPESCRIPT_CLEANUP_SUMMARY.md
- [ ] TYPESCRIPT_MIGRATION.md
- [ ] USDA_FDC_SCHEMA.md

## Cleanup Scripts (No longer needed)
- [ ] cleanup-duplicates.sh
- [ ] cleanup-typescript.sh
- [ ] cleanup.sh
- [ ] test-backend.sh
- [ ] delete-unwanted-files.sh

## Empty/Unnecessary Directories
- [ ] pids/ (if empty or not needed)

## Files to Keep

### Essential Documentation
- README.md (main documentation)
- PRD.md (product requirements)
- AZURE_DEPLOYMENT.md (deployment guide)
- SECURITY.md (security guidelines)
- LICENSE

### Configuration Files
- package.json
- tsconfig.json
- vite.config.ts
- tailwind.config.js
- components.json
- theme.json
- spark.meta.json
- index.html

### Source Code (TypeScript only)
- All .tsx and .ts files
- src/index.css
- src/main.css
- src/main.tsx

### Backend Code
- backend/ directory (all Python FastAPI code)

### Scripts
- setup-backend.bat
- setup-backend.sh
- start-backend.bat
- start-backend.sh

## Summary
Total files to delete: ~85 files
- 22 duplicate .jsx files
- 3 test-related files
- 55+ documentation files
- 5 cleanup scripts
