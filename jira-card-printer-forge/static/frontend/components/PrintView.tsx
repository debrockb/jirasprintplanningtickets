import { useState, useMemo, useEffect } from 'react'
import { useDataStore } from '../stores/dataStore'
import { ColorRule, TicketRow, CardBackgroundRule, FieldLayout } from '../types'
import { renderMarkdown } from '../utils/markdownRenderer'
import { applySorting } from '../utils/cardSorting'

const GRID_COLS = 12
const BASE_PADDING_PERCENT = 1.5 // padding as percentage

// Use mm for print consistency
const SIZES = {
  'half-a4': { width: '210mm', height: '148.5mm', label: 'Half A4' },
  'a4': { width: '210mm', height: '297mm', label: 'Full A4' }
}

type PrintSize = keyof typeof SIZES

export function PrintView() {
  const [printSize, setPrintSize] = useState<PrintSize>('half-a4')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const rawRows = useDataStore(state => state.rows)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const getEnrichedRow = useDataStore(state => state.getEnrichedRow)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)
  const cardBackgroundRules = useDataStore(state => state.cardBackgroundRules)
  const sortConfig = useDataStore(state => state.sortConfig)
  const aiSortedResults = useDataStore(state => state.aiSortedResults)

  // Show scroll to top button when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Apply sorting - use AI results if available, otherwise apply regular sorting
  const sortedResults = useMemo(() => {
    console.log('PrintView: Sorting tickets...')
    console.log('rawRows:', rawRows.length)
    console.log('sortConfig:', JSON.stringify(sortConfig, null, 2))
    console.log('aiSortedResults:', aiSortedResults?.length || 'null')

    if (aiSortedResults && aiSortedResults.length > 0) {
      console.log('PrintView: Using AI-sorted results', aiSortedResults.length)
      return aiSortedResults
    }

    console.log('PrintView: Applying regular sorting...')
    const sorted = applySorting(rawRows, sortConfig)
    console.log('PrintView: Regular sorting complete. Results:', sorted.length)

    return sorted
  }, [rawRows, sortConfig, aiSortedResults])

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

  const { width: CARD_WIDTH_MM, height: CARD_HEIGHT_MM } = SIZES[printSize]

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

  if (sortedResults.length === 0) {
    return null
  }

  return (
    <div className={`print-container size-${printSize}`}>
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="no-print fixed top-24 left-6 z-50 px-4 py-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all"
          title="Scroll to top"
        >
          Top
        </button>
      )}

      {/* Print controls */}
      <div className="no-print fixed bottom-6 right-6 flex flex-col gap-2 z-50 bg-white p-3 rounded-lg shadow-lg border">
        <select
          value={printSize}
          onChange={(e) => setPrintSize(e.target.value as PrintSize)}
          className="px-3 py-2 bg-white border rounded text-sm"
        >
          {Object.entries(SIZES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Sort status */}
        {sortConfig.rules.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              <strong>Sorting active:</strong> {sortConfig.rules.length} rule{sortConfig.rules.length > 1 ? 's' : ''} applied
              <div className="text-xs text-gray-500 mt-1">
                Configure sorting in the "Design Cards" tab
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Print All Cards ({sortedResults.length})
        </button>
      </div>

      <div className="space-y-4">
        {sortedResults.map((result, displayIndex) => {
          const { row, originalIndex, groupId, groupSize } = result
          const enrichedRow = getEnrichedRow(row)
          const allLayouts = getAllLayouts(enrichedRow)
          const cardBgColor = evaluateCardBackground(enrichedRow as TicketRow)

          // Find max grid extent for percentage calculations
          const maxGridX = GRID_COLS // Always use full 12 columns
          let maxGridY = 0
          for (const layout of allLayouts) {
            maxGridY = Math.max(maxGridY, layout.y + layout.h)
          }
          if (maxGridY === 0) maxGridY = 10 // default

          // Content area percentage (leaving padding on edges)
          const contentWidthPercent = 100 - 2 * BASE_PADDING_PERCENT
          const contentHeightPercent = 100 - 2 * BASE_PADDING_PERCENT

          return (
            <div
              key={displayIndex}
              className="print-card mx-auto shadow border border-gray-200"
              style={{
                width: CARD_WIDTH_MM,
                height: CARD_HEIGHT_MM,
                position: 'relative',
                boxSizing: 'border-box',
                backgroundColor: cardBgColor,
                overflow: 'hidden'
              }}
            >
              <div className="no-print absolute top-1 right-2 text-xs text-gray-400" style={{ zIndex: 10 }}>
                {displayIndex + 1} / {sortedResults.length}
              </div>

              {/* Card numbering - bottom right corner */}
              <div
                className="print-show absolute bottom-1 right-2 text-xs text-gray-400"
                style={{
                  zIndex: 5,
                  fontSize: '8px',
                  fontWeight: 300
                }}
              >
                #{displayIndex + 1}
                {groupId && groupSize && groupSize > 1 && (
                  <span className="ml-1 text-gray-300">
                    (group: {groupSize})
                  </span>
                )}
              </div>

              {allLayouts.map(layout => {
                const style = getFieldStyle(layout.i)
                const displayName = getDisplayName(layout.i)
                const fieldId = layout.i.startsWith('_enriched_')
                  ? layout.i.replace('_enriched_', '')
                  : layout.i
                const value = enrichedRow[fieldId] || ''
                const colors = evaluateColorRules(style.colorRules || [], enrichedRow as TicketRow)

                // Calculate positions as percentages of the card
                const leftPercent = BASE_PADDING_PERCENT + (layout.x / maxGridX) * contentWidthPercent
                const topPercent = BASE_PADDING_PERCENT + (layout.y / maxGridY) * contentHeightPercent
                const widthPercent = (layout.w / maxGridX) * contentWidthPercent
                const heightPercent = (layout.h / maxGridY) * contentHeightPercent

                // Auto-adjust font size based on content length and field type
                const valueStr = String(value)
                const isLongTextField = fieldId.toLowerCase().includes('description') ||
                                        fieldId.toLowerCase().includes('notes') ||
                                        fieldId.toLowerCase().includes('workshop') ||
                                        fieldId.toLowerCase().includes('summary') ||
                                        valueStr.length > 200

                // Use smaller font for long text fields, larger for short fields
                const scaledFontSize = isLongTextField
                  ? Math.max(16, Math.min(style.fontSize, 18))  // Cap at 18px for long text
                  : Math.max(24, style.fontSize)
                const scaledLabelSize = Math.max(12, style.fontSize * 0.6)
                const fieldPadding = 6

                return (
                  <div
                    key={layout.i}
                    className={`absolute ${style.showBorder ? 'border border-gray-400 rounded' : ''}`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      padding: fieldPadding,
                      boxSizing: 'border-box',
                      backgroundColor: colors.backgroundColor || (style.showBorder ? '#fafafa' : 'transparent'),
                      color: colors.textColor || 'inherit',
                      overflow: 'hidden'
                    }}
                  >
                    {style.showLabel && (
                      <div
                        className="truncate mb-1"
                        style={{
                          fontSize: scaledLabelSize,
                          fontWeight: 500,
                          color: colors.textColor || '#6b7280'
                        }}
                      >
                        {displayName}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: scaledFontSize,
                        fontWeight: style.fontWeight,
                        textAlign: style.textAlign,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        wordWrap: 'break-word'
                      }}
                    >
                      {renderMarkdown(String(value))}
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
