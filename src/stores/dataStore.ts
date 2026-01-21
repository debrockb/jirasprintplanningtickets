import { create } from 'zustand'
import { TicketRow, FieldMapping, FieldLayout, FieldStyle, EnrichmentGroup, CardBackgroundRule } from '../types'

interface DataStore {
  // Data
  rows: TicketRow[]
  columns: string[]
  setData: (rows: TicketRow[], columns: string[]) => void
  clearData: () => void
  updateRowField: (rowIndex: number, fieldName: string, value: string) => void
  updateAllRowsField: (fieldName: string, values: Map<number, string>) => void

  // Field mappings
  fieldMappings: FieldMapping[]
  setFieldMappings: (mappings: FieldMapping[]) => void
  updateFieldMapping: (columnName: string, updates: Partial<FieldMapping>) => void

  // Layouts
  fieldLayouts: FieldLayout[]
  setFieldLayouts: (layouts: FieldLayout[]) => void

  // Styles
  fieldStyles: FieldStyle[]
  setFieldStyles: (styles: FieldStyle[]) => void
  updateFieldStyle: (fieldId: string, updates: Partial<FieldStyle>) => void

  // Card background rules
  cardBackgroundRules: CardBackgroundRule[]
  setCardBackgroundRules: (rules: CardBackgroundRule[]) => void

  // Enrichment
  enrichmentGroup: EnrichmentGroup | null
  setEnrichmentGroup: (group: EnrichmentGroup | null) => void
  setEnrichmentValue: (groupValue: string, customField: string, value: string) => void
  addCustomField: (groupValue: string, fieldName: string) => void
  removeCustomField: (groupValue: string, fieldName: string) => void

  // Current preview index
  previewIndex: number
  setPreviewIndex: (index: number) => void

  // Get row with enrichment data merged in
  getEnrichedRow: (row: TicketRow) => TicketRow
}

export const useDataStore = create<DataStore>((set, get) => ({
  rows: [],
  columns: [],
  setData: (rows, columns) => {
    const mappings: FieldMapping[] = columns.map((col, index) => ({
      columnName: col,
      displayName: col,
      enabled: true,
      columnIndex: index
    }))

    const layouts: FieldLayout[] = columns.slice(0, 6).map((col, i) => ({
      i: col,
      x: (i % 2) * 6,
      y: Math.floor(i / 2) * 2,
      w: 6,
      h: 2,
      minW: 2,
      minH: 1
    }))

    const styles: FieldStyle[] = columns.map(col => ({
      fieldId: col,
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left',
      showLabel: true,
      showBorder: true,
      colorRules: []
    }))

    set({ rows, columns, fieldMappings: mappings, fieldLayouts: layouts, fieldStyles: styles, previewIndex: 0 })
  },
  clearData: () => set({ rows: [], columns: [], fieldMappings: [], fieldLayouts: [], fieldStyles: [], previewIndex: 0 }),
  updateRowField: (rowIndex, fieldName, value) => set(state => ({
    rows: state.rows.map((row, i) =>
      i === rowIndex ? { ...row, [fieldName]: value } : row
    )
  })),
  updateAllRowsField: (fieldName, values) => {
    console.log('Store: updateAllRowsField called', { fieldName, valuesSize: values.size })
    set(state => {
      const newRows = state.rows.map((row, i) => {
        const newValue = values.get(i)
        if (newValue !== undefined) {
          console.log(`Store: Updating row ${i}, field ${fieldName} with value length: ${newValue.length}`)
        }
        return newValue !== undefined ? { ...row, [fieldName]: newValue } : row
      })
      console.log('Store: New rows created, first row Description:', newRows[0]?.[fieldName]?.substring(0, 50))
      return { rows: newRows }
    })
  },

  fieldMappings: [],
  setFieldMappings: (mappings) => set({ fieldMappings: mappings }),
  updateFieldMapping: (columnName, updates) => set(state => ({
    fieldMappings: state.fieldMappings.map(m =>
      m.columnName === columnName ? { ...m, ...updates } : m
    )
  })),

  fieldLayouts: [],
  setFieldLayouts: (layouts) => set({ fieldLayouts: layouts }),

  fieldStyles: [],
  setFieldStyles: (styles) => set({ fieldStyles: styles }),
  updateFieldStyle: (fieldId, updates) => set(state => ({
    fieldStyles: state.fieldStyles.map(s =>
      s.fieldId === fieldId ? { ...s, ...updates } : s
    )
  })),

  cardBackgroundRules: [],
  setCardBackgroundRules: (rules) => set({ cardBackgroundRules: rules }),

  enrichmentGroup: null,
  setEnrichmentGroup: (group) => set({ enrichmentGroup: group }),
  setEnrichmentValue: (groupValue, customField, value) => set(state => {
    if (!state.enrichmentGroup) return state
    return {
      enrichmentGroup: {
        ...state.enrichmentGroup,
        enrichments: {
          ...state.enrichmentGroup.enrichments,
          [groupValue]: {
            ...(state.enrichmentGroup.enrichments[groupValue] || {}),
            [customField]: value
          }
        }
      }
    }
  }),
  addCustomField: (groupValue, fieldName) => set(state => {
    if (!state.enrichmentGroup) return state
    return {
      enrichmentGroup: {
        ...state.enrichmentGroup,
        enrichments: {
          ...state.enrichmentGroup.enrichments,
          [groupValue]: {
            ...(state.enrichmentGroup.enrichments[groupValue] || {}),
            [fieldName]: ''
          }
        }
      }
    }
  }),
  removeCustomField: (groupValue, fieldName) => set(state => {
    if (!state.enrichmentGroup) return state
    const updatedEnrichments = { ...state.enrichmentGroup.enrichments }
    if (updatedEnrichments[groupValue]) {
      const { [fieldName]: _, ...rest } = updatedEnrichments[groupValue]
      updatedEnrichments[groupValue] = rest
    }
    return {
      enrichmentGroup: {
        ...state.enrichmentGroup,
        enrichments: updatedEnrichments
      }
    }
  }),

  previewIndex: 0,
  setPreviewIndex: (index) => set(state => ({
    previewIndex: Math.max(0, Math.min(index, state.rows.length - 1))
  })),

  getEnrichedRow: (row) => {
    const { enrichmentGroup } = get()
    if (!enrichmentGroup) return row

    const groupValue = row[enrichmentGroup.groupField]
    if (!groupValue || !enrichmentGroup.enrichments[String(groupValue)]) return row

    return {
      ...row,
      ...enrichmentGroup.enrichments[String(groupValue)]
    }
  }
}))
