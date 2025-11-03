# Formulation Graph Studio - Centralized Configuration Management

The platform provides a comprehensive, production-ready configuration management system for the F&B formulation platform with zero hardcoded values.

**Experience Qualities**:
1. **Accessible** - All configuration values easily found and editable from a single, organized interface
2. **Predictable** - Changes to settings immediately reflect in the application behavior 
3. **Professional** - Enterprise-grade settings management with validation and persistence

**Complexity Level**: Complex Application (advanced functionality, multiple configuration domains, centralized state management) - This choice reflects the need for comprehensive configuration across backend services, databases, API integrations, calculations, UI behavior, and multi-agent orchestration systems.

## Essential Features

### Centralized Settings Interface
- **Functionality**: Single tabbed interface providing access to all application configuration domains
- **Purpose**: Eliminates scattered hardcoded values and provides one source of truth for all settings
- **Trigger**: User navigates to Settings from sidebar navigation
- **Progression**: Select settings category → View current values → Modify as needed → Save changes → Settings persist across sessions
- **Success criteria**: All previously hardcoded values can be modified through the UI and changes persist

### Backend API Configuration  
- **Functionality**: Configure backend URL, health check intervals, and request timeouts
- **Purpose**: Allow dynamic connection to different backend environments without code changes
- **Trigger**: Open Backend tab in Settings
- **Progression**: Enter API URL → Set health check interval → Set request timeout → Save → Backend connection updates
- **Success criteria**: Application successfully connects to configured backend URL with specified timeouts

### Neo4j Database Settings
- **Functionality**: Full Neo4j driver configuration including URI, credentials, connection pooling, and timeout settings
- **Purpose**: Enable flexible database connections across development, staging, and production environments
- **Trigger**: Open Neo4j tab in Settings  
- **Progression**: Enter connection URI → Provide credentials → Configure advanced settings → Test connection → Save configuration
- **Success criteria**: Successful connection test and all graph operations use configured settings

### AI Service Configuration
- **Functionality**: Configure AI service mode (online/offline/auto), fallback behavior, retry attempts, and timeouts
- **Purpose**: Control AI assistant behavior and graceful degradation when services are unavailable
- **Trigger**: Open AI Service tab in Settings
- **Progression**: Select service mode → Configure fallback options → Set timeouts → Monitor service health → Save settings
- **Success criteria**: AI features operate according to configured mode with proper fallback behavior

### USDA FDC API Settings
- **Functionality**: Configure FoodData Central API endpoint, API key, page sizes, and rate limits
- **Purpose**: Enable food and nutrient data ingestion from USDA database with customizable parameters
- **Trigger**: Open FDC API tab in Settings
- **Progression**: Enter API endpoint → Provide API key → Set pagination limits → Configure rate limiting → Save
- **Success criteria**: Food data searches and ingestion work with configured API settings

### UI Behavior Configuration
- **Functionality**: Customize UI behavior including toast position, graph height, animation durations, and accessibility settings
- **Purpose**: Allow users to tune the interface to their preferences and requirements
- **Trigger**: Open UI tab in Settings
- **Progression**: Select toast position → Set graph display height → Configure animation speeds → Adjust accessibility → Save
- **Success criteria**: UI behaves according to configured parameters

### Calculation Engine Settings
- **Functionality**: Configure precision, tolerances, and thresholds for formulation calculations
- **Purpose**: Customize calculation behavior for different formulation types and regulatory requirements
- **Trigger**: Open Calculations tab in Settings
- **Progression**: Set decimal precision → Configure yield thresholds → Set tolerance levels → Save
- **Success criteria**: All formulation calculations use configured precision and threshold values

### Graph Visualization Settings
- **Functionality**: Customize node colors, labels, and relationship types for Neo4j graph visualization
- **Purpose**: Allow branding customization and improved readability of graph representations
- **Trigger**: Open Graph tab in Settings
- **Progression**: Select node type → Choose color → Edit label → Configure relationships → Save
- **Success criteria**: Graph visualizations display with configured colors and labels

### Orchestration Defaults
- **Functionality**: Set default values for multi-agent orchestration including batch sizes, units, and feature toggles
- **Purpose**: Streamline repeated orchestration tasks with sensible defaults
- **Trigger**: Open Orchestration tab in Settings
- **Progression**: Set default batch size → Choose unit → Toggle nutrient/cost analysis → Set history limit → Save
- **Success criteria**: New orchestrations initialize with configured default values

## Edge Case Handling

- **Invalid Values** - Form validation prevents saving invalid configurations with helpful error messages
- **Connection Failures** - Test connection buttons verify settings before saving; graceful error handling
- **Missing Configuration** - Application initializes with sensible defaults from DEFAULT_APP_CONFIG
- **Concurrent Modifications** - KV storage handles concurrent updates safely with last-write-wins semantics
- **Migration Path** - Existing hardcoded values gracefully migrate to new configuration system on first load
- **Password Security** - Sensitive fields (passwords, API keys) use password input with show/hide toggle

## Design Direction

The settings interface should feel professional and organized, conveying enterprise-grade capability while remaining approachable. A minimal interface serves the purpose best - settings should be easy to scan, understand, and modify without visual clutter or unnecessary decoration.

## Color Selection

**Triadic** color scheme with professional blue as primary, warm orange as accent, and strategic use of system colors for status indicators.

- **Primary Color**: oklch(0.50 0.16 255) - Professional blue communicating trust and stability for primary actions
- **Secondary Colors**: oklch(0.38 0.14 255) - Deeper blue for secondary actions maintaining visual hierarchy
- **Accent Color**: oklch(0.65 0.14 35) - Warm orange for important highlights and warnings
- **Foreground/Background Pairings**:
  - Background (Light Gray oklch(0.98 0.005 240)): Dark text oklch(0.20 0.015 240) - Ratio 16.4:1 ✓
  - Card (White oklch(1 0 0)): Dark text oklch(0.20 0.015 240) - Ratio 18.2:1 ✓  
  - Primary (Blue oklch(0.50 0.16 255)): White text oklch(1 0 0) - Ratio 7.8:1 ✓
  - Secondary (Deep Blue oklch(0.38 0.14 255)): White text oklch(1 0 0) - Ratio 12.1:1 ✓
  - Accent (Orange oklch(0.65 0.14 35)): White text oklch(1 0 0) - Ratio 4.9:1 ✓
  - Muted (Light Gray oklch(0.96 0.005 240)): Muted text oklch(0.48 0.01 240) - Ratio 6.2:1 ✓

## Font Selection

Inter font family conveys modern professionalism while maintaining excellent readability at all sizes, with tabular numbers for precise data display.

- **Typographic Hierarchy**:
  - H1 (Page Title): Inter Bold/24px/tight letter spacing
  - H2 (Section Title): Inter Semi-bold/18px/normal spacing  
  - H3 (Subsection): Inter Semi-bold/14px/normal spacing
  - Body (Settings Labels): Inter Medium/14px/relaxed spacing
  - Small (Helper Text): Inter Regular/12px/normal spacing
  - Code/Mono (Technical Values): Inter Regular/12px/monospace variant

## Animations

Subtle, functional animations guide attention and provide feedback without distraction. Motion communicates state changes and relationships between settings and their effects.

- **Purposeful Meaning**: Tab transitions slide horizontally suggesting spatial organization of settings categories
- **Hierarchy of Movement**: Save button confirmation animates with subtle scale and checkmark appearance; critical connection tests show pulsing status indicators

## Component Selection

- **Components**: 
  - Tabs (shadcn) - Primary navigation between settings categories with responsive grid layout
  - Card (shadcn) - Container for each settings group with consistent padding and elevation
  - Input (shadcn) - Text and number inputs with clear focus states and validation
  - Select (shadcn) - Dropdown selections for enumerated options
  - Switch (shadcn) - Toggle switches for boolean configuration flags
  - Button (shadcn) - Save and test actions with loading states
  - Label (shadcn) - Clear field labeling with helper text support
  - Separator (shadcn) - Visual grouping of related settings
  
- **Customizations**:
  - Password input with show/hide toggle button
  - Color picker display showing both OKLCH value and visual preview
  - Connection status badges with real-time health monitoring
  - Settings cards with icon headers for visual category identification

- **States**: 
  - Inputs show focus, error, and success states with appropriate colors
  - Save buttons disable during saving with loading spinner
  - Test connection buttons show pending/success/failure states with icons
  - Modified settings highlight with subtle background until saved

- **Icon Selection**: 
  - Gear (Backend), Database (Neo4j), CloudArrowDown (AI Service), FileText (FDC API)
  - Palette (UI), Calculator (Calculations), Network (Graph), Flask (Orchestration)
  - CheckCircle (Success/Save), Warning (Alerts), Eye/EyeSlash (Password toggle)

- **Spacing**: Consistent use of Tailwind spacing-4 (16px) between form fields, spacing-6 (24px) between sections

- **Mobile**: 
  - Tabs collapse to scrollable horizontal list on mobile
  - Form fields stack vertically with full width
  - Multi-column grids become single column below 768px breakpoint
  - Icon labels hide on small screens showing icons only
