export interface TicketRow {
  [key: string]: string | number | null | undefined
}

export interface FieldMapping {
  columnName: string
  displayName: string
  enabled: boolean
  columnIndex: number  // Position in the original Excel file
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

export interface CardBackgroundRule {
  field: string
  operator: 'equals' | 'contains' | 'notEmpty' | 'empty'
  value: string
  backgroundColor: string
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

export type SortRuleType = 'simple' | 'linked-issues'
export type AISortMode = 'natural-language-links' | 'semantic-clustering' | 'fuzzy-matching'

export interface SimpleSortConfig {
  field: string
  direction: 'asc' | 'desc'
  numeric: boolean
}

export interface LinkedIssueGroupConfig {
  keyField: string
  linkedIssuesField: string
  issueKeyPattern: RegExp
  sortWithinGroups?: SimpleSortConfig
}

export interface SortRule {
  id: string  // Unique ID for React keys
  type: SortRuleType
  simple?: SimpleSortConfig
  linkedIssues?: LinkedIssueGroupConfig
}

export interface GroupingStrategy {
  id: string
  name: string
  description: string
  mode: AISortMode
  suggestedFields: string[]  // Fields that should be analyzed
  confidence: number  // 0-1, how confident the AI is this will work well
}

export interface AISortConfig {
  enabled: boolean
  mode: AISortMode
  prompts: {
    naturalLanguageLinks: string
    semanticClustering: string
    fuzzyMatching: string
  }
  fieldsToAnalyze: string[]  // Which fields to analyze
  // AI-suggested grouping strategies
  suggestedStrategies?: GroupingStrategy[]
  selectedStrategy?: GroupingStrategy
  // Cache to avoid re-processing
  analysisCache?: {
    timestamp: number
    dataHash: string
    groups: Map<string, string[]>  // Card key -> related card keys
  }
}

export interface SortConfig {
  rules: SortRule[]  // Chain of sort rules (applied in order)
  aiSort?: AISortConfig  // Optional AI-powered sorting
}

export interface SortedCardResult {
  row: TicketRow
  originalIndex: number
  groupId?: string
  groupSize?: number
  aiGroupId?: string  // AI-determined group
  aiSimilarity?: number  // Similarity score for AI grouping
}

export interface CardTemplate {
  id: string
  name: string
  createdAt: number
  fieldMappings: FieldMapping[]
  fieldLayouts: FieldLayout[]
  fieldStyles: FieldStyle[]
  cardBackgroundRules?: CardBackgroundRule[]
  sortConfig?: SortConfig
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
