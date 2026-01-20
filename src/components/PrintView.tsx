import React, { useMemo } from 'react'
import { useDataStore } from '../stores/dataStore'

export function PrintView() {
  const rows = useDataStore(state => state.rows)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const getEnrichedRow = useDataStore(state => state.getEnrichedRow)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)

  const enabledMappings = useMemo(() =>
    fieldMappings.filter(m => m.enabled),
    [fieldMappings]
  )

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

  if (rows.length === 0) {
    return null
  }

  // Calculate grid positions (convert from react-grid-layout units to CSS)
  const gridColWidth = (210 - 20) / 12  // mm, accounting for padding
  const gridRowHeight = (148.5 - 20) / 18  // mm, 18 rows max

  return (
    <div>
      {/* Print button (hidden when printing) */}
      <button
        onClick={handlePrint}
        className="no-print fixed bottom-6 right-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 z-50"
      >
        Print All Cards ({rows.length})
      </button>

      {/* Print content */}
      <div className="print-content">
        {rows.map((row, index) => {
          const enrichedRow = getEnrichedRow(row)

          // Get all layouts including enriched fields
          const allLayouts = [...fieldLayouts]
          if (enrichmentGroup) {
            const groupValue = enrichedRow[enrichmentGroup.groupField]
            const enrichedFields = groupValue ?
              enrichmentGroup.enrichments[String(groupValue)] : null
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

          return (
            <div key={index} className="print-card relative">
              {allLayouts.map(layout => {
                const style = getFieldStyle(layout.i)
                const displayName = getDisplayName(layout.i)
                const fieldId = layout.i.startsWith('_enriched_')
                  ? layout.i.replace('_enriched_', '')
                  : layout.i
                const value = enrichedRow[fieldId] || ''

                // Calculate position
                const left = layout.x * gridColWidth + 10
                const top = layout.y * gridRowHeight + 10
                const width = layout.w * gridColWidth
                const height = layout.h * gridRowHeight

                return (
                  <div
                    key={layout.i}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${left}mm`,
                      top: `${top}mm`,
                      width: `${width}mm`,
                      height: `${height}mm`,
                      padding: '2mm'
                    }}
                  >
                    {style.showLabel && (
                      <div className="text-xs text-gray-400 mb-1">
                        {displayName}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: `${style.fontSize}px`,
                        fontWeight: style.fontWeight,
                        textAlign: style.textAlign
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
