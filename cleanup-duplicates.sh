#!/bin/bash

# DEPRECATED - DO NOT USE
# This script was designed to remove JSX/JS which are the PRIMARY files
# Frontend: JavaScript/JSX only (.js/.jsx)
# Backend: Python only (.py)

set -e  # Exit on error

echo "==========================================="
echo "⚠️  DEPRECATED SCRIPT - DO NOT USE"
echo "==========================================="
echo ""
echo "This script is outdated and will delete the WRONG files."
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

# Core application files
echo "[1/7] Core application files..."
delete_if_exists "src/App.jsx"
delete_if_exists "src/ErrorFallback.jsx"

# Component files
echo "[2/7] Component files..."
delete_if_exists "src/components/SearchBar.jsx"
delete_if_exists "src/components/Toolbar.jsx"
delete_if_exists "src/components/EmptyState.jsx"

# Layout components
echo "[3/7] Layout components..."
delete_if_exists "src/components/layout/Header.jsx"
delete_if_exists "src/components/layout/Sidebar.jsx"
delete_if_exists "src/components/layout/MainContent.jsx"

# View components
echo "[4/7] View components..."
delete_if_exists "src/components/views/GraphView.jsx"
delete_if_exists "src/components/views/FormulationsView.jsx"
delete_if_exists "src/components/views/IngestView.jsx"
delete_if_exists "src/components/views/SettingsView.jsx"

# Hook files
echo "[5/7] Hook files..."
delete_if_exists "src/hooks/use-mobile.js"

# Library files
echo "[6/7] Library files..."
delete_if_exists "src/lib/utils.js"
delete_if_exists "src/lib/constants.js"

# API files
echo "[7/7] API files..."
delete_if_exists "src/lib/api/service.js"

echo ""
echo "==========================================="
echo "✅ Cleanup Complete!"
echo "==========================================="
echo ""
echo "Summary:"
echo "  - Files deleted: $DELETED_COUNT"
echo "  - TypeScript files retained"
echo ""
echo "Next steps:"
echo "  1. Verify: npm run build"
echo "  2. Test: npm run dev"
echo ""
DEPRECATED
