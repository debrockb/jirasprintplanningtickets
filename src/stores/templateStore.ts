import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CardTemplate, SavedEnrichment, FieldMapping, FieldLayout, FieldStyle, EnrichmentGroup, CardBackgroundRule } from '../types'

interface TemplateStore {
  // Templates
  templates: CardTemplate[]
  saveTemplate: (name: string, mappings: FieldMapping[], layouts: FieldLayout[], styles: FieldStyle[], cardBgRules?: CardBackgroundRule[]) => string
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

      saveTemplate: (name, mappings, layouts, styles, cardBgRules = []) => {
        const id = generateId()
        const template: CardTemplate = {
          id,
          name,
          createdAt: Date.now(),
          fieldMappings: mappings,
          fieldLayouts: layouts,
          fieldStyles: styles,
          cardBackgroundRules: cardBgRules
        }
        set(state => ({
          templates: [...state.templates, template]
        }))
        return id
      },

      loadTemplate: (id) => {
        return get().templates.find(t => t.id === id) || null
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
        return JSON.stringify({ templates, savedEnrichments }, null, 2)
      },

      importAll: (json) => {
        try {
          const data = JSON.parse(json)
          if (data.templates && data.savedEnrichments) {
            set({
              templates: data.templates,
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
