import { useDataStore } from '../stores/dataStore'
import { ColorRule, TicketRow } from '../types'

const GRID_COLS = 12
const GRID_ROW_HEIGHT = 25
const CARD_WIDTH = 794
const CARD_HEIGHT = 561
const PADDING = 10

export function PrintView() {
  const rows = useDataStore(state => state.rows)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const getEnrichedRow = useDataStore(state => state.getEnrichedRow)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)

  const getFieldStyle = (fieldId: string) => {
    return fieldStyles.find(s => s.fieldId === fieldId) || {
      fieldId,
      fontSize: 12,
      fontWeight: 'normal' as const,
      textAlign: 'left' as const,
      showLabel: true,
      showBorder: true,
      colorRules: []
    }
  }

  const getDisplayName = (fieldId: string) => {
    if (fieldId.startsWith('_enriched_')) {
      return fieldId.replace('_enriched_', '')
    }
    const mapping = fieldMappings.find(m => m.columnName === fieldId)
    return mapping?.displayName || fieldId
  }

  const evaluateColorRules = (rules: ColorRule[], row: TicketRow | null) => {
    if (!row || !rules.length) return { backgroundColor: '', textColor: '' }

    for (const rule of rules) {
      const fieldValue = String(row[rule.field] || '')

      let matches = false
      switch (rule.operator) {
        case 'equals':
          matches = fieldValue.toLowerCase() === rule.value.toLowerCase()
          break
        case 'contains':
          matches = fieldValue.toLowerCase().includes(rule.value.toLowerCase())
          break
        case 'notEmpty':
          matches = fieldValue.trim() !== ''
          break
        case 'empty':
          matches = fieldValue.trim() === ''
          break
      }

      if (matches) {
        return { backgroundColor: rule.backgroundColor, textColor: rule.textColor }
      }
    }
    return { backgroundColor: '', textColor: '' }
  }

  const handlePrint = () => {
    window.print()
  }

  const colWidth = (CARD_WIDTH - PADDING * 2) / GRID_COLS

  const getAllLayouts = (enrichedRow: Record<string, unknown>) => {
    const allLayouts = [...fieldLayouts]

    if (enrichmentGroup) {
      const groupValue = enrichedRow[enrichmentGroup.groupField]
      const enrichedFields = groupValue
        ? enrichmentGroup.enrichments[String(groupValue)]
        : null

      if (enrichedFields) {
        let maxY = Math.max(0, ...fieldLayouts.map(l => l.y + l.h))
        Object.keys(enrichedFields).forEach((fieldName, i) => {
          const exists = allLayouts.find(l => l.i === `_enriched_${fieldName}`)
          if (!exists) {
            allLayouts.push({
              i: `_enriched_${fieldName}`,
              x: (i % 2) * 6,
              y: maxY + Math.floor(i / 2) * 2,
              w: 6,
              h: 2
            })
          }
        })
      }
    }

    return allLayouts
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div>
      <button
        onClick={handlePrint}
        className="no-print fixed bottom-6 right-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 z-50"
      >
        Print All Cards ({rows.length})
      </button>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const enrichedRow = getEnrichedRow(row)
          const allLayouts = getAllLayouts(enrichedRow)

          return (
            <div
              key={index}
              className="print-card bg-white mx-auto shadow border border-gray-200"
              style={{
                width: CARD_WIDTH,
                minHeight: CARD_HEIGHT,
                position: 'relative',
                padding: PADDING,
                boxSizing: 'border-box'
              }}
            >
              <div className="no-print absolute top-1 right-2 text-xs text-gray-400">
                {index + 1} / {rows.length}
              </div>

              {allLayouts.map(layout => {
                const style = getFieldStyle(layout.i)
                const displayName = getDisplayName(layout.i)
                const fieldId = layout.i.startsWith('_enriched_')
                  ? layout.i.replace('_enriched_', '')
                  : layout.i
                const value = enrichedRow[fieldId] || ''
                const colors = evaluateColorRules(style.colorRules || [], enrichedRow as TicketRow)

                const left = layout.x * colWidth
                const top = layout.y * GRID_ROW_HEIGHT
                const width = layout.w * colWidth
                const height = layout.h * GRID_ROW_HEIGHT

                return (
                  <div
                    key={layout.i}
                    className={`absolute overflow-hidden ${style.showBorder ? 'border border-gray-300 rounded' : ''}`}
                    style={{
                      left: PADDING + left,
                      top: PADDING + top,
                      width: width,
                      height: height,
                      padding: 4,
                      boxSizing: 'border-box',
                      backgroundColor: colors.backgroundColor || (style.showBorder ? '#fafafa' : 'transparent'),
                      color: colors.textColor || 'inherit'
                    }}
                  >
                    {style.showLabel && (
                      <div
                        className="truncate mb-0.5"
                        style={{
                          fontSize: 10,
                          color: colors.textColor || '#9ca3af'
                        }}
                      >
                        {displayName}
                      </div>
                    )}
                    <div
                      className="overflow-hidden"
                      style={{
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        textAlign: style.textAlign,
                        lineHeight: 1.2
                      }}
                    >
                      {String(value)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
