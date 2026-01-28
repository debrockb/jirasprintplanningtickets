# Jira Card Printer - Forge App

A Jira Cloud Forge app for designing and printing custom ticket/card layouts from Jira issues with AI-powered field processing.

## Features

- **Jira Integration**: Select and work with issues from any project using JQL
- **Visual Card Designer**: Drag-and-drop interface to arrange fields on cards
- **Conditional Styling**: Apply colors and backgrounds based on field values
- **Data Enrichment**: Add custom fields grouped by any column value
- **AI Integration**: Transform field values using any AI provider (OpenAI, Anthropic, OpenRouter, AWS Bedrock, Azure OpenAI, etc.)
- **Template System**: Save, load, and share card designs (private and project-level)
- **Print & Export**: Client-side print and server-side PDF generation

## Development Setup

### Prerequisites

- Node.js v20 or v22
- An Atlassian account with API token
- A Jira Cloud development site

### Installation

1. Install Forge CLI globally:
```bash
npm install -g @forge/cli
```

2. Authenticate with Atlassian:
```bash
forge login
```

3. Install dependencies:
```bash
npm install
```

4. Deploy to development environment:
```bash
npm run deploy:dev
```

5. Install the app on your Jira site:
```bash
forge install
```

6. Start local development with tunnel:
```bash
npm run tunnel
```

## Project Structure

```
jira-card-printer-forge/
├── manifest.yml              # Forge app manifest
├── src/                      # Backend (Forge functions)
│   ├── index.ts             # Main resolver handler
│   ├── resolvers/           # Function resolvers
│   ├── services/            # Business logic
│   └── utils/               # Utilities
└── static/frontend/          # Frontend (Custom UI React app)
    ├── components/          # React components
    ├── stores/              # State management
    ├── services/            # Forge bridge client
    └── types/               # TypeScript types
```

## Commands

```bash
npm run deploy:dev      # Deploy to development environment
npm run deploy:staging  # Deploy to staging environment
npm run deploy:prod     # Deploy to production environment
npm run tunnel          # Start local development tunnel
npm run logs            # View app logs
```

## Security

- API keys stored using Forge secret storage (`kvs.setSecret`)
- All AI provider calls made server-side via Forge function resolvers
- Input validation and sanitization for XSS/injection prevention
- Minimal permission scopes (`read:jira-work`, `storage:app`)

## Architecture

### Backend (Forge Functions)
- **Issue Resolver**: Fetch Jira issues via REST API
- **Template Resolver**: CRUD operations for templates (user and project-scoped)
- **AI Resolver**: Process fields using configured AI providers with secure key storage
- **PDF Resolver**: Generate PDFs from card designs

### Frontend (Custom UI)
- React app running in iframe
- Forge bridge for communication with backend
- Zustand for state management
- Tailwind CSS for styling
- react-grid-layout for drag-drop card design

## License

MIT
