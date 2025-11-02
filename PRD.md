# Planning Guide

A personal digital cookbook for storing, organizing, and discovering your favorite recipes with beautiful presentation and effortless management.

**Experience Qualities**:
1. **Intuitive** - Finding and adding recipes should feel as natural as flipping through a well-organized cookbook
2. **Elegant** - Visual design evokes the warmth and sophistication of a curated kitchen, making cooking feel inspiring
3. **Efficient** - Quick access to ingredients and instructions while cooking, with minimal friction between steps

**Complexity Level**: Light Application (multiple features with basic state)
  - Core features include recipe creation, editing, viewing, and organization with persistent storage but no complex user accounts or advanced filtering

## Essential Features

### Recipe Creation
- **Functionality**: Users can create new recipes with title, description, ingredients list, and step-by-step instructions
- **Purpose**: Enables users to build their personal digital cookbook
- **Trigger**: Click "Add Recipe" button from main view
- **Progression**: Click Add Recipe → Fill in recipe details form → Add ingredients one by one → Add instruction steps → Save → View new recipe in collection
- **Success criteria**: Recipe persists in storage, appears in recipe list, all data displays correctly

### Recipe Viewing
- **Functionality**: Display full recipe with organized ingredients and numbered instructions
- **Purpose**: Provides clear, readable format for cooking
- **Trigger**: Click on recipe card from main collection
- **Progression**: Browse recipes → Click recipe card → View full details with ingredients and instructions → Return to collection or edit
- **Success criteria**: All recipe data displays clearly, easy to read while cooking, smooth navigation

### Recipe Editing
- **Functionality**: Modify existing recipes including title, ingredients, and instructions
- **Purpose**: Allows users to refine recipes over time
- **Trigger**: Click edit button on recipe detail view
- **Progression**: View recipe → Click edit → Modify any field → Save changes → See updated recipe
- **Success criteria**: Changes persist, UI updates immediately, no data loss

### Recipe Deletion
- **Functionality**: Remove recipes from collection
- **Purpose**: Manage and curate recipe collection
- **Trigger**: Click delete button with confirmation
- **Progression**: View recipe → Click delete → Confirm deletion → Return to collection without deleted recipe
- **Success criteria**: Recipe removed from storage, UI updates, action is reversible via confirmation dialog

### Recipe Organization
- **Functionality**: Browse all recipes in a card-based grid layout
- **Purpose**: Quick visual scanning and access to entire collection
- **Trigger**: Default landing view
- **Progression**: Open app → See all recipes as cards → Click to view details or add new
- **Success criteria**: Recipes display in clean grid, responsive layout, empty state guides new users

## Edge Case Handling

- **Empty State** - Show welcoming illustration and "Add Your First Recipe" prompt when no recipes exist
- **Long Ingredient Lists** - Scrollable area with clear visual separation between ingredients
- **Complex Instructions** - Step numbers with generous spacing for readability during cooking
- **Missing Data** - Graceful handling of optional fields (e.g., description can be blank)
- **Deletion Protection** - Confirmation dialog prevents accidental recipe loss

## Design Direction

The design should feel warm, elegant, and culinary-inspired—evoking the experience of a premium cookbook with generous whitespace, beautiful typography, and subtle interactions. A minimal, content-focused interface that lets recipes shine while providing intuitive organization tools.

## Color Selection

Custom palette inspired by natural kitchen materials and ingredients—warm terracotta, sage green, and cream tones that feel organic and inviting.

- **Primary Color**: Warm Terracotta (oklch(0.62 0.14 35)) - Evokes earthenware and warmth of cooking, used for primary actions and focal points
- **Secondary Colors**: Soft Sage (oklch(0.75 0.05 145)) for subtle backgrounds and cards, Warm Cream (oklch(0.96 0.02 85)) for page background
- **Accent Color**: Deep Olive (oklch(0.45 0.08 140)) for active states, important CTAs, and emphasis on key cooking steps
- **Foreground/Background Pairings**: 
  - Background (Warm Cream oklch(0.96 0.02 85)): Dark Charcoal text (oklch(0.25 0.01 35)) - Ratio 12.1:1 ✓
  - Card (White oklch(1 0 0)): Dark Charcoal text (oklch(0.25 0.01 35)) - Ratio 15.2:1 ✓
  - Primary (Terracotta oklch(0.62 0.14 35)): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Secondary (Soft Sage oklch(0.75 0.05 145)): Dark Charcoal text (oklch(0.25 0.01 35)) - Ratio 9.8:1 ✓
  - Accent (Deep Olive oklch(0.45 0.08 140)): White text (oklch(1 0 0)) - Ratio 7.1:1 ✓
  - Muted (Light Sage oklch(0.88 0.03 145)): Medium Charcoal text (oklch(0.45 0.01 35)) - Ratio 5.5:1 ✓

## Font Selection

Typography should balance sophistication with readability—a refined serif for recipe titles that adds personality, paired with a clean sans-serif for ingredients and instructions that ensures clarity during cooking.

- **Typographic Hierarchy**:
  - H1 (App Title): Playfair Display Bold/32px/tight tracking for elegant header
  - H2 (Recipe Title): Playfair Display SemiBold/28px/normal tracking for recipe names
  - H3 (Section Headers): Inter SemiBold/18px/wide tracking for "Ingredients" and "Instructions"
  - Body (Ingredients/Steps): Inter Regular/16px/relaxed line-height (1.6) for easy scanning
  - Caption (Metadata): Inter Medium/14px/normal for recipe counts and timestamps

## Animations

Subtle, purposeful animations that feel like pages turning in a cookbook—smooth card reveals, gentle transitions between views, and satisfying micro-interactions on buttons without distracting from content.

- **Purposeful Meaning**: Gentle spring animations on cards communicate tactile, physical quality; smooth page transitions maintain spatial context
- **Hierarchy of Movement**: Recipe cards get subtle hover lift (4px); modal dialogs slide up gracefully; ingredient checkboxes have satisfying check animation

## Component Selection

- **Components**: 
  - Card (recipe preview cards with hover effects, custom shadow and border radius)
  - Dialog (full-screen recipe view and edit form, centered with backdrop)
  - Button (primary terracotta for add/save, ghost for cancel, destructive for delete)
  - Input (recipe title and ingredient fields, clean borders)
  - Textarea (description and instruction steps, generous padding)
  - AlertDialog (delete confirmation with clear messaging)
  - ScrollArea (for long ingredient lists and instructions)
  - Badge (optional: for recipe categories or tags in future)
  
- **Customizations**: 
  - Custom recipe card component with image placeholder area
  - Ingredient list with checkbox styling for cooking mode
  - Numbered instruction steps with larger numbers and spacing
  - Empty state illustration component
  
- **States**: 
  - Buttons: Terracotta primary with subtle shadow, lighter on hover, pressed state with scale
  - Input fields: Sage border default, accent border on focus, smooth transitions
  - Cards: Elevated shadow on hover, scale(1.02) transform, smooth spring animation
  
- **Icon Selection**: 
  - Plus (add recipe)
  - Pencil (edit recipe)
  - Trash (delete recipe)
  - X (close dialogs)
  - ChefHat or CookingPot (empty state and branding)
  - ArrowLeft (back navigation)
  
- **Spacing**: 
  - Cards: p-6 with gap-4 for grid (responsive)
  - Forms: gap-6 between fields, gap-4 within field groups
  - Recipe view: p-8 on desktop, p-6 on mobile
  - Ingredients/steps: gap-3 for easy visual scanning
  
- **Mobile**: 
  - Single column card layout on mobile (grid-cols-1)
  - Tablet gets 2 columns (md:grid-cols-2)
  - Desktop gets 3 columns (lg:grid-cols-3)
  - Full-screen dialogs on mobile with sticky header
  - Bottom action buttons on mobile forms, top-right on desktop
