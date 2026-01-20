import { useState } from 'react'
import { useDataStore } from '../stores/dataStore'
import { ColorRule, TicketRow, CardBackgroundRule } from '../types'

const GRID_COLS = 12
const PADDING = 10

// A4 at 96 DPI: 794 x 1123 px, Half A4: 794 x 561 px
const SIZES = {
  'half-a4': { width: 794, height: 561, rowHeight: 25, label: 'Half A4 (2 per page)' },
  'a4': { width: 794, height: 1123, rowHeight: 50, label: 'Full A4 (1 per page)' }
}

type PrintSize = keyof typeof SIZES

export function PrintView() {
  const [printSize, setPrintSize] = useState<PrintSize>('half-a4')
  const rows = useDataStore(state => state.rows)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const getEnrichedRow = useDataStore(state => state.getEnrichedRow)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)
  const cardBackgroundRules = useDataStore(state => state.cardBackgroundRules)

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

  const evaluateCardBackground = (row: TicketRow | null): string => {
    if (!row || !cardBackgroundRules.length) return 'white'

    for (const rule of cardBackgroundRules) {
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
        return rule.backgroundColor
      }
    }
    return 'white'
  }

  const handlePrint = () => {
    window.print()
  }

  const { width: CARD_WIDTH, height: CARD_HEIGHT, rowHeight: GRID_ROW_HEIGHT } = SIZES[printSize]
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
    <div className={`print-container size-${printSize}`}>
      {/* Print controls */}
      <div className="no-print fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <select
          value={printSize}
          onChange={(e) => setPrintSize(e.target.value as PrintSize)}
          className="px-3 py-2 bg-white border rounded-lg shadow-lg text-sm"
        >
          {Object.entries(SIZES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
        >
          Print All Cards ({rows.length})
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const enrichedRow = getEnrichedRow(row)
          const allLayouts = getAllLayouts(enrichedRow)
          const cardBgColor = evaluateCardBackground(enrichedRow as TicketRow)

          return (
            <div
              key={index}
              className="print-card mx-auto shadow border border-gray-200"
              style={{
                width: CARD_WIDTH,
                minHeight: CARD_HEIGHT,
                position: 'relative',
                padding: PADDING,
                boxSizing: 'border-box',
                backgroundColor: cardBgColor
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
