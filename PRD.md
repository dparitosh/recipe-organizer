# Planning Guide

An interactive graph visualization tool for creating, exploring, and manipulating network diagrams with nodes and edges in real-time.

**Experience Qualities**:
1. **Fluid** - Dragging nodes and creating connections should feel smooth and responsive, like working with physical objects
2. **Exploratory** - The interface encourages experimentation and discovery through intuitive interactions
3. **Powerful** - Despite simplicity, users can create complex network structures effortlessly

**Complexity Level**: Light Application (multiple features with basic state)
  - Core features include node creation, edge connections, drag interactions, and graph manipulation with persistent storage

## Essential Features

### Node Creation
- **Functionality**: Users can add nodes to the canvas by clicking an "Add Node" button or double-clicking the canvas
- **Purpose**: Build the foundation of network graphs
- **Trigger**: Click add button or double-click canvas
- **Progression**: Click Add Node → Node appears at center/cursor → Can immediately drag to position → Click to select/edit label
- **Success criteria**: Nodes appear instantly, are draggable, persist after page reload

### Node Connections
- **Functionality**: Create directed or undirected edges between nodes by dragging from one node to another
- **Purpose**: Visualize relationships and connections in networks
- **Trigger**: Click and drag from source node to target node
- **Progression**: Click node → Drag toward another node → Temporary line follows cursor → Release on target node → Edge created
- **Success criteria**: Edges draw smoothly, follow node positions when dragging, support multiple edges between same nodes

### Interactive Dragging
- **Functionality**: Click and drag nodes to reposition them on canvas
- **Purpose**: Arrange graph layout manually for clarity and aesthetics
- **Trigger**: Mouse down on node, then drag
- **Progression**: Hover node → Cursor changes → Drag node → Connected edges follow in real-time → Release to set position
- **Success criteria**: Smooth 60fps dragging, edges update dynamically, positions persist

### Node Selection & Editing
- **Functionality**: Select nodes to edit labels, change colors, or delete
- **Purpose**: Customize graph appearance and node data
- **Trigger**: Click on node to select
- **Progression**: Click node → Node highlights → Edit panel appears → Change label/color → Update reflects immediately
- **Success criteria**: Clear selection state, instant updates, keyboard support for label editing

### Graph Manipulation
- **Functionality**: Pan and zoom the entire canvas, delete nodes/edges, clear graph
- **Purpose**: Navigate large graphs and manage overall structure
- **Trigger**: Mouse wheel for zoom, middle-click drag for pan, delete key for removal
- **Progression**: Zoom in/out → Graph scales smoothly → Pan → View translates → Select and delete → Element removed with connected edges
- **Success criteria**: Smooth zoom/pan, intuitive controls, confirmation for destructive actions

### Export & Persistence
- **Functionality**: Automatically save graph state, export as JSON or image
- **Purpose**: Preserve work and share visualizations
- **Trigger**: Auto-save on changes, manual export button
- **Progression**: Create graph → Changes auto-save → Click export → Choose format → Download file
- **Success criteria**: No data loss, graph loads exactly as saved, export formats work correctly

## Edge Case Handling

- **Empty Canvas** - Show helpful overlay with instructions: "Double-click to add nodes" and visual hints
- **Overlapping Nodes** - Allow overlap but show z-index on selection, provide alignment tools
- **Self-loops** - Support edges from node to itself with curved arc
- **Multiple Edges** - Draw parallel edges with slight offset curves
- **Large Graphs** - Performance optimization for 100+ nodes, virtualization if needed
- **Zoom Limits** - Constrain zoom between 0.1x and 5x to prevent disorientation

## Design Direction

The design should feel technical yet approachable—reminiscent of network diagrams and data visualization tools but with modern polish. Clean canvas with subtle grid, vibrant nodes that pop against neutral background, and smooth physics-inspired interactions that feel alive.

## Color Selection

Custom palette with high-contrast nodes against neutral background—vibrant accent colors for nodes, dark mode-friendly with clear visual hierarchy.

- **Primary Color**: Electric Blue (oklch(0.58 0.22 250)) - Main action color for add/create buttons, active states
- **Secondary Colors**: Soft Slate (oklch(0.35 0.02 250)) for UI chrome, Canvas Gray (oklch(0.25 0.01 250)) for background
- **Accent Color**: Vibrant Cyan (oklch(0.72 0.15 195)) for selected nodes, highlighted edges, interactive elements
- **Node Palette**: Array of distinct colors - Coral (oklch(0.68 0.18 25)), Violet (oklch(0.62 0.24 295)), Lime (oklch(0.75 0.20 130)), Orange (oklch(0.70 0.18 50))
- **Foreground/Background Pairings**: 
  - Background (Canvas Gray oklch(0.25 0.01 250)): Light text (oklch(0.90 0.02 250)) - Ratio 11.5:1 ✓
  - Card (Dark Slate oklch(0.30 0.02 250)): Light text (oklch(0.90 0.02 250)) - Ratio 9.2:1 ✓
  - Primary (Electric Blue oklch(0.58 0.22 250)): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓
  - Accent (Vibrant Cyan oklch(0.72 0.15 195)): Dark text (oklch(0.20 0.01 250)) - Ratio 8.9:1 ✓
  - Node (Various bright colors): White text for labels (oklch(1 0 0)) - All ratios 4.5:1+ ✓

## Font Selection

Typography should be clean, technical, and highly legible—a modern sans-serif that works well at small sizes for node labels while maintaining clarity in UI elements.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/24px/tight tracking for header
  - H2 (Panel Titles): Inter SemiBold/16px/normal tracking for sidebar sections
  - Body (Labels/UI): Inter Medium/14px/normal line-height for controls and node labels
  - Caption (Stats): Inter Regular/12px/tabular numbers for node counts and coordinates
  - Node Labels: Inter SemiBold/13px/centered for text on nodes

## Animations

Smooth, physics-based animations that make the graph feel alive—elastic node dragging, spring-based edge animations, and subtle micro-interactions on hover without sacrificing performance.

- **Purposeful Meaning**: Spring physics on drag creates natural, satisfying movement; edges animate smoothly when nodes move; selection pulses subtly to draw attention
- **Hierarchy of Movement**: Node dragging is immediate (0ms delay); edge updates are synchronized; UI transitions are quick (150ms); zoom/pan are frame-synced

## Component Selection

- **Components**: 
  - Custom Canvas Component (SVG or Canvas-based for graph rendering)
  - Button (primary for add node, ghost for tools, destructive for delete)
  - Card (sidebar panels for controls and selected node properties)
  - Input (node label editing, inline and in panel)
  - Popover (color picker for node colors)
  - Tabs (switch between directed/undirected mode, different layouts)
  - Separator (divide tool sections)
  - DropdownMenu (export options, view settings)
  - AlertDialog (confirm clear graph, delete multiple nodes)
  
- **Customizations**: 
  - Custom SVG-based graph renderer with D3.js force simulation
  - Interactive node component with hover states and drag handles
  - Edge rendering with arrow markers for directed graphs
  - Minimap component for navigation in large graphs
  - Toolbar component with icon buttons for graph operations
  
- **States**: 
  - Nodes: Default (white border), Hover (glow effect), Selected (thick cyan border), Dragging (reduced opacity)
  - Edges: Default (gray), Hover (thicker + brighter), Selected (cyan), Creating (dashed animated line)
  - Canvas: Default (subtle grid), Panning (cursor changes), Empty (helper overlay)
  
- **Icon Selection**: 
  - Plus (add node)
  - Circle (node type selector)
  - ArrowsOutSimple (expand/fit to view)
  - Export (download graph)
  - Trash (delete selected)
  - MagnifyingGlassMinus/Plus (zoom controls)
  - Graph (app icon)
  - HandGrabbing (pan mode)
  
- **Spacing**: 
  - Canvas: Full viewport minus header/sidebar
  - Sidebar: w-80 on desktop, full-width drawer on mobile
  - Toolbar: gap-2 for icon buttons, p-2 container
  - Nodes: 60px diameter default, 8px padding for labels
  - Grid: 20px spacing, 1px strokes
  
- **Mobile**: 
  - Touch-friendly node dragging with larger hit areas
  - Bottom sheet for properties instead of sidebar
  - Simplified toolbar with essential tools only
  - Pinch-to-zoom gesture support
  - Double-tap to add nodes
  - Long-press for context menu
