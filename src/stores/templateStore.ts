import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CardTemplate, SavedEnrichment, FieldMapping, FieldLayout, FieldStyle, EnrichmentGroup, CardBackgroundRule, SortConfig } from '../types'

// Helper to serialize RegExp patterns for storage
function serializeSortConfig(config: SortConfig | undefined): any {
  if (!config) return undefined

  return {
    ...config,
    rules: config.rules.map(rule => ({
      ...rule,
      linkedIssues: rule.linkedIssues ? {
        ...rule.linkedIssues,
        issueKeyPattern: rule.linkedIssues.issueKeyPattern.source
      } : undefined
    }))
  }
}

// Helper to deserialize RegExp patterns from storage
function deserializeSortConfig(config: any): SortConfig | undefined {
  if (!config) return undefined

  return {
    ...config,
    rules: config.rules.map((rule: any) => ({
      ...rule,
      linkedIssues: rule.linkedIssues ? {
        ...rule.linkedIssues,
        issueKeyPattern: new RegExp(rule.linkedIssues.issueKeyPattern, 'g')
      } : undefined
    }))
  }
}

interface TemplateStore {
  // Templates
  templates: CardTemplate[]
  saveTemplate: (name: string, mappings: FieldMapping[], layouts: FieldLayout[], styles: FieldStyle[], cardBgRules?: CardBackgroundRule[], sortConfig?: SortConfig) => string
  loadTemplate: (id: string) => CardTemplate | null
  deleteTemplate: (id: string) => void
  renameTemplate: (id: string, name: string) => void

  // Enrichments
  savedEnrichments: SavedEnrichment[]
  saveEnrichment: (name: string, enrichmentGroup: EnrichmentGroup) => string
  loadEnrichment: (id: string) => SavedEnrichment | null
  deleteEnrichment: (id: string) => void

  // Export/Import
  exportAll: () => string
  importAll: (json: string) => boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],

      saveTemplate: (name, mappings, layouts, styles, cardBgRules = [], sortConfig) => {
        const id = generateId()
        const template: CardTemplate = {
          id,
          name,
          createdAt: Date.now(),
          fieldMappings: mappings,
          fieldLayouts: layouts,
          fieldStyles: styles,
          cardBackgroundRules: cardBgRules,
          sortConfig: serializeSortConfig(sortConfig) as any
        }
        set(state => ({
          templates: [...state.templates, template]
        }))
        return id
      },

      loadTemplate: (id) => {
        const template = get().templates.find(t => t.id === id)
        if (!template) return null

        return {
          ...template,
          sortConfig: deserializeSortConfig(template.sortConfig)
        }
      },

      deleteTemplate: (id) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id)
        }))
      },

      renameTemplate: (id, name) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, name } : t
          )
        }))
      },

      savedEnrichments: [],

      saveEnrichment: (name, enrichmentGroup) => {
        const id = generateId()
        const saved: SavedEnrichment = {
          id,
          name,
          createdAt: Date.now(),
          enrichmentGroup
        }
        set(state => ({
          savedEnrichments: [...state.savedEnrichments, saved]
        }))
        return id
      },

      loadEnrichment: (id) => {
        return get().savedEnrichments.find(e => e.id === id) || null
      },

      deleteEnrichment: (id) => {
        set(state => ({
          savedEnrichments: state.savedEnrichments.filter(e => e.id !== id)
        }))
      },

      exportAll: () => {
        const { templates, savedEnrichments } = get()
        // Templates are already serialized when saved
        return JSON.stringify({ templates, savedEnrichments }, null, 2)
      },

      importAll: (json) => {
        try {
          const data = JSON.parse(json)
          if (data.templates && data.savedEnrichments) {
            // Deserialize templates on import
            const deserializedTemplates = data.templates.map((t: any) => ({
              ...t,
              sortConfig: deserializeSortConfig(t.sortConfig)
            }))

            set({
              templates: deserializedTemplates,
              savedEnrichments: data.savedEnrichments
            })
            return true
          }
          return false
        } catch {
          return false
        }
      }
    }),
    {
      name: 'tickets-templates'
    }
  )
)
