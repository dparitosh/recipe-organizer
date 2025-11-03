#!/bin/bash

# Delete duplicate .jsx files in src/
rm -f /workspaces/spark-template/src/App.jsx
rm -f /workspaces/spark-template/src/ErrorFallback.jsx

# Delete duplicate .jsx files in components/
rm -f /workspaces/spark-template/src/components/AIAssistantPanel.jsx
rm -f /workspaces/spark-template/src/components/AIServiceSettings.jsx
rm -f /workspaces/spark-template/src/components/APITester.jsx
rm -f /workspaces/spark-template/src/components/DataImportMapper.jsx
rm -f /workspaces/spark-template/src/components/DataLoaderPanel.jsx
rm -f /workspaces/spark-template/src/components/EmptyState.jsx
rm -f /workspaces/spark-template/src/components/FDCDataIngestionPanel.jsx
rm -f /workspaces/spark-template/src/components/SearchBar.jsx
rm -f /workspaces/spark-template/src/components/Toolbar.jsx

# Delete duplicate .jsx files in layout/
rm -f /workspaces/spark-template/src/components/layout/Header.jsx
rm -f /workspaces/spark-template/src/components/layout/MainContent.jsx
rm -f /workspaces/spark-template/src/components/layout/Sidebar.jsx

# Delete duplicate .jsx files in views/
rm -f /workspaces/spark-template/src/components/views/FormulationsView.jsx
rm -f /workspaces/spark-template/src/components/views/GraphView.jsx
rm -f /workspaces/spark-template/src/components/views/IngestView.jsx
rm -f /workspaces/spark-template/src/components/views/SettingsView.jsx

# Delete duplicate/extra SettingsView files
rm -f /workspaces/spark-template/src/components/views/SettingsView-new.tsx
rm -f /workspaces/spark-template/src/components/views/SettingsView2.tsx

# Delete duplicate .js hook files
rm -f /workspaces/spark-template/src/hooks/use-mobile.js

# Delete test files
rm -rf /workspaces/spark-template/src/__tests__
rm -f /workspaces/spark-template/src/test-setup.ts

# Delete excessive documentation files
rm -f /workspaces/spark-template/AI_ASSISTANT_GUIDE.md
rm -f /workspaces/spark-template/AI_ASSISTANT_QUICK_REFERENCE.md
rm -f /workspaces/spark-template/API_ARCHITECTURE.md
rm -f /workspaces/spark-template/API_DOCUMENTATION.md
rm -f /workspaces/spark-template/API_QUICK_REFERENCE.md
rm -f /workspaces/spark-template/ARCHITECTURE.md
rm -f /workspaces/spark-template/ARCHITECTURE_FIXES_SUMMARY.md
rm -f /workspaces/spark-template/ARCHITECTURE_REVIEW.md
rm -f /workspaces/spark-template/ARCHITECTURE_REVIEW_SUMMARY.md
rm -f /workspaces/spark-template/AUDIT_REPORT.md
rm -f /workspaces/spark-template/BACKEND_IMPLEMENTATION_SUMMARY.md
rm -f /workspaces/spark-template/BACKEND_INTEGRATION.md
rm -f /workspaces/spark-template/BACKEND_INTEGRATION_GUIDE.md
rm -f /workspaces/spark-template/BACKEND_SETUP.md
rm -f /workspaces/spark-template/CLEANUP_ACTIONS.md
rm -f /workspaces/spark-template/CLEANUP_COMPLETE.md
rm -f /workspaces/spark-template/CLEANUP_STATUS.md
rm -f /workspaces/spark-template/CLEANUP_SUMMARY.md
rm -f /workspaces/spark-template/CLEANUP_TYPESCRIPT_ACTION.md
rm -f /workspaces/spark-template/CLEANUP_VERIFICATION.md
rm -f /workspaces/spark-template/COMPLETE_SETUP_GUIDE.md
rm -f /workspaces/spark-template/CONNECTING_BACKEND_SERVICES.md
rm -f /workspaces/spark-template/CONVERSION_COMPLETE.md
rm -f /workspaces/spark-template/CONVERSION_GUIDE.md
rm -f /workspaces/spark-template/CONVERSION_SUMMARY.md
rm -f /workspaces/spark-template/DATA_IMPORT_AND_MOCKUP_REMOVAL.md
rm -f /workspaces/spark-template/DEPLOYMENT_SUMMARY.md
rm -f /workspaces/spark-template/FDC_INTEGRATION_GUIDE.md
rm -f /workspaces/spark-template/FINAL_FIXES_SUMMARY.md
rm -f /workspaces/spark-template/FIXES_APPLIED.md
rm -f /workspaces/spark-template/FIXES_EXECUTED.md
rm -f /workspaces/spark-template/MOCKUP_DATA_DELETION_SUMMARY.md
rm -f /workspaces/spark-template/MOCKUP_MODE_REMOVAL_SUMMARY.md
rm -f /workspaces/spark-template/MOCK_MODE_INFO.md
rm -f /workspaces/spark-template/NEO4J_ARCHITECTURE.md
rm -f /workspaces/spark-template/PRE_DEPLOYMENT_CHECKLIST.md
rm -f /workspaces/spark-template/README_NEW.md
rm -f /workspaces/spark-template/REVIEW_COMPLETE.md
rm -f /workspaces/spark-template/START_HERE.md
rm -f /workspaces/spark-template/TESTING_GUIDE.md
rm -f /workspaces/spark-template/TS_TO_JS_MASTERLIST.md
rm -f /workspaces/spark-template/TYPESCRIPT_CLEANUP_SUMMARY.md
rm -f /workspaces/spark-template/TYPESCRIPT_MIGRATION.md
rm -f /workspaces/spark-template/USDA_FDC_SCHEMA.md

# Delete cleanup scripts
rm -f /workspaces/spark-template/cleanup-duplicates.sh
rm -f /workspaces/spark-template/cleanup-typescript.sh
rm -f /workspaces/spark-template/cleanup.sh

# Delete test scripts
rm -f /workspaces/spark-template/test-backend.sh

# Delete pids directory if empty or not needed
rm -rf /workspaces/spark-template/pids

echo "Cleanup complete!"
