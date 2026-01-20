import React, { useMemo } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useDataStore } from '../stores/dataStore'
import { FieldLayout } from '../types'

const GRID_COLS = 12
const GRID_ROW_HEIGHT = 30
const CARD_WIDTH = 794  // 210mm at 96dpi
const CARD_HEIGHT = 561 // 148.5mm at 96dpi

export function CardDesigner() {
  const rows = useDataStore(state => state.rows)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const setFieldLayouts = useDataStore(state => state.setFieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const updateFieldStyle = useDataStore(state => state.updateFieldStyle)
  const previewIndex = useDataStore(state => state.previewIndex)
  const setPreviewIndex = useDataStore(state => state.setPreviewIndex)
  const getEnrichedRow = useDataStore(state => state.getEnrichedRow)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)

  const enabledMappings = useMemo(() =>
    fieldMappings.filter(m => m.enabled),
    [fieldMappings]
  )

  const currentRow = useMemo(() => {
    if (rows.length === 0) return null
    return getEnrichedRow(rows[previewIndex])
  }, [rows, previewIndex, getEnrichedRow])

  // Add enrichment custom fields to layouts if they exist
  const allLayouts = useMemo(() => {
    if (!enrichmentGroup || !currentRow) return fieldLayouts

    const enrichedFields = enrichmentGroup.enrichments[String(currentRow[enrichmentGroup.groupField])]
    if (!enrichedFields) return fieldLayouts

    const enrichedLayouts: FieldLayout[] = []
    let maxY = Math.max(0, ...fieldLayouts.map(l => l.y + l.h))

    Object.keys(enrichedFields).forEach((fieldName, i) => {
      const exists = fieldLayouts.find(l => l.i === `_enriched_${fieldName}`)
      if (!exists) {
        enrichedLayouts.push({
          i: `_enriched_${fieldName}`,
          x: (i % 2) * 6,
          y: maxY + Math.floor(i / 2) * 2,
          w: 6,
          h: 2,
          minW: 2,
          minH: 1
        })
      }
    })

    return [...fieldLayouts, ...enrichedLayouts]
  }, [fieldLayouts, enrichmentGroup, currentRow])

  const handleLayoutChange = (newLayout: Layout[]) => {
    const converted: FieldLayout[] = newLayout.map(l => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      minW: l.minW,
      minH: l.minH
    }))
    setFieldLayouts(converted)
  }

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

  const getFieldValue = (fieldId: string) => {
    if (!currentRow) return ''
    if (fieldId.startsWith('_enriched_')) {
      const fieldName = fieldId.replace('_enriched_', '')
      return currentRow[fieldName] || ''
    }
    return currentRow[fieldId] || ''
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Upload a file to start designing cards</p>
      </div>
    )
  }

  const gridLayouts: Layout[] = allLayouts.map(l => ({
    ...l,
    minW: l.minW || 2,
    minH: l.minH || 1
  }))

  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
          disabled={previewIndex === 0}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Card {previewIndex + 1} of {rows.length}
        </span>
        <button
          onClick={() => setPreviewIndex(Math.min(rows.length - 1, previewIndex + 1))}
          disabled={previewIndex === rows.length - 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>

      {/* Card Canvas */}
      <div className="flex-1 overflow-auto flex justify-center">
        <div
          className="card-preview bg-white border border-gray-200"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT, padding: 20 }}
        >
          <GridLayout
            className="layout"
            layout={gridLayouts}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            width={CARD_WIDTH - 40}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            compactType={null}
            preventCollision={false}
          >
            {allLayouts.map(layout => {
              const style = getFieldStyle(layout.i)
              const displayName = getDisplayName(layout.i)
              const value = getFieldValue(layout.i)

              return (
                <div
                  key={layout.i}
                  className="bg-gray-50 border border-gray-200 rounded p-2 overflow-hidden group"
                >
                  <div className="drag-handle cursor-move h-full flex flex-col">
                    {style.showLabel && (
                      <div className="text-xs text-gray-400 mb-1 truncate">
                        {displayName}
                      </div>
                    )}
                    <div
                      className="flex-1 overflow-hidden"
                      style={{
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        textAlign: style.textAlign
                      }}
                    >
                      {String(value)}
                    </div>
                  </div>

                  {/* Style controls on hover */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-white shadow rounded p-1 flex gap-1 z-10">
                    <button
                      onClick={() => updateFieldStyle(layout.i, {
                        fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold'
                      })}
                      className={`w-6 h-6 text-xs rounded ${style.fontWeight === 'bold' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateFieldStyle(layout.i, {
                        fontSize: Math.min(24, style.fontSize + 2)
                      })}
                      className="w-6 h-6 text-xs rounded hover:bg-gray-100"
                    >
                      A+
                    </button>
                    <button
                      onClick={() => updateFieldStyle(layout.i, {
                        fontSize: Math.max(10, style.fontSize - 2)
                      })}
                      className="w-6 h-6 text-xs rounded hover:bg-gray-100"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => updateFieldStyle(layout.i, { showLabel: !style.showLabel })}
                      className={`w-6 h-6 text-xs rounded ${style.showLabel ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    >
                      L
                    </button>
                  </div>
                </div>
              )
            })}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
