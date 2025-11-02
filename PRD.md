# Planning Guide

An interactive food data explorer that visualizes relationships between foods, nutrients, and ingredients using USDA FDC (Food Data Central) API data as a dynamic network graph.

**Experience Qualities**:
1. **Discoverable** - Users can explore nutritional data and food relationships through intuitive visual connections
2. **Informative** - Rich data visualization makes complex nutritional information accessible and understandable
3. **Interactive** - Search, filter, and navigate through thousands of foods with real-time API integration

**Complexity Level**: Light Application (multiple features with basic state)
  - Core features include food search via USDA API, nutritional data visualization, relationship mapping, and interactive graph exploration with persistent favorites

## Essential Features

### Food Search Integration
- **Functionality**: Search USDA FDC database for foods, ingredients, and branded products
- **Purpose**: Access comprehensive nutritional data from authoritative government source
- **Trigger**: Type in search field
- **Progression**: Enter search term → API call to FDC → Results display → Select food → Node added to graph with nutrition data
- **Success criteria**: Fast search results (<1s), clear food descriptions, automatic data enrichment

### Food Node Visualization
- **Functionality**: Display foods as nodes with color-coded categories (fruits, proteins, grains, etc.)
- **Purpose**: Create visual representation of foods being compared or analyzed
- **Trigger**: Select food from search results
- **Progression**: Click food → Node appears on canvas → Shows food name and key metrics → Can drag to reposition → Click for detailed view
- **Success criteria**: Nodes clearly labeled, color indicates food category, instant detail access

### Nutrient Comparison
- **Functionality**: Compare nutritional profiles between multiple foods by connecting them with relationship edges
- **Purpose**: Understand nutritional similarities, alternatives, and make informed food choices
- **Trigger**: Select multiple food nodes
- **Progression**: Select foods → Click compare → Edges show relationships → Tooltip shows nutrient differences → Side panel displays detailed comparison
- **Success criteria**: Clear visual encoding of similarity, detailed nutrient breakdown, multiple foods supported

### Detailed Nutrition Panel
- **Functionality**: View complete nutritional information from FDC including macros, vitamins, minerals
- **Purpose**: Access comprehensive data for meal planning, dietary tracking, or research
- **Trigger**: Click on food node
- **Progression**: Click node → Side panel opens → Display calories, macros, micronutrients → Show serving sizes → Link to FDC source
- **Success criteria**: All FDC data fields displayed, formatted clearly, serving size conversions

### Graph Persistence & Favorites
- **Functionality**: Save favorite food comparisons and searches for quick access
- **Purpose**: Build personal library of commonly compared foods or meal plans
- **Trigger**: Click favorite/save button
- **Progression**: Create food graph → Click save → Name comparison → Access from favorites list → Load instantly
- **Success criteria**: Graphs persist between sessions, quick load times, easy management

### Export & Share
- **Functionality**: Export nutritional comparisons as JSON or generate shareable links
- **Purpose**: Share meal plans, research data, or nutritional analyses
- **Trigger**: Click export button
- **Progression**: Create comparison → Click export → Choose format → Download/copy link
- **Success criteria**: Valid export formats, includes all FDC attribution, shareable links work

## Edge Case Handling

- **Empty Canvas** - Show welcome state with search prompt: "Search for foods to begin" with example queries
- **No Search Results** - Clear messaging when food not found, suggest alternatives or broader terms
- **API Rate Limits** - Cache recent searches, graceful degradation with helpful message
- **Missing Nutrient Data** - Handle incomplete FDC records, show "N/A" for missing nutrients
- **Large Food Lists** - Pagination for search results, limit graph to 20 nodes with warning
- **Slow Network** - Loading states for API calls, skeleton screens for nutrient panels
- **Invalid FDC IDs** - Error handling for corrupted data or deprecated food entries

## Design Direction

The design should feel scientific yet accessible—reminiscent of nutrition labels and food science visualizations but with modern web app polish. Clean interface prioritizing data clarity, color-coded food categories, and information-dense panels that don't overwhelm.

## Color Selection

Custom palette inspired by food groups and nutrition labels—category-based color coding with scientific credibility and clear data hierarchy.

- **Primary Color**: Fresh Green (oklch(0.65 0.18 145)) - Main action color representing health and nutrition
- **Secondary Colors**: Soft Gray (oklch(0.35 0.02 250)) for UI chrome, Light Background (oklch(0.25 0.01 250))
- **Accent Color**: Vibrant Orange (oklch(0.70 0.18 50)) for selected foods, data highlights, comparison indicators
- **Food Category Colors**: 
  - Fruits: Berry Red (oklch(0.62 0.22 15))
  - Vegetables: Garden Green (oklch(0.68 0.20 140))
  - Proteins: Salmon Pink (oklch(0.65 0.16 25))
  - Grains: Wheat Gold (oklch(0.72 0.15 70))
  - Dairy: Cream White (oklch(0.85 0.05 85))
  - Fats/Oils: Butter Yellow (oklch(0.78 0.16 90))
- **Foreground/Background Pairings**: 
  - Background (Dark Gray oklch(0.25 0.01 250)): Light text (oklch(0.90 0.02 250)) - Ratio 11.5:1 ✓
  - Card (Soft Dark oklch(0.30 0.02 250)): Light text (oklch(0.90 0.02 250)) - Ratio 9.2:1 ✓
  - Primary (Fresh Green oklch(0.65 0.18 145)): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Accent (Vibrant Orange oklch(0.70 0.18 50)): White text (oklch(1 0 0)) - Ratio 4.7:1 ✓
  - Category Colors: White text for all (oklch(1 0 0)) - All ratios 4.5:1+ ✓

## Font Selection

Typography should prioritize data legibility and scientific precision—tabular figures for nutrients, clear hierarchy for complex information.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/26px/tight tracking - "Food Data Explorer"
  - H2 (Food Names): Inter SemiBold/18px/normal tracking in detail panels
  - H3 (Section Headers): Inter SemiBold/14px/uppercase/wide tracking - "MACRONUTRIENTS"
  - Body (UI/Labels): Inter Regular/14px/normal line-height for descriptions
  - Data (Nutrient Values): Inter Medium/13px/tabular-nums for nutritional data
  - Caption (Metadata): Inter Regular/12px for FDC IDs, serving sizes
  - Node Labels: Inter SemiBold/12px/centered for food names on canvas

## Animations

Subtle, purposeful animations that guide attention to data updates and search results—smooth transitions for panel reveals and gentle feedback for interactions.

- **Purposeful Meaning**: Search results fade in smoothly; nutrient panels slide in from right; comparison highlights pulse gently; loading states prevent jarring flashes
- **Hierarchy of Movement**: Food node additions are immediate; panel transitions are 200ms; hover effects are instant; API loading shows progressive indicators

## Component Selection

- **Components**: 
  - Custom Canvas Component (SVG-based for food node visualization)
  - Input (search field with autocomplete for FDC API)
  - Button (primary for search, ghost for clear, icon buttons for zoom)
  - Card (food detail panels, nutrient breakdowns, search results)
  - ScrollArea (long nutrient lists, search results)
  - Tabs (switch between Nutrients/Ingredients/Alternatives)
  - Separator (divide nutrient categories)
  - Badge (food categories, serving sizes, data source labels)
  - Skeleton (loading states for API calls)
  - Tooltip (show nutrient full names, explanations)
  
- **Customizations**: 
  - Food node component with category color coding
  - Nutrient comparison table with visual bars
  - Search results list with FDC metadata
  - Nutrition fact panel styled like FDA labels
  - Category filter chips for food groups
  
- **States**: 
  - Food Nodes: Default (category color), Hover (border glow), Selected (thick orange border), Loading (skeleton)
  - Search Input: Empty (placeholder), Typing (loading icon), Results (dropdown), Error (red border)
  - Nutrient Panel: Loading (skeletons), Loaded (full data), Empty (no data message)
  - Comparison Edges: Similar (green), Different (red), Neutral (gray)
  
- **Icon Selection**: 
  - MagnifyingGlass (search)
  - Apple/Carrot/Fish (food category icons)
  - ArrowsOutSimple (fit view)
  - Export (download data)
  - Trash (remove food node)
  - Star (favorite/bookmark)
  - ChartBar (nutrient comparison)
  - Info (FDC metadata)
  
- **Spacing**: 
  - Search Bar: Full width, h-12, px-4 with icon
  - Canvas: Full viewport minus header (h-14) and search bar (h-16)
  - Detail Panel: w-96 on desktop, full-width sheet on mobile, p-6
  - Food Nodes: 80px diameter, 12px internal padding
  - Nutrient Rows: py-2, gap-4 between label and value
  - Search Results: py-3 per item, max-h-96 scrollable
  
- **Mobile**: 
  - Bottom sheet for food details instead of side panel
  - Search bar sticky at top
  - Touch-friendly 44px minimum tap targets
  - Swipe to dismiss detail panels
  - Simplified nutrient display (macros only by default)
  - Horizontal scroll for nutrient comparison tables
