#!/bin/bash

# DEPRECATED - DO NOT USE
# This script removes JSX/JS files which are the PRIMARY files for this project
# Frontend: JavaScript/JSX only (.js/.jsx)
# Backend: Python only (.py)

set -e  # Exit on error

echo "========================================="
echo "⚠️  DEPRECATED SCRIPT - DO NOT USE"
echo "========================================="
echo ""
echo "This script is outdated and will remove the WRONG files."
echo ""
echo "Project Architecture:"
echo "  Frontend: JavaScript/JSX (.js/.jsx files)"
echo "  Backend: Python (.py files)"
echo ""
echo "To remove TypeScript files, use:"
echo "  ./remove-typescript-files.sh"
echo ""
echo "Exiting without making changes..."
exit 1

# OLD DEPRECATED CODE BELOW
: <<'DEPRECATED'

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

# Core files
echo "Removing core duplicate files..."
rm -f src/App.jsx
rm -f src/ErrorFallback.jsx

# Component files
echo "Removing component duplicate files..."
rm -f src/components/SearchBar.jsx
rm -f src/components/Toolbar.jsx
rm -f src/components/EmptyState.jsx

# Layout components
echo "Removing layout duplicate files..."
rm -f src/components/layout/Header.jsx
rm -f src/components/layout/Sidebar.jsx
rm -f src/components/layout/MainContent.jsx

# View components
echo "Removing view duplicate files..."
rm -f src/components/views/GraphView.jsx
rm -f src/components/views/FormulationsView.jsx
rm -f src/components/views/IngestView.jsx
rm -f src/components/views/SettingsView.jsx

# Hook files
echo "Removing hook duplicate files..."
rm -f src/hooks/use-mobile.js

# Lib files
echo "Removing lib duplicate files..."
rm -f src/lib/utils.js
rm -f src/lib/constants.js
rm -f src/lib/api/service.js

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Files removed:"
echo "  - src/App.jsx"
echo "  - src/ErrorFallback.jsx"
echo "  - src/components/SearchBar.jsx"
echo "  - src/components/Toolbar.jsx"
echo "  - src/components/EmptyState.jsx"
echo "  - src/components/layout/*.jsx (3 files)"
echo "  - src/components/views/*.jsx (4 files)"
echo "  - src/hooks/use-mobile.js"
echo "  - src/lib/utils.js"
echo "  - src/lib/constants.js"
echo "  - src/lib/api/service.js"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Verify: npm run dev"
echo "  3. Test all features manually"
echo ""
DEPRECATED
