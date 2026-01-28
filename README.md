# Ticket Card Printer

A desktop application for designing and printing custom ticket/card layouts from Excel and CSV data, with AI-powered field processing.

![Ticket Card Printer](./assets/banner.svg)

## Features

- **Import Data** - Load ticket data from Excel (.xlsx, .xls, .xlsm) or CSV files
- **Visual Card Designer** - Drag-and-drop interface to arrange fields on cards
- **Card Sorting & Grouping** - Manual and AI-powered sorting to organize cards intelligently
- **Conditional Styling** - Apply colors and backgrounds based on field values
- **Data Enrichment** - Add custom fields grouped by any column value
- **AI Integration** - Transform field values using Ollama, LM Studio, or OpenRouter
- **Template System** - Save, load, and share card designs
- **Print Ready** - Export to PDF with half-A4 or full-A4 layouts

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (included with Node.js)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ticket-card-printer

# Install dependencies
npm install
```

### Running the Application

**Development Mode (with hot reload):**
```bash
npm run dev
```
Then open http://localhost:5173 in your browser.

**Electron Desktop App:**
```bash
npm run electron:dev
```

**Production Build:**
```bash
npm run electron:build
```
The packaged application will be in the `dist/` folder.

## Usage

1. **Upload Data** - Drag and drop an Excel or CSV file onto the upload area
2. **Select Fields** - Choose which columns to display on your cards
3. **Design Layout** - Drag fields to position them, resize as needed
4. **Style Cards** - Set fonts, colors, and conditional formatting rules
5. **Sort Cards** - Configure sorting and grouping rules (manual or AI-powered)
6. **Add Enrichments** - Create custom fields for specific groups
7. **Preview & Print** - Switch to Print tab, select size, and print (Ctrl/Cmd+P)

## AI Configuration

To use AI features, configure a provider in the AI Chat panel:

| Provider | Setup |
|----------|-------|
| **Ollama** | Install [Ollama](https://ollama.ai), run a model locally |
| **LM Studio** | Install [LM Studio](https://lmstudio.ai), start local server |
| **OpenRouter** | Get API key from [OpenRouter](https://openrouter.ai) |

## Card Sorting & Grouping

The app provides powerful sorting capabilities to organize your cards for printing:

### Manual Sorting

**Simple Sort** - Sort by any field (alphabetical, numeric, ascending/descending)

- Example: Sort by Priority (High → Medium → Low)
- Example: Sort by Team name alphabetically
- Supports natural sort (e.g., "Item 2" comes before "Item 10")

**Linked-Issue Grouping** - Keep related cards together using graph-based traversal

- Automatically detects ticket relationships (e.g., SBT-1367 links to SBT-1368)
- Groups connected cards so they print adjacently
- Handles circular references (A→B and B→A)
- Orphan cards (no connections) sorted alphabetically at the end

### AI-Powered Sorting

**Discover Smart Grouping** - AI analyzes 50 random samples from your dataset and suggests 3-5 grouping strategies

- Natural language relationship detection
- Semantic clustering based on content similarity
- Fuzzy matching for similar values

**Custom AI Prompts** - Provide your own sorting instructions and let AI organize your cards

### How to Sort Cards

1. Open the **Design Cards** tab
2. Expand the **"Sort Cards"** panel (below the card preview)
3. Choose a sorting method:
   - **Add Simple Sort Rule** for field-based sorting
   - **Add Linked Issues Rule** for relationship grouping
   - **Configure AI Sorting** for intelligent analysis
4. Click **"Preview Sorted Cards"** to see results in Print Preview
5. Cards display their position (e.g., #1, #2) in the bottom-right corner

Sorting configurations are saved with templates for reuse.

## License

MIT
