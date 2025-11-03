# Cleanup Scripts Documentation

## Project Architecture

This project follows a clear separation of concerns:
- **Frontend**: JavaScript/JSX only (`.js` and `.jsx` files)
- **Backend**: Python only (`.py` files)
- **UI Components**: shadcn components in TypeScript (preserved in `src/components/ui/`)

## Available Scripts

### ✅ `remove-typescript-files.sh` (RECOMMENDED)
**Use this script to clean up TypeScript files from your frontend code.**

```bash
chmod +x remove-typescript-files.sh
./remove-typescript-files.sh
```

**What it does:**
- Removes all `.ts` and `.tsx` files from your custom components
- Keeps `.js` and `.jsx` files (your main frontend code)
- Preserves structural files (`main.tsx`, `vite.config.ts`)
- Preserves shadcn UI components (`src/components/ui/*.tsx`)
- Keeps all Python backend files

**When to use:** When you've migrated from TypeScript to JavaScript and want to remove old TypeScript files.

---

### ✅ `delete-unwanted-files.sh` (COMPREHENSIVE)
**Complete cleanup including TypeScript files and excessive documentation.**

```bash
chmod +x delete-unwanted-files.sh
./delete-unwanted-files.sh
```

**What it does:**
- Removes all TypeScript files (same as above)
- Removes excessive documentation files
- Removes deprecated cleanup scripts
- Removes test files
- Keeps essential documentation (README.md, PRD.md)

**When to use:** For a thorough cleanup of the entire project.

---

### ❌ `remove-jsx-files.sh` (DEPRECATED - DO NOT USE)
This script is **deprecated** and will exit with an error. It was created incorrectly and would remove your primary frontend files.

---

### ❌ `cleanup.sh` (DEPRECATED - DO NOT USE)
This script is **deprecated** and will exit with an error. It was designed to remove JSX files which are the primary files for this project.

---

### ❌ `cleanup-typescript.sh` (DEPRECATED - DO NOT USE)
This script is **deprecated**. Use `remove-typescript-files.sh` instead.

---

### ❌ `cleanup-duplicates.sh` (DEPRECATED - DO NOT USE)
This script is **deprecated** and will exit with an error. It was designed to remove the wrong files.

---

## Quick Start Guide

### If you want to remove TypeScript files:
```bash
./remove-typescript-files.sh
```

### If you want a complete cleanup:
```bash
./delete-unwanted-files.sh
```

### After cleanup:
1. Test frontend: `npm run dev`
2. Test backend: `./start-backend.sh` (or `start-backend.bat` on Windows)
3. Verify all features work correctly

---

## File Structure After Cleanup

```
/workspaces/spark-template/
├── backend/              # Python backend files (.py)
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn components (.tsx) - PRESERVED
│   │   ├── layout/      # Your layout components (.jsx)
│   │   ├── views/       # Your view components (.jsx)
│   │   └── ...          # Other components (.jsx)
│   ├── lib/             # Utility libraries (.js)
│   ├── hooks/           # React hooks (.js)
│   ├── App.jsx          # Main app component
│   ├── main.tsx         # Vite entry point (structural - PRESERVED)
│   └── index.css        # Styles
├── vite.config.ts       # Vite config (structural - PRESERVED)
├── package.json
└── README.md
```

---

## What Gets Preserved

### Always Preserved:
- All `.jsx` and `.js` files in your components
- All `.py` files in the backend
- `src/main.tsx` (required by Vite)
- `src/vite-end.d.ts` (type definitions)
- `vite.config.ts` (Vite configuration)
- `tsconfig.json` (TypeScript configuration)
- All shadcn UI components (`src/components/ui/*.tsx`)
- Essential documentation (`README.md`, `PRD.md`)

### Always Removed:
- Custom `.tsx` and `.ts` files (not in `ui/` directory)
- Duplicate documentation files
- Old cleanup scripts
- Test files (optional)

---

## Troubleshooting

### "Permission denied" error:
```bash
chmod +x remove-typescript-files.sh
chmod +x delete-unwanted-files.sh
```

### Script removes wrong files:
Make sure you're using `remove-typescript-files.sh` or `delete-unwanted-files.sh`. The other scripts are deprecated and should not be used.

### Need to restore files:
Use git to restore deleted files:
```bash
git checkout -- <file-path>
```

---

## Architecture Summary

| Layer | Technology | File Extensions |
|-------|-----------|----------------|
| Frontend | JavaScript/JSX | `.js`, `.jsx` |
| Backend | Python | `.py` |
| UI Library | shadcn (TypeScript) | `.tsx` (preserved) |
| Config | TypeScript/JavaScript | `.ts`, `.js` (preserved) |

---

## Support

For questions or issues:
1. Check this README
2. Review the script output messages
3. Check the PRD.md for project architecture details
