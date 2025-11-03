#!/bin/bash

# Comprehensive Cleanup Script
# Removes TypeScript files and excessive documentation
# Frontend: JavaScript/JSX only (.js/.jsx)
# Backend: Python only (.py)

set -e

echo "==========================================="
echo "Comprehensive Project Cleanup"
echo "==========================================="
echo ""
echo "This script will:"
echo "  1. Remove TypeScript (.tsx/.ts) files"
echo "  2. Keep JavaScript (.jsx/.js) files"
echo "  3. Remove excessive documentation"
echo "  4. Keep Python backend files"
echo ""

# Confirm before proceeding
read -p "Continue with cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Cleanup cancelled."
    exit 1
fi

echo ""
echo "Starting cleanup..."
echo ""

# Track deleted files
DELETED_COUNT=0

# Function to delete file if it exists
delete_if_exists() {
    if [ -f "$1" ]; then
        rm -f "$1"
        echo "  ✓ Deleted: $1"
        ((DELETED_COUNT++))
    fi
}

# Delete TypeScript files in src/
echo "[1/5] Removing TypeScript core files..."
delete_if_exists "src/App.tsx"
delete_if_exists "src/ErrorFallback.tsx"

# Delete TypeScript files in components/
echo "[2/5] Removing TypeScript component files..."
delete_if_exists "src/components/AIAssistantPanel.tsx"
delete_if_exists "src/components/AIServiceSettings.tsx"
delete_if_exists "src/components/APITester.tsx"
delete_if_exists "src/components/DataImportMapper.tsx"
delete_if_exists "src/components/DataLoaderPanel.tsx"
delete_if_exists "src/components/EmptyState.tsx"
delete_if_exists "src/components/FDCDataIngestionPanel.tsx"
delete_if_exists "src/components/SearchBar.tsx"
delete_if_exists "src/components/Toolbar.tsx"
delete_if_exists "src/components/CalculationEngineInterface.tsx"
delete_if_exists "src/components/ConnectionTester.tsx"
delete_if_exists "src/components/DataExportButton.tsx"
delete_if_exists "src/components/FoodDetailPanel.tsx"
delete_if_exists "src/components/GraphCanvas.tsx"
delete_if_exists "src/components/Neo4jSettings.tsx"
delete_if_exists "src/components/NodeEditor.tsx"
delete_if_exists "src/components/RecipeCard.tsx"
delete_if_exists "src/components/RecipeForm.tsx"
delete_if_exists "src/components/RecipeView.tsx"

# Delete TypeScript files in layout/
echo "[3/5] Removing TypeScript layout files..."
delete_if_exists "src/components/layout/Header.tsx"
delete_if_exists "src/components/layout/MainContent.tsx"
delete_if_exists "src/components/layout/Sidebar.tsx"

# Delete TypeScript files in views/
echo "[4/5] Removing TypeScript view files..."
delete_if_exists "src/components/views/FormulationsView.tsx"
delete_if_exists "src/components/views/GraphView.tsx"
delete_if_exists "src/components/views/IngestView.tsx"
delete_if_exists "src/components/views/SettingsView.tsx"

# Delete duplicate/extra SettingsView files
delete_if_exists "src/components/views/SettingsView-new.tsx"
delete_if_exists "src/components/views/SettingsView2.tsx"

# Delete TypeScript hook files
delete_if_exists "src/hooks/use-mobile.ts"

# Delete TypeScript lib files
delete_if_exists "src/lib/utils.ts"
delete_if_exists "src/lib/constants.ts"
delete_if_exists "src/lib/types.ts"
delete_if_exists "src/lib/foodData.ts"

# Delete test files (not needed for production)
echo "[5/5] Removing test files..."
rm -rf /workspaces/spark-template/src/__tests__ 2>/dev/null || true
delete_if_exists "src/test-setup.ts"

# Delete excessive documentation files
echo "Removing excessive documentation..."
delete_if_exists "AI_ASSISTANT_GUIDE.md"
delete_if_exists "AI_ASSISTANT_QUICK_REFERENCE.md"
delete_if_exists "API_ARCHITECTURE.md"
delete_if_exists "API_DOCUMENTATION.md"
delete_if_exists "API_QUICK_REFERENCE.md"
delete_if_exists "ARCHITECTURE.md"
delete_if_exists "ARCHITECTURE_FIXES_SUMMARY.md"
delete_if_exists "ARCHITECTURE_REVIEW.md"
delete_if_exists "ARCHITECTURE_REVIEW_SUMMARY.md"
delete_if_exists "AUDIT_REPORT.md"
delete_if_exists "BACKEND_IMPLEMENTATION_SUMMARY.md"
delete_if_exists "BACKEND_INTEGRATION.md"
delete_if_exists "BACKEND_INTEGRATION_GUIDE.md"
delete_if_exists "BACKEND_SETUP.md"
delete_if_exists "CLEANUP_ACTIONS.md"
delete_if_exists "CLEANUP_COMPLETE.md"
delete_if_exists "CLEANUP_STATUS.md"
delete_if_exists "CLEANUP_SUMMARY.md"
delete_if_exists "CLEANUP_TYPESCRIPT_ACTION.md"
delete_if_exists "CLEANUP_VERIFICATION.md"
delete_if_exists "COMPLETE_SETUP_GUIDE.md"
delete_if_exists "CONNECTING_BACKEND_SERVICES.md"
delete_if_exists "CONVERSION_COMPLETE.md"
delete_if_exists "CONVERSION_GUIDE.md"
delete_if_exists "CONVERSION_SUMMARY.md"
delete_if_exists "DATA_IMPORT_AND_MOCKUP_REMOVAL.md"
delete_if_exists "DEPLOYMENT_SUMMARY.md"
delete_if_exists "FDC_INTEGRATION_GUIDE.md"
delete_if_exists "FINAL_FIXES_SUMMARY.md"
delete_if_exists "FIXES_APPLIED.md"
delete_if_exists "FIXES_EXECUTED.md"
delete_if_exists "MOCKUP_DATA_DELETION_SUMMARY.md"
delete_if_exists "MOCKUP_MODE_REMOVAL_SUMMARY.md"
delete_if_exists "MOCK_MODE_INFO.md"
delete_if_exists "NEO4J_ARCHITECTURE.md"
delete_if_exists "PRE_DEPLOYMENT_CHECKLIST.md"
delete_if_exists "README_NEW.md"
delete_if_exists "REVIEW_COMPLETE.md"
delete_if_exists "START_HERE.md"
delete_if_exists "TESTING_GUIDE.md"
delete_if_exists "TS_TO_JS_MASTERLIST.md"
delete_if_exists "TYPESCRIPT_CLEANUP_SUMMARY.md"
delete_if_exists "TYPESCRIPT_MIGRATION.md"
delete_if_exists "USDA_FDC_SCHEMA.md"
delete_if_exists "CLEANUP_EXECUTION_GUIDE.md"
delete_if_exists "PROJECT_STRUCTURE_NOTES.md"
delete_if_exists "AZURE_DEPLOYMENT.md"

# Delete old/deprecated cleanup scripts
echo "Removing old cleanup scripts..."
delete_if_exists "cleanup-duplicates.sh"
delete_if_exists "cleanup-typescript.sh"
delete_if_exists "cleanup.sh"
delete_if_exists "remove-jsx-files.sh"

# Delete test scripts
delete_if_exists "test-backend.sh"

# Delete pids directory if empty or not needed
if [ -d "/workspaces/spark-template/pids" ]; then
    rm -rf /workspaces/spark-template/pids 2>/dev/null || true
    echo "  ✓ Deleted: pids directory"
fi

echo ""
echo "==========================================="
echo "✅ Cleanup Complete!"
echo "==========================================="
echo ""
echo "Summary:"
echo "  - Files deleted: $DELETED_COUNT"
echo "  - Kept: JavaScript/JSX frontend files"
echo "  - Kept: Python backend files"
echo "  - Kept: Essential documentation (README.md, PRD.md)"
echo ""
echo "Project Structure:"
echo "  Frontend: .js/.jsx files only"
echo "  Backend: .py files only"
echo "  UI Components: shadcn (src/components/ui/)"
echo ""
echo "Next steps:"
echo "  1. Test frontend: npm run dev"
echo "  2. Test backend: ./start-backend.sh"
echo "  3. Verify all features work"
echo ""
