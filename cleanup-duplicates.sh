#!/bin/bash

# Comprehensive Cleanup Script for Formulation Graph Studio
# Removes all duplicate .jsx and .js files - TypeScript is the standard

set -e  # Exit on error

echo "==========================================="
echo "Formulation Graph Studio - Cleanup Script"
echo "==========================================="
echo ""
echo "Removing duplicate .jsx and .js files..."
echo "TypeScript (.tsx/.ts) files will be retained."
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
