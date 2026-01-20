export interface TicketRow {
  [key: string]: string | number | null | undefined
}

export interface FieldMapping {
  columnName: string
  displayName: string
  enabled: boolean
}

export interface FieldLayout {
  i: string  // field id (column name)
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface ColorRule {
  field: string          // Field to check
  operator: 'equals' | 'contains' | 'notEmpty' | 'empty'
  value: string          // Value to match (for equals/contains)
  backgroundColor: string
  textColor: string
}

export interface FieldStyle {
  fieldId: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  showLabel: boolean
  showBorder: boolean
  colorRules: ColorRule[]
}

export interface EnrichmentGroup {
  groupField: string  // e.g., "Client"
  enrichments: {
    [groupValue: string]: {
      [customField: string]: string
    }
  }
}

export interface AIProvider {
  name: 'ollama' | 'lmstudio' | 'openrouter'
  endpoint: string
  model: string
  apiKey?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface CardTemplate {
  id: string
  name: string
  createdAt: number
  fieldMappings: FieldMapping[]
  fieldLayouts: FieldLayout[]
  fieldStyles: FieldStyle[]
}

export interface SavedEnrichment {
  id: string
  name: string
  createdAt: number
  enrichmentGroup: EnrichmentGroup
}

export interface AppState {
  // Data
  rows: TicketRow[]
  columns: string[]

  // Field mapping
  fieldMappings: FieldMapping[]

  // Layout
  fieldLayouts: FieldLayout[]
  fieldStyles: FieldStyle[]

  // Enrichment
  enrichmentGroup: EnrichmentGroup | null

  // AI
  aiProvider: AIProvider | null
  chatHistory: ChatMessage[]
}

declare global {
  interface Window {
    electronAPI?: {
      openFileDialog: () => Promise<string | null>
    }
  }
}
