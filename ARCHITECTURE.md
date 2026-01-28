# Architecture

This document explains the internal workings of the Ticket Card Printer application.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Electron Shell                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         React Application                          │  │
│  │                                                                    │  │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │  │
│  │   │  Components  │◄──►│    Stores    │◄──►│   Services   │       │  │
│  │   │   (UI/UX)    │    │   (Zustand)  │    │   (Logic)    │       │  │
│  │   └──────────────┘    └──────────────┘    └──────────────┘       │  │
│  │          │                   │                   │                │  │
│  │          ▼                   ▼                   ▼                │  │
│  │   ┌──────────────────────────────────────────────────────┐       │  │
│  │   │                    Types (index.ts)                   │       │  │
│  │   │         Shared TypeScript interfaces & enums          │       │  │
│  │   └──────────────────────────────────────────────────────┘       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Electron Main Process                          │  │
│  │                    (IPC, File Dialogs, Window)                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────────┐
              │           External Systems               │
              │  • Local AI (Ollama, LM Studio)         │
              │  • Cloud AI (OpenRouter)                 │
              │  • File System (Excel/CSV)              │
              │  • Browser Print API                     │
              └─────────────────────────────────────────┘
```

## Core Data Flow

### 1. Data Import Flow

```
Excel/CSV File
      │
      ▼
┌─────────────────┐
│   FileUpload    │  Component handles drag-drop and file selection
│   Component     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  excelParser    │  Service reads file using XLSX library
│    Service      │
│                 │
│  loadWorkbook() │  → FileReader API → XLSX.read()
│  parseSheet()   │  → XLSX.utils.sheet_to_json()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    dataStore    │  Zustand store initializes state
│                 │
│  setData()      │  Creates: rows, columns, fieldMappings,
│                 │           fieldLayouts, fieldStyles
└─────────────────┘
```

### 2. Card Design Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CardDesigner Component                    │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Preview   │     │  GridLayout │     │   Inline    │       │
│  │  Navigation │     │  (react-    │     │   Style     │       │
│  │  Prev/Next  │     │  grid-      │     │  Controls   │       │
│  └──────┬──────┘     │  layout)    │     └──────┬──────┘       │
│         │            └──────┬──────┘            │               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      dataStore                           │   │
│  │                                                          │   │
│  │  previewIndex ─── Which ticket row to show               │   │
│  │  fieldLayouts ─── Grid positions {x, y, w, h}            │   │
│  │  fieldStyles ──── Per-field styling                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. AI Processing Flow

```
┌───────────────────┐
│  AIFieldProcessor │
│     Component     │
│                   │
│  • Source field   │
│  • Target field   │
│  • Prompt select  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌─────────────────────────────────────┐
│    aiService      │────►│         AI Provider                  │
│                   │     │                                      │
│ sendChatMessage() │     │  Ollama:    POST /api/chat          │
│                   │     │  LM Studio: POST /v1/chat/completions│
│                   │     │  OpenRouter: POST with API key       │
└─────────┬─────────┘     └─────────────────────────────────────┘
          │
          ▼
┌───────────────────┐
│    dataStore      │
│                   │
│ updateRowField()  │  ─── Single ticket update
│ updateAllRows     │  ─── Batch update all tickets
│    Field()        │
└───────────────────┘
```

### 4. Card Sorting Flow

```
┌───────────────────┐
│    SortPanel      │  User configures sorting rules
│    Component      │
│                   │
│  • Simple sort    │
│  • Linked issues  │
│  • AI sorting     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│    dataStore      │
│                   │
│  sortConfig       │  ─── Sorting rules configuration
│  aiSortedResults  │  ─── Cached AI-sorted results
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────┐
│                      PrintView Component                   │
│                                                            │
│  useMemo(() => {                                           │
│    if (aiSortedResults) return aiSortedResults             │
│    return applySorting(rawRows, sortConfig)                │
│  })                                                        │
└─────────┬─────────────────────────────────────────────────┘
          │
          ├─────► Manual Sorting (cardSorting.ts)
          │       │
          │       ├── Simple Sort: Field-based (asc/desc, numeric)
          │       │   • Natural sort with localeCompare
          │       │   • Handles null/undefined
          │       │
          │       └── Linked-Issues Grouping:
          │           • Build graph from issue keys
          │           • DFS traversal from root nodes
          │           • Handle circular references
          │           • Sort orphans alphabetically
          │
          └─────► AI Sorting (aiSorting.ts)
                  │
                  ├── Strategy Discovery:
                  │   • Sample 50 random rows
                  │   • Send to AI for analysis
                  │   • Parse suggested strategies
                  │
                  └── Apply AI Sort:
                      • Natural-language-links mode
                      • Semantic-clustering mode
                      • Fuzzy-matching mode
```

## State Architecture

### Store Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              dataStore.ts                                │
│                         (Primary Application State)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Data Layer                    │  UI Layer                               │
│  ─────────────────────────────│──────────────────────────────────────   │
│  • rows: TicketRow[]          │  • previewIndex: number                  │
│  • columns: string[]          │  • fieldLayouts: FieldLayout[]           │
│  • fieldMappings: Map         │  • fieldStyles: FieldStyle[]             │
│  • enrichmentData: Map        │  • colorRules: ColorRule[]               │
│                               │  • cardBackgroundRules: Rule[]           │
│                               │  • sortConfig: SortConfig                │
│                               │  • aiSortedResults: Results[]            │
│                                                                          │
│  Key Methods:                                                            │
│  • setData() ─────────── Initialize from parsed file                     │
│  • getEnrichedRow() ──── Merge base row with enrichment data            │
│  • updateFieldLayout() ─ Handle drag-drop position changes              │
│  • updateFieldStyle() ── Apply styling changes                          │
│  • setSortConfig() ───── Update sorting configuration                   │
│  • setAISortedResults() ─ Cache AI sorting results                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            templateStore.ts                              │
│                          (Persistence Layer)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  • templates: CardTemplate[]     Saved card designs (includes sortConfig)│
│  • enrichments: Enrichment[]     Saved enrichment configs                │
│                                                                          │
│  Persistence: localStorage with Zustand persist middleware               │
│  Key: 'tickets-templates'                                                │
│                                                                          │
│  Smart Loading:                                                          │
│  When loading a template for different data, the system:                 │
│  1. First pass: Match columns by exact name                              │
│  2. Second pass: Match remaining by original index                       │
│  3. Create default mappings for new columns                              │
│  4. Load sortConfig with template                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              aiStore.ts                                  │
│                         (AI Configuration)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  • provider: AIProvider          Current AI service config               │
│  • chatHistory: Message[]        Conversation history                    │
│  • isLoading: boolean            Request state                           │
│                                                                          │
│  Persistence: localStorage with key 'tickets-ai-store'                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
│
├── Header
│   ├── Title & Stats
│   ├── TemplateManager ─────────► templateStore
│   └── Clear Data Button
│
├── [No Data State]
│   └── FileUpload ──────────────► excelParser → dataStore
│
├── [Data Loaded - Design Tab]
│   ├── Sidebar (Left Panel)
│   │   ├── FieldMapper ─────────► dataStore.fieldMappings
│   │   ├── StylePanel ──────────► dataStore.fieldStyles, colorRules
│   │   └── Enrichment ──────────► dataStore.enrichmentData
│   │
│   └── CardDesigner (Main Area)
│       ├── Navigation Controls
│       ├── Auto-Arrange Button
│       ├── SortPanel ───────────► dataStore.sortConfig, aiSortedResults
│       │   ├── Simple Sort Rules
│       │   ├── Linked-Issue Grouping
│       │   └── AI Sorting Config
│       └── GridLayout ──────────► dataStore.fieldLayouts
│           └── Field Items (draggable/resizable)
│
├── [Data Loaded - Print Tab]
│   └── PrintView
│       ├── Scroll-to-Top Button (appears after scrolling 300px)
│       ├── Size Selector (Half A4 / Full A4)
│       ├── Sort Status Indicator
│       └── Card Grid ───────────► Sorted results with card numbering
│           └── CSS @media print
│
├── AIChat (Floating Panel)
│   └── Chat Interface ──────────► aiStore, aiService
│
└── AIFieldProcessor (Floating Panel)
    ├── Field Selectors
    ├── Prompt Input/Presets
    └── Preview & Apply ─────────► aiService → dataStore
```

## Type System

### Core Interfaces

```typescript
// A single ticket/row of data
interface TicketRow {
  [fieldName: string]: string | number | boolean;
}

// Column configuration
interface FieldMapping {
  name: string;           // Original column name
  displayName: string;    // Shown on card
  enabled: boolean;       // Visible on card
  index: number;          // Original column order
}

// Grid position (react-grid-layout format)
interface FieldLayout {
  i: string;              // Field identifier
  x: number;              // Grid column (0-11)
  y: number;              // Grid row
  w: number;              // Width in columns
  h: number;              // Height in rows
}

// Per-field styling
interface FieldStyle {
  fieldName: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  showLabel: boolean;
}

// Conditional formatting
interface ColorRule {
  id: string;
  fieldName: string;
  condition: 'equals' | 'contains' | 'startsWith' | 'endsWith';
  value: string;
  textColor: string;
  backgroundColor: string;
}

// Complete saved template
interface CardTemplate {
  id: string;
  name: string;
  createdAt: number;
  fieldMappings: FieldMapping[];
  fieldLayouts: FieldLayout[];
  fieldStyles: FieldStyle[];
  colorRules: ColorRule[];
  cardBackgroundRules: CardBackgroundRule[];
  sortConfig?: SortConfig;
}

// Card sorting configuration
interface SortConfig {
  rules: SortRule[];
  aiSort?: AISortConfig;
}

interface SortRule {
  id: string;
  type: 'simple' | 'linked-issues';
  simple?: SimpleSortConfig;
  linkedIssues?: LinkedIssueGroupConfig;
}

// Result of sorting operation
interface SortedCardResult {
  row: TicketRow;
  originalIndex: number;
  groupId?: string;        // For linked-issue groups
  groupSize?: number;      // Number of cards in group
  aiGroupId?: string;      // For AI-based grouping
  aiSimilarity?: number;   // AI similarity score
}
```

## Electron Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Main Process                                │
│                         (electron/main.ts)                           │
│                                                                      │
│  • Creates BrowserWindow (1400x900)                                  │
│  • Loads Vite dev server (dev) or built HTML (prod)                 │
│  • Handles IPC for native features                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                          Context Bridge
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                         Preload Script                               │
│                       (electron/preload.ts)                          │
│                                                                      │
│  Exposes to renderer:                                                │
│  window.electronAPI = {                                              │
│    openFileDialog: () => ipcRenderer.invoke('open-file-dialog')     │
│  }                                                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Renderer Process                              │
│                         (React App)                                  │
│                                                                      │
│  Uses: window.electronAPI.openFileDialog()                          │
│  Note: Context isolation enabled, no direct Node.js access          │
└─────────────────────────────────────────────────────────────────────┘
```

## Print System

The print system uses CSS media queries to transform the card layout for printing:

```css
@media print {
  /* Hide UI elements */
  .no-print { display: none; }

  /* Page setup */
  @page {
    size: A4;
    margin: 10mm;
  }

  /* Card sizing */
  .print-card {
    width: 210mm;
    height: 148.5mm;  /* Half A4 */
    /* or 297mm for Full A4 */
    page-break-inside: avoid;
  }
}
```

**Size Options:**
- **Half A4**: 210mm × 148.5mm (2 cards per page)
- **Full A4**: 210mm × 297mm (1 card per page)

## Build Pipeline

```
Source Files                    Build Output
─────────────                   ────────────

src/
├── main.tsx      ─────────┐
├── App.tsx                │
├── components/            │    Vite Build
├── stores/                ├───────────────►  dist/
├── services/              │                  ├── index.html
├── types/                 │                  └── assets/
└── utils/        ─────────┘                      └── *.js, *.css

electron/
├── main.ts       ─────────┐    TypeScript
└── preload.ts    ─────────┴───────────────►  dist-electron/
                                              ├── main.js
                                              └── preload.js

                           electron-builder
dist/ + dist-electron/ ───────────────────►  Packaged App
                                             (macOS/Windows/Linux)
```
