import React, { useMemo } from 'react'
import { useDataStore } from '../stores/dataStore'

// Match the CardDesigner dimensions
const GRID_COLS = 12
const GRID_ROW_HEIGHT = 30
const CARD_WIDTH = 794  // pixels (210mm at 96dpi)
const CARD_HEIGHT = 561 // pixels (148.5mm at 96dpi)
const PADDING = 20

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
      fontSize: 14,
      fontWeight: 'normal' as const,
      textAlign: 'left' as const,
      showLabel: true
    }
  }

  const getDisplayName = (fieldId: string) => {
    if (fieldId.startsWith('_enriched_')) {
      return fieldId.replace('_enriched_', '')
    }
    const mapping = fieldMappings.find(m => m.columnName === fieldId)
    return mapping?.displayName || fieldId
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate column width in pixels
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
      {/* Print button (hidden when printing) */}
      <button
        onClick={handlePrint}
        className="no-print fixed bottom-6 right-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 z-50"
      >
        Print All Cards ({rows.length})
      </button>

      {/* Print preview - scrollable list of cards */}
      <div className="space-y-8">
        {rows.map((row, index) => {
          const enrichedRow = getEnrichedRow(row)
          const allLayouts = getAllLayouts(enrichedRow)

          return (
            <div
              key={index}
              className="print-card bg-white mx-auto shadow-lg border border-gray-200"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                position: 'relative',
                padding: PADDING,
                boxSizing: 'border-box'
              }}
            >
              {/* Card number indicator (preview only) */}
              <div className="no-print absolute top-2 right-2 text-xs text-gray-400">
                Card {index + 1} / {rows.length}
              </div>

              {allLayouts.map(layout => {
                const style = getFieldStyle(layout.i)
                const displayName = getDisplayName(layout.i)
                const fieldId = layout.i.startsWith('_enriched_')
                  ? layout.i.replace('_enriched_', '')
                  : layout.i
                const value = enrichedRow[fieldId] || ''

                // Calculate position using same formula as CardDesigner
                const left = layout.x * colWidth
                const top = layout.y * GRID_ROW_HEIGHT
                const width = layout.w * colWidth
                const height = layout.h * GRID_ROW_HEIGHT

                return (
                  <div
                    key={layout.i}
                    className="absolute overflow-hidden"
                    style={{
                      left: PADDING + left,
                      top: PADDING + top,
                      width: width,
                      height: height,
                      padding: 8,
                      boxSizing: 'border-box'
                    }}
                  >
                    {style.showLabel && (
                      <div
                        className="text-gray-400 mb-1 truncate"
                        style={{ fontSize: 11 }}
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
                        lineHeight: 1.3
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
