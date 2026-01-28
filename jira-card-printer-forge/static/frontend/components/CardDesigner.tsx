import { useMemo, useState, useEffect } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useDataStore } from '../stores/dataStore'
import { useAIStore } from '../stores/aiStore'
import { FieldLayout, ColorRule, TicketRow, CardBackgroundRule, SortedCardResult } from '../types'
import { renderMarkdown } from '../utils/markdownRenderer'
import { SortPanel } from './SortPanel'
import { applySorting } from '../utils/cardSorting'
import { applyAISorting } from '../utils/aiSorting'

const GRID_COLS = 12
const GRID_ROW_HEIGHT = 25
const CARD_WIDTH = 794
const CARD_HEIGHT = 561
const PADDING = 10

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
  const columns = useDataStore(state => state.columns)
  const cardBackgroundRules = useDataStore(state => state.cardBackgroundRules)
  const sortConfig = useDataStore(state => state.sortConfig)
  const setSortConfig = useDataStore(state => state.setSortConfig)
  const aiSortedResults = useDataStore(state => state.aiSortedResults)
  const setAISortedResults = useDataStore(state => state.setAISortedResults)
  const aiProvider = useAIStore(state => state.provider)

  const [editingRules, setEditingRules] = useState<string | null>(null)
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [aiAnalysisState, setAIAnalysisState] = useState<{
    isRunning: boolean
    error?: string
    lastRun?: number
  }>({ isRunning: false })

  const handleRunAIAnalysis = async () => {
    console.log('handleRunAIAnalysis called')
    console.log('sortConfig.aiSort:', sortConfig.aiSort)
    console.log('aiProvider:', aiProvider)
    console.log('rows.length:', rows.length)

    if (!sortConfig.aiSort) {
      console.error('No AI sort config!')
      return
    }

    if (!aiProvider) {
      console.error('No AI provider configured!')
      return
    }

    console.log('Starting AI analysis...')
    setAIAnalysisState({ isRunning: true })

    try {
      // First apply regular sorting rules
      console.log('Applying regular sorting rules...')
      const sortedResults = applySorting(rows, sortConfig)
      console.log('Regular sorting complete. Results:', sortedResults.length)

      // Then apply AI sorting on top
      console.log('Applying AI sorting...')
      const aiResults = await applyAISorting(sortedResults, sortConfig.aiSort, aiProvider)
      console.log('AI sorting complete. Results:', aiResults.length)

      setAISortedResults(aiResults)
      setAIAnalysisState({
        isRunning: false,
        lastRun: Date.now()
      })
      console.log('AI analysis complete!')
    } catch (error) {
      console.error('AI analysis failed:', error)
      setAIAnalysisState({
        isRunning: false,
        error: error instanceof Error ? error.message : 'AI analysis failed'
      })
    }
  }

  // Reset AI analysis when data or config changes
  useEffect(() => {
    setAISortedResults(null)
    setAIAnalysisState({ isRunning: false })
  }, [rows, sortConfig])

  const currentRow = useMemo(() => {
    if (rows.length === 0) return null
    const safeIndex = Math.min(previewIndex, rows.length - 1)
    const row = rows[safeIndex]
    if (!row) return null
    return getEnrichedRow(row)
  }, [rows, previewIndex, getEnrichedRow])

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
      minW: 2,
      minH: 1
    }))
    setFieldLayouts(converted)
  }

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

  const getFieldValue = (fieldId: string) => {
    if (!currentRow) return ''
    if (fieldId.startsWith('_enriched_')) {
      const fieldName = fieldId.replace('_enriched_', '')
      return currentRow[fieldName] || ''
    }
    return currentRow[fieldId] || ''
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

  const cardBackground = evaluateCardBackground(currentRow)

  const addColorRule = (fieldId: string) => {
    const style = getFieldStyle(fieldId)
    const newRule: ColorRule = {
      field: columns[0] || '',
      operator: 'equals',
      value: '',
      backgroundColor: '#dcfce7',
      textColor: '#166534'
    }
    updateFieldStyle(fieldId, {
      colorRules: [...(style.colorRules || []), newRule]
    })
  }

  const updateColorRule = (fieldId: string, index: number, updates: Partial<ColorRule>) => {
    const style = getFieldStyle(fieldId)
    const newRules = [...(style.colorRules || [])]
    newRules[index] = { ...newRules[index], ...updates }
    updateFieldStyle(fieldId, { colorRules: newRules })
  }

  const removeColorRule = (fieldId: string, index: number) => {
    const style = getFieldStyle(fieldId)
    const newRules = (style.colorRules || []).filter((_, i) => i !== index)
    updateFieldStyle(fieldId, { colorRules: newRules })
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
    minW: 2,
    minH: 1
  }))

  const autoArrange = () => {
    // Sort layouts by their current position (top to bottom, left to right)
    const sorted = [...allLayouts].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y
      return a.x - b.x
    })

    // Place items in a compact grid (2 columns)
    let currentY = 0
    let currentX = 0
    const newLayouts: FieldLayout[] = []

    for (const layout of sorted) {
      // If this item won't fit in the current row, move to next row
      if (currentX + layout.w > GRID_COLS) {
        // Find the max height of items in the current row
        const rowItems = newLayouts.filter(l => l.y === currentY)
        const maxH = rowItems.length > 0 ? Math.max(...rowItems.map(l => l.h)) : 0
        currentY += maxH
        currentX = 0
      }

      newLayouts.push({
        ...layout,
        x: currentX,
        y: currentY
      })

      currentX += layout.w
    }

    setFieldLayouts(newLayouts)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-2 px-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
            disabled={previewIndex === 0}
            className="px-3 py-1 bg-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-300"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            {previewIndex + 1} / {rows.length}
          </span>
          <button
            onClick={() => setPreviewIndex(Math.min(rows.length - 1, previewIndex + 1))}
            disabled={previewIndex === rows.length - 1}
            className="px-3 py-1 bg-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-300"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSortPanel(!showSortPanel)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
          >
            {showSortPanel ? 'Hide' : 'Sort Cards'} {sortConfig.rules.length > 0 && `(${sortConfig.rules.length})`}
          </button>
          <button
            onClick={autoArrange}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            title="Automatically arrange all fields to fill gaps"
          >
            Auto Arrange
          </button>
        </div>
      </div>

      {/* Sort Panel */}
      {showSortPanel && (
        <div className="mb-3 px-2 max-h-96 overflow-y-auto border-b pb-3 flex-shrink-0">
          <div className="bg-white p-3 rounded border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Card Sorting Configuration</h3>
              <button
                onClick={() => setShowSortPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                x
              </button>
            </div>
            <SortPanel
              config={sortConfig}
              columns={columns}
              onConfigChange={setSortConfig}
              onRunAIAnalysis={handleRunAIAnalysis}
              aiAnalysisState={aiAnalysisState}
            />
          </div>
        </div>
      )}

      {/* Card Canvas - scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="flex justify-center pb-4">
          <div
            className="border border-gray-300 shadow-sm"
            style={{
              width: CARD_WIDTH,
              minHeight: CARD_HEIGHT,
              padding: PADDING,
              position: 'relative',
              backgroundColor: cardBackground
            }}
          >
            <GridLayout
              className="layout"
              layout={gridLayouts}
              cols={GRID_COLS}
              rowHeight={GRID_ROW_HEIGHT}
              width={CARD_WIDTH - PADDING * 2}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              compactType={null}
              preventCollision={false}
              isResizable={true}
              resizeHandles={['se']}
            >
              {allLayouts.map(layout => {
                const style = getFieldStyle(layout.i)
                const displayName = getDisplayName(layout.i)
                const value = getFieldValue(layout.i)
                const colors = evaluateColorRules(style.colorRules || [], currentRow)

                return (
                  <div
                    key={layout.i}
                    className={`relative group ${style.showBorder ? 'border border-gray-300 rounded' : ''}`}
                    style={{
                      backgroundColor: colors.backgroundColor || (style.showBorder ? '#fafafa' : 'transparent'),
                      color: colors.textColor || 'inherit'
                    }}
                  >
                    <div className="drag-handle cursor-move h-full flex flex-col p-1 overflow-hidden">
                      {style.showLabel && (
                        <div
                          className="text-[10px] mb-0.5 truncate"
                          style={{ color: colors.textColor ? colors.textColor : '#9ca3af' }}
                        >
                          {displayName}
                        </div>
                      )}
                      <div
                        className="flex-1 overflow-hidden leading-tight"
                        style={{
                          fontSize: style.fontSize,
                          fontWeight: style.fontWeight,
                          textAlign: style.textAlign
                        }}
                      >
                        {renderMarkdown(String(value))}
                      </div>
                    </div>

                    {/* Style controls on hover */}
                    <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 bg-white shadow-lg rounded p-1 flex gap-1 z-20 border">
                      <button
                        onClick={() => updateFieldStyle(layout.i, {
                          fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold'
                        })}
                        className={`w-6 h-6 text-xs rounded font-bold ${style.fontWeight === 'bold' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        onClick={() => updateFieldStyle(layout.i, {
                          fontSize: Math.min(20, style.fontSize + 1)
                        })}
                        className="w-6 h-6 text-xs rounded hover:bg-gray-100"
                        title="Increase font"
                      >
                        +
                      </button>
                      <button
                        onClick={() => updateFieldStyle(layout.i, {
                          fontSize: Math.max(8, style.fontSize - 1)
                        })}
                        className="w-6 h-6 text-xs rounded hover:bg-gray-100"
                        title="Decrease font"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateFieldStyle(layout.i, { showLabel: !style.showLabel })}
                        className={`w-6 h-6 text-xs rounded ${style.showLabel ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                        title="Toggle label"
                      >
                        L
                      </button>
                      <button
                        onClick={() => updateFieldStyle(layout.i, { showBorder: !style.showBorder })}
                        className={`w-6 h-6 text-xs rounded ${style.showBorder ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                        title="Toggle border"
                      >
                        []
                      </button>
                      <button
                        onClick={() => setEditingRules(editingRules === layout.i ? null : layout.i)}
                        className={`w-6 h-6 text-xs rounded ${(style.colorRules?.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
                        title="Color rules"
                      >
                        C
                      </button>
                    </div>

                    {/* Color rules editor */}
                    {editingRules === layout.i && (
                      <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg p-3 z-30 border w-80">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">Color Rules</span>
                          <button
                            onClick={() => setEditingRules(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            x
                          </button>
                        </div>

                        {(style.colorRules || []).map((rule, idx) => (
                          <div key={idx} className="mb-2 p-2 bg-gray-50 rounded text-xs">
                            <div className="flex gap-1 mb-1">
                              <select
                                value={rule.field}
                                onChange={(e) => updateColorRule(layout.i, idx, { field: e.target.value })}
                                className="flex-1 border rounded px-1 py-0.5"
                              >
                                {columns.map(col => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </select>
                              <select
                                value={rule.operator}
                                onChange={(e) => updateColorRule(layout.i, idx, { operator: e.target.value as ColorRule['operator'] })}
                                className="border rounded px-1 py-0.5"
                              >
                                <option value="equals">=</option>
                                <option value="contains">contains</option>
                                <option value="notEmpty">not empty</option>
                                <option value="empty">empty</option>
                              </select>
                            </div>
                            {(rule.operator === 'equals' || rule.operator === 'contains') && (
                              <input
                                type="text"
                                value={rule.value}
                                onChange={(e) => updateColorRule(layout.i, idx, { value: e.target.value })}
                                placeholder="Value..."
                                className="w-full border rounded px-1 py-0.5 mb-1"
                              />
                            )}
                            <div className="flex gap-1 items-center">
                              <label className="text-gray-500">BG:</label>
                              <input
                                type="color"
                                value={rule.backgroundColor}
                                onChange={(e) => updateColorRule(layout.i, idx, { backgroundColor: e.target.value })}
                                className="w-6 h-6 border rounded"
                              />
                              <label className="text-gray-500 ml-2">Text:</label>
                              <input
                                type="color"
                                value={rule.textColor}
                                onChange={(e) => updateColorRule(layout.i, idx, { textColor: e.target.value })}
                                className="w-6 h-6 border rounded"
                              />
                              <button
                                onClick={() => removeColorRule(layout.i, idx)}
                                className="ml-auto text-red-500 hover:text-red-700"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => addColorRule(layout.i)}
                          className="w-full py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          + Add Rule
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </GridLayout>
          </div>
        </div>
      </div>
    </div>
  )
}
