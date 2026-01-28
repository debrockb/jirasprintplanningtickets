# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ticket Card Printer is an Electron + React desktop application for designing and printing ticket/card layouts from Excel/CSV data with AI-powered field processing.

**Tech Stack:** Electron 31, React 18, Vite 5, TypeScript, Zustand (state), Tailwind CSS, react-grid-layout, XLSX library

## Commands

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Vite production build to dist/
npm run electron:dev     # Build + launch Electron app
npm run electron:build   # Production Electron app with electron-builder
npm run start            # Run built Electron app
```

## Architecture

### State Management (Zustand Stores in `src/stores/`)

- **dataStore.ts** - Core application state: ticket data rows, field mappings, field layouts (grid positions), field styles, enrichment groups, card background rules, sorting configuration, AI-sorted results cache. Contains `getEnrichedRow()` helper that merges enrichment data with base row.
- **templateStore.ts** - Persists templates (including sorting config) and enrichment configurations to localStorage. Handles export/import as JSON.
- **aiStore.ts** - AI provider configuration (Ollama, LM Studio, OpenRouter) and chat history.

### Services (`src/services/`)

- **excelParser.ts** - Parses Excel (.xlsx, .xls, .xlsm) and CSV files using XLSX library. `loadWorkbook()` reads file, `parseSheet()` converts to typed rows.
- **aiService.ts** - Routes requests to AI providers (Ollama at `/api/chat`, LM Studio at `/v1/chat/completions`, OpenRouter with API key). Includes `processFieldValue()` for batch field transformation and `<think>` tag stripping for reasoning models.

### Utilities (`src/utils/`)

- **cardSorting.ts** - Core sorting algorithms: simple field-based sort and linked-issue grouping using graph-based DFS traversal. Handles circular references and orphan cards.
- **aiSorting.ts** - AI-powered sorting: strategy discovery (analyzes 50 random samples), natural-language-links mode, semantic clustering, and fuzzy matching.
- **markdownRenderer.tsx** - Renders markdown content in card fields (supports bold, italic, lists, links).

### Key Components (`src/components/`)

- **CardDesigner.tsx** - Main canvas using react-grid-layout for drag-drop field placement with inline style controls, includes SortPanel
- **SortPanel.tsx** - Configure card sorting: simple field sort, linked-issue grouping, AI-powered sorting with strategy discovery
- **FieldMapper.tsx** - Toggle column visibility and rename display names
- **StylePanel.tsx** - Field styling (fonts, colors) and conditional color rules
- **PrintView.tsx** - Print preview with half-A4 and full-A4 size options, scroll-to-top button, sorted card display with numbering
- **AIFieldProcessor.tsx** - Batch AI processing with preset/custom prompts
- **TemplateManager.tsx** - Save/load templates with smart column mapping (matches by name then index)

### Types (`src/types/index.ts`)

Key interfaces: `TicketRow`, `FieldMapping`, `FieldLayout`, `FieldStyle`, `ColorRule`, `CardBackgroundRule`, `EnrichmentGroup`, `CardTemplate`, `AIProvider`, `SortConfig`, `SortedCardResult`, `GroupingStrategy`

### Electron (`electron/`)

- **main.ts** - Window creation, IPC handlers
- **preload.ts** - Context bridge exposing `window.electronAPI.openFileDialog()`

## Data Flow

1. File uploaded via FileUpload → `loadWorkbook()` → `parseSheet()` → `dataStore.setData()`
2. Templates loaded via TemplateManager → smart column mapping adapts to new data structure (includes sortConfig)
3. Card sorting: SortPanel → `dataStore.setSortConfig()` → PrintView applies `applySorting()` or uses cached AI results
4. AI processing: AIFieldProcessor → `aiService.sendChatMessage()` → provider → `updateAllRowsField()` or `updateRowField()`

## Storage

localStorage keys:
- `tickets-templates` - Card templates and enrichments
- `tickets-ai-store` - AI provider configuration

## Print System

Print CSS in `src/index.css` with `@media print`. Two size modes configurable in PrintView. Use Ctrl/Cmd+P to print.
