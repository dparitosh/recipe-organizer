# Formulation Graph Studio - Product Requirements Document

An enterprise-grade Food & Beverage formulation management platform that integrates PLM (Product Lifecycle Management), SAP MDG (Master Data Governance), Neo4j graph databases, and USDA FDC nutritional data to provide comprehensive recipe development, BOM configuration, and cost/yield optimization.

**Experience Qualities**:
1. **Professional** - Enterprise-level tools adhering to TCS brand standards with production-ready integrations and calculations suitable for F&B manufacturing
2. **Trustworthy** - Clear, accessible interface following TCS design language that conveys reliability and corporate excellence
3. **Integrated** - Seamless connections to external systems (Neo4j, PLM, SAP MDG) with real-time data synchronization

**Complexity Level**: Complex Application (advanced functionality, accounts)
  - Multi-system integration with Neo4j graph database, PLM for material master data, SAP MDG for enterprise data governance, plus advanced calculation engines for yield, cost, scaling, and byproduct optimization

## Essential Features

### Formulation Management
- **Functionality**: Create, edit, and manage F&B formulations with ingredients, percentages, and metadata
- **Purpose**: Central repository for all product recipes with version control and approval workflows
- **Trigger**: Click "New Formulation" or select existing formulation
- **Progression**: Create formulation → Add ingredients with quantities/percentages → Set function (base, flavor, preservative) → Validate total equals 100% → Save
- **Success criteria**: All ingredients sum to 100%, formulation persists across sessions, multi-version support

### BOM Configuration (ENHANCED)
- **Functionality**: Comprehensive Bill of Materials configurator with three-pane interface: ingredient tree view, process step editor, and calculation summary with yield and byproduct visualization
- **Purpose**: Connect formulations to production requirements with detailed component management, multi-step process tracking, and real-time cost/yield calculations
- **Trigger**: Select formulation and click "Create BOM" or select existing BOM from tab
- **Progression**: 
  - **Component Management**: Create BOM → Add components with dynamic tree view organized by phase (procurement/production/packaging) → Edit quantity, unit, cost, and phase inline → Remove components → Validate component data with inline warnings
  - **Process Step Configuration**: Add process steps with sequential ordering → Define name, description, duration, temperature, equipment → Configure yield parameters (input quantity, output quantity, waste) → Track efficiency with automatic yield percentage calculation → Display warnings for steps with >20% loss → Edit steps with expandable detail panel
  - **Real-time Calculation**: Click Calculate to compute → Overall yield percentage with progress visualization → Material cost, processing cost, overhead cost breakdown → Cost per unit calculation → Waste and byproduct tracking with quantity → Visual summary with charts and badges → Export calculation results
- **Success criteria**: 
  - Dynamic component tree organized by phase with inline editing
  - Process steps sequenced correctly with yield tracking
  - Inline validation showing rounding errors and high loss warnings
  - Real-time calculation preview with cost breakdown and yield chart
  - Three-pane layout: left (components), center (process), right (calculations)
  - Responsive design with collapsible sections for mobile
  - Persistent BOM storage linked to formulation
  - Export BOM and calculation results

### Calculation Engine Suite (ENHANCED)
- **Functionality**: Comprehensive deterministic calculation engine for formulation scaling, yield computation, cost analysis, and nutrition aggregation
- **Purpose**: Production planning with precise scaling from 100g basis to batch sizes (e.g., 10,000 L), accounting for losses, density conversions, and plant constraints
- **Trigger**: Select formulation and open calculation panel
- **Progression**: 
  - **Scaling with Density**: Input target batch size and unit (kg/L/gal) → Engine converts mass↔volume using ingredient density map → Apply plant rounding constraints → Generate scaled ingredient list with volume equivalents
  - **Yield Chain Computation**: Define loss models per step (process/evaporation/moisture/transfer) → Engine computes step-by-step yields → Track cumulative yield through production → Identify high-loss steps → Calculate actual vs theoretical output
  - **Plant Constraint Rounding**: Define rounding rules by ingredient pattern and quantity thresholds → Engine applies intelligent rounding based on equipment precision → Respect min/max batch sizes → Account for equipment capacity limitations
  - **Cost Rollup**: Calculate raw materials, labor (from process time), overhead, packaging, energy, shipping → Aggregate total cost and cost per unit → Include byproduct value recovery → Compute net cost and profitability metrics
  - **Nutrition Aggregation**: Collect nutrition data from all ingredients → Scale based on rounded quantities → Normalize to per-100g basis → Aggregate macros, vitamins, minerals → Generate complete nutritional profile
  - **Byproduct Analysis**: Track waste streams from yield chain → Categorize by type (waste/recyclable/saleable/hazardous) → Calculate disposal costs and recovery value → Suggest optimization opportunities
- **Success criteria**: 
  - Accurate scaling with density conversion (±0.1% precision)
  - Complete yield chain with cumulative loss tracking
  - Intelligent rounding respecting plant constraints
  - Comprehensive cost breakdown including all factors
  - Accurate nutritional aggregation normalized to 100g
  - Efficiency score (0-100) calculated from yield, cost, and warnings
  - Support for batch comparisons and scenario analysis
  - Export results to CSV/JSON

### Graph Visualization (Cytoscape)
- **Functionality**: Interactive network graph showing formulation-ingredient-nutrient relationships
- **Purpose**: Visual exploration of complex ingredient dependencies and alternatives
- **Trigger**: Click "Generate Graph" or "Load from Neo4j"
- **Progression**: Generate/load graph data → Display nodes (formulations, ingredients, nutrients, processes) with color coding → Show relationships (CONTAINS, DERIVED_FROM, ENRICHES, ALTERNATIVE) → Interactive pan/zoom → Select nodes for details → Apply different layouts (hierarchical, force-directed, circular)
- **Success criteria**: Clear visual hierarchy, responsive interactions, multiple layout algorithms, export as image/JSON

### Relationship Graph Viewer (ENHANCED)
- **Functionality**: Comprehensive Cytoscape-based interactive graph visualization for recipe, material, plant, and order relationships with advanced filtering, search, and lineage tracking
- **Purpose**: Enterprise-level visualization of complex multi-entity relationships (Ingredients, Recipes, Master Recipes, Manufacturing Recipes, Plants, Sales Orders) with real-time filtering and lineage path highlighting
- **Trigger**: Navigate to "Relationships" tab or click "View Relationship Graph" from welcome screen
- **Progression**: 
  - **Initial Load**: Click "Load Graph Data" → Query Neo4j for relationship data → Display comprehensive graph with 6 node types and 3 edge types → Automatic hierarchical layout
  - **Node Types**: Ingredient (circle), Recipe (rounded rectangle), MasterRecipe (hexagon), ManufacturingRecipe (rounded hexagon/cog), Plant (diamond/pin), SalesOrder (tag) - each with distinct colors and shapes
  - **Edge Types**: uses (solid green), derived_from (dashed blue), produces (solid orange) with distinct visual styles
  - **Search**: Type in search bar → Real-time highlighting of matching nodes → Dimmed non-matching nodes → Clear button to reset
  - **Filtering**: Open filter panel → Select node type filter (Ingredient/Recipe/etc.) → Select edge type filter (uses/derived_from/produces) → Apply multiple filters → Clear all filters button
  - **Layout Options**: Choose from 5 layouts (Hierarchical, Force-Directed, Circular, Concentric, Grid) → Smooth animated transition between layouts
  - **Node Selection**: Click node → Right panel displays full node details and properties → Automatic lineage path highlighting (predecessors + successors) → Lineage path list in info panel → Visual highlighting with distinct colors → Click background to deselect and clear highlights
  - **Zoom/Pan**: Mouse wheel to zoom (0.2x to 4x) → Drag to pan → Zoom in/out buttons → Fit to view button
  - **Tooltips**: Hover over node → Instant tooltip with node name and type → Follows mouse cursor
  - **Info Panel**: Node Info tab shows selected node properties, type badge, lineage path → Legend tab shows all node types with icons and colors, edge types with line styles, interaction guide
  - **Export**: Export current view as PNG image (2x resolution) → Export graph data as JSON
- **Success criteria**: 
  - All 6 node types render with correct shapes and colors
  - All 3 edge types display with proper styling (solid/dashed/dotted)
  - Search highlights nodes in real-time with dimming effect
  - Filters work independently and in combination
  - Lineage highlighting shows full predecessor/successor chain
  - Right panel displays complete node metadata
  - Smooth layout transitions (500ms animation)
  - Zoom range 0.2x-4x with smooth animations
  - Tooltips appear instantly on hover with correct positioning
  - Legend shows all node/edge types accurately
  - PNG export captures full graph at high resolution
  - JSON export includes all nodes, edges, and metadata
  - Responsive design: 2-column on desktop (graph + panel), stacked on mobile
  - Performance: Handles 200+ nodes smoothly with 60fps interactions

### Neo4j Integration (ENHANCED - CONFIGURABLE)
- **Functionality**: Configurable Neo4j connection with credential management, test connectivity, toggle between mock/real mode, Neo4j Driver for direct database access, and support for GenAI plugin natural language queries
- **Purpose**: Flexible database integration supporting both development (mock mode) and production (real Neo4j connection) with secure credential storage, utilizing official Neo4j JavaScript driver for optimal performance
- **Trigger**: Open Integrations panel → Configure Neo4j credentials → Toggle mock mode on/off → Execute Cypher queries or natural language queries (with GenAI plugin)
- **Progression**: 
  - **Configuration**: Open Neo4j config panel → Enter connection details (URI: neo4j+s://2cccd05b.databases.neo4j.io, username: neo4j, password: tcs12345, database: neo4j) → Test connection → Save configuration → Toggle mock mode switch
  - **Mock Mode**: Enable mock mode → Use simulated data for all operations → No external connection required → Instant responses → Consistent test data
  - **Real Mode (Neo4j Driver)**: Disable mock mode → Connect to configured Neo4j instance using official neo4j-driver package → Execute actual Cypher queries → Fetch live graph data → Handle connection errors gracefully → Automatic session management and connection pooling
  - **Query Execution**: Write Cypher query → Execute against Neo4j (mock or real) → Display nodes and relationships → Show execution metadata → Export results
  - **GenAI Plugin Support**: When GenAI plugin is available on Neo4j instance → Enable natural language queries → Convert natural language to Cypher → Execute generated queries → Provide query explanation
  - **Status Indicator**: System status panel shows current mode (Mock Mode/Connected/Disconnected) with color coding → Yellow for mock, green for connected, red for disconnected → Shows connection URI and database name
- **Success criteria**: 
  - Persistent credential storage using useKV
  - Test connection validates credentials before saving
  - Show/hide password toggle for security
  - Seamless switching between mock and real modes
  - Real queries use official Neo4j driver with proper session management
  - Connection pooling and automatic reconnection
  - Clear connection status indicators
  - Error handling with helpful messages
  - Valid Cypher execution in both modes
  - Export results functionality
  - GenAI plugin detection and natural language query support
  - Driver version: neo4j-driver 5.x or 6.x (latest)

### PLM Integration
- **Functionality**: Search and sync material master data from PLM system
- **Purpose**: Access specifications, regulatory info, supplier data for ingredients
- **Trigger**: Search PLM materials by keyword
- **Progression**: Enter search term → Query PLM API → Display materials with specs → View certifications, allergens, supplier info → Import to formulation
- **Success criteria**: Fast search, complete material data, regulatory compliance indicators, mock data available

### SAP MDG Integration
- **Functionality**: Access SAP Master Data Governance for enterprise material management
- **Purpose**: Ensure formulations align with SAP material master, costing, and procurement data
- **Trigger**: Search SAP MDG materials
- **Progression**: Search by material number/description → View MDG material details (plant, storage, valuation class, cost) → Validate material → Sync to/from SAP → Handle errors gracefully
- **Success criteria**: Complete MDG material view, cost data synchronized, validation before sync, batch operations

### FDC Nutritional Data
- **Functionality**: Link ingredients to USDA FDC database for nutritional analysis
- **Purpose**: Automatic nutritional profiling and compliance with labeling requirements
- **Trigger**: Add ingredient with FDC ID or search FDC
- **Progression**: Search USDA FDC → Select food item → Link to ingredient → Import nutrients → Calculate formulation nutritionals → Generate nutrition facts
- **Success criteria**: Accurate nutrient data, automatic calculations, serving size conversions

## Edge Case Handling

- **Empty Formulation** - Show empty state with guidance to add ingredients
- **Percentage Not 100%** - Warning badge showing current total, prevent approval if not valid
- **Missing Cost Data** - Calculate with available data, show warnings for missing costs
- **API Failures** - Graceful degradation to mock data, retry logic, clear error messages
- **Neo4j Connection Issues** - Automatic fallback to mock mode on connection failure, connection test with timeout, clear error messages, retry mechanism
- **Invalid Neo4j Credentials** - Test connection before saving, show validation errors, prevent saving invalid configs
- **Large Formulations** - Pagination for ingredient lists, virtual scrolling for performance
- **Concurrent Edits** - Last-write-wins with timestamp tracking, future: optimistic locking
- **Invalid Cypher** - Syntax error display, example queries provided, mock mode always accepts valid syntax
- **Network Timeouts** - Loading states, timeout after 30s, retry button
- **Unit Conversions** - Handle kg/g/lb/oz and L/ml/gal conversions automatically
- **Password Security** - Passwords stored in useKV (browser storage), show/hide toggle, never logged or exposed in UI

## Design Direction

The design follows TCS (Tata Consultancy Services) brand standards—professional, trustworthy, and enterprise-grade with a clean, modern aesthetic. The interface embraces TCS's signature blue color palette, conveying reliability and corporate excellence. Light theme with crisp whites and strategic use of TCS blue creates a sophisticated, accessible interface suitable for enterprise environments.

## Color Selection

TCS-aligned color palette optimized for professional enterprise applications with accessible contrast ratios and clear visual hierarchy.

- **Primary Color**: TCS Blue (oklch(0.50 0.16 255)) - The signature TCS brand color representing trust, professionalism, and enterprise excellence. Used for primary actions, headers, and key interactive elements.
- **Secondary Colors**: TCS Navy (oklch(0.38 0.14 255)) for depth and hierarchy, Light Blue (oklch(0.88 0.04 220)) for subtle backgrounds and accents
- **Accent Color**: Warm Accent (oklch(0.65 0.14 35)) - Strategic highlights for selected states and important notifications
- **Background**: Clean White (oklch(0.98 0.005 240)) with subtle neutral tint for professional appearance
- **Node Type Colors** (maintaining differentiation while aligning with TCS palette):
  - Formulation: TCS Blue (oklch(0.50 0.16 255))
  - Ingredient: Deep Blue (oklch(0.48 0.14 260))
  - Nutrient: Warm Accent (oklch(0.65 0.14 35))
  - Process: Purple-Blue (oklch(0.52 0.12 280))
  - Supplier: Teal (oklch(0.55 0.12 200))
  - Recipe: TCS Blue (oklch(0.50 0.16 255))
  - MasterRecipe: Bright Blue (oklch(0.58 0.14 240))
  - ManufacturingRecipe: Deep Purple (oklch(0.48 0.12 300))
  - Plant: Teal (oklch(0.55 0.12 200))
  - SalesOrder: Warm Accent (oklch(0.65 0.14 35))
- **Status Colors**:
  - Success/Active: Success Green (oklch(0.55 0.16 145))
  - Warning: Warning Orange (oklch(0.65 0.14 35))
  - Error/Inactive: Error Red (oklch(0.55 0.22 25))
  - Draft: Neutral Gray (oklch(0.50 0.01 240))
- **Foreground/Background Pairings**:
  - Background (oklch(0.98 0.005 240)): Dark text (oklch(0.20 0.015 240)) - Ratio 14.2:1 ✓
  - Card (oklch(1 0 0)): Dark text (oklch(0.20 0.015 240)) - Ratio 15.8:1 ✓
  - Primary (oklch(0.50 0.16 255)): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓
  - Secondary (oklch(0.38 0.14 255)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Accent (oklch(0.88 0.04 220)): Dark text (oklch(0.20 0.015 240)) - Ratio 11.5:1 ✓

## Font Selection

Typography emphasizes readability of technical data, tabular numbers for financial/nutritional values, and clear hierarchy for complex interfaces.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/20px/tight tracking with TCS branding
  - H2 (Section Headers): Inter SemiBold/18px/normal tracking - "Calculation Engine"
  - H3 (Subsections): Inter SemiBold/14px/normal tracking - "Ingredients", "Process Steps"
  - Body (Labels): Inter Regular/14px/1.5 line-height for form labels and descriptions
  - Data (Values): Inter Medium/14px/tabular-nums for costs, percentages, quantities
  - Code (IDs/Queries): JetBrains Mono/13px for material IDs, Cypher queries
  - Caption: Inter Regular/12px for metadata, timestamps, system status

## Animations

Professional, purposeful animations that reinforce TCS's commitment to quality and attention to detail without being distracting.

- **Purposeful Meaning**: Smooth tab transitions, calculation results fade gracefully, graph layouts animate over 400ms for clarity, loading states provide feedback, all animations respect user preferences
- **Hierarchy of Movement**: Critical data updates (cost calculations) are immediate with subtle fade-in; UI transitions are 200ms with ease-out curves; graph layouts animate smoothly; hover states use subtle scale and shadow transformations

## Component Selection

- **Components**:
  - Card (formulation editor, calculation panels, material listings)
  - Tabs (switch between calculations/integrations, yield/cost/scale views)
  - Input (quantities, percentages, search queries, numeric parameters)
  - Select (ingredient function, formulation status, unit selection)
  - Button (primary actions, icon buttons for add/remove)
  - Badge (status indicators, percentage totals, validation states)
  - ScrollArea (long ingredient lists, search results, query results)
  - Separator (divide sections within cards)
  - Textarea (Cypher queries, notes)
  - Custom: FormulationGraph (Cytoscape integration), CalculationPanel (multi-tab calculator)

- **Customizations**:
  - Cytoscape graph component with custom node styling per type
  - Ingredient list with inline editing and drag-to-reorder
  - Calculation result cards with breakdown visualizations
  - Integration panels with tabbed API interfaces
  - Node type legend for graph visualization

- **States**:
  - Formulation Status: Draft (gray), Review (amber), Approved (green), Archived (muted)
  - Calculations: Idle, Calculating (spinner with TCS blue), Success (green badge), Warning (amber text), Error (red)
  - Graph Nodes: Default (category color), Hovered (subtle shadow), Selected (TCS blue border + highlight), Active (subtle pulse)
  - API Connections: Connected (green dot), Disconnected (red dot), Loading (animated TCS blue pulse)
  - Validation: Valid (check icon), Invalid (error text), Warning (warning icon)

- **Icon Selection**:
  - Flask (formulation/chemistry)
  - Graph (network visualization)
  - Calculator (calculations)
  - Database (Neo4j, integrations)
  - Plus/Trash (add/remove)
  - MagnifyingGlass (search)
  - Scales (scaling operations)
  - CloudArrowDown (sync/import)
  - Percent (percentage display)
  - ChartBar (analytics)
  - Circle (Ingredient nodes)
  - Square (Recipe nodes)
  - Hexagon (MasterRecipe nodes)
  - Gear (ManufacturingRecipe nodes, settings)
  - MapPin (Plant nodes)
  - Tag (SalesOrder nodes)
  - GitBranch (Relationships tab)
  - Path (Lineage path indicator)
  - FunnelSimple (Filter toggle)
  - ArrowsIn/ArrowsOut (Zoom controls)
  - Camera (Fit to view)
  - DownloadSimple (Export functions)
  - Eye/EyeSlash (Password visibility toggle)
  - CheckCircle (Connection success)
  - Warning (Connection failure, validation issues)

- **Spacing**:
  - Main layout: 6-column grid with 24px gap
  - Cards: p-6 internal padding, rounded-lg borders
  - Form fields: gap-4 between related inputs, gap-6 between sections
  - Ingredient rows: py-3 per item, gap-3 between columns
  - Graph container: h-[500px] with rounded-lg border
  - Sidebar panels: w-96 fixed width on desktop, full-width on mobile

- **Mobile**:
  - Stack layout: formulation editor → graph → calculations in vertical scroll
  - Collapsible ingredient list with expand/collapse
  - Bottom sheet for calculation results
  - Simplified graph with touch gestures (pinch-zoom, pan)
  - Hide integration panel by default, accessible via modal
  - Larger tap targets (44px minimum) for all interactive elements
  - Horizontal scroll for wide tables (BOM components)
