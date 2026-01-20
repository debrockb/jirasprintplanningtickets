import React, { useState, useRef } from 'react'
import { useTemplateStore } from '../stores/templateStore'
import { useDataStore } from '../stores/dataStore'

export function TemplateManager() {
  const [showModal, setShowModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [activeTab, setActiveTab] = useState<'templates' | 'enrichments' | 'export'>('templates')
  const [enrichmentName, setEnrichmentName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const templates = useTemplateStore(state => state.templates)
  const saveTemplate = useTemplateStore(state => state.saveTemplate)
  const loadTemplate = useTemplateStore(state => state.loadTemplate)
  const deleteTemplate = useTemplateStore(state => state.deleteTemplate)

  const savedEnrichments = useTemplateStore(state => state.savedEnrichments)
  const saveEnrichment = useTemplateStore(state => state.saveEnrichment)
  const loadEnrichment = useTemplateStore(state => state.loadEnrichment)
  const deleteEnrichment = useTemplateStore(state => state.deleteEnrichment)

  const exportAll = useTemplateStore(state => state.exportAll)
  const importAll = useTemplateStore(state => state.importAll)

  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const columns = useDataStore(state => state.columns)
  const cardBackgroundRules = useDataStore(state => state.cardBackgroundRules)
  const setFieldMappings = useDataStore(state => state.setFieldMappings)
  const setFieldLayouts = useDataStore(state => state.setFieldLayouts)
  const setFieldStyles = useDataStore(state => state.setFieldStyles)
  const setCardBackgroundRules = useDataStore(state => state.setCardBackgroundRules)

  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)
  const setEnrichmentGroup = useDataStore(state => state.setEnrichmentGroup)

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return
    saveTemplate(templateName.trim(), fieldMappings, fieldLayouts, fieldStyles, cardBackgroundRules)
    setTemplateName('')
  }

  const handleLoadTemplate = (id: string) => {
    const template = loadTemplate(id)
    if (!template) return

    // Smart column mapping: adapt template to current Excel columns
    // Build a map from old column names to new column names
    const columnMap = new Map<string, string>()
    const usedCurrentColumns = new Set<string>()

    // First pass: match by exact column name
    for (const oldMapping of template.fieldMappings) {
      if (columns.includes(oldMapping.columnName)) {
        columnMap.set(oldMapping.columnName, oldMapping.columnName)
        usedCurrentColumns.add(oldMapping.columnName)
      }
    }

    // Second pass: match by column index for columns that weren't matched by name
    for (const oldMapping of template.fieldMappings) {
      if (!columnMap.has(oldMapping.columnName)) {
        const columnIndex = oldMapping.columnIndex ?? -1
        if (columnIndex >= 0 && columnIndex < columns.length) {
          const newColumnName = columns[columnIndex]
          if (!usedCurrentColumns.has(newColumnName)) {
            columnMap.set(oldMapping.columnName, newColumnName)
            usedCurrentColumns.add(newColumnName)
          }
        }
      }
    }

    // Transform field mappings
    const newMappings = columns.map((col, index) => {
      // Find if this column was in the template (by name or mapped from index)
      const oldColumnName = Array.from(columnMap.entries()).find(([_, newName]) => newName === col)?.[0]
      const oldMapping = oldColumnName ? template.fieldMappings.find(m => m.columnName === oldColumnName) : null

      if (oldMapping) {
        return {
          columnName: col,
          displayName: oldMapping.displayName !== oldMapping.columnName ? oldMapping.displayName : col,
          enabled: oldMapping.enabled,
          columnIndex: index
        }
      } else {
        // New column not in template - add as disabled
        return {
          columnName: col,
          displayName: col,
          enabled: false,
          columnIndex: index
        }
      }
    })

    // Transform field layouts
    const newLayouts = template.fieldLayouts
      .map(layout => {
        const newColumnName = columnMap.get(layout.i)
        if (newColumnName) {
          return { ...layout, i: newColumnName }
        }
        return null
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)

    // Transform field styles
    const newStyles = template.fieldStyles
      .map(style => {
        const newColumnName = columnMap.get(style.fieldId)
        if (newColumnName) {
          // Also update color rules to use new column names
          const updatedColorRules = (style.colorRules || []).map(rule => ({
            ...rule,
            field: columnMap.get(rule.field) || rule.field
          }))
          return { ...style, fieldId: newColumnName, colorRules: updatedColorRules }
        }
        return null
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    // Add default styles for new columns not in template
    const styledColumns = new Set(newStyles.map(s => s.fieldId))
    for (const col of columns) {
      if (!styledColumns.has(col)) {
        newStyles.push({
          fieldId: col,
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'left',
          showLabel: true,
          showBorder: true,
          colorRules: []
        })
      }
    }

    setFieldMappings(newMappings)
    setFieldLayouts(newLayouts)
    setFieldStyles(newStyles)

    // Load card background rules, updating field names based on column mapping
    const updatedCardBgRules = (template.cardBackgroundRules || []).map(rule => ({
      ...rule,
      field: columnMap.get(rule.field) || rule.field
    }))
    setCardBackgroundRules(updatedCardBgRules)

    setShowModal(false)
  }

  const handleSaveEnrichment = () => {
    if (!enrichmentName.trim() || !enrichmentGroup) return
    saveEnrichment(enrichmentName.trim(), enrichmentGroup)
    setEnrichmentName('')
  }

  const handleLoadEnrichment = (id: string) => {
    const saved = loadEnrichment(id)
    if (saved) {
      setEnrichmentGroup(saved.enrichmentGroup)
      setShowModal(false)
    }
  }

  const handleExport = () => {
    const json = exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ticket-card-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const json = event.target?.result as string
      if (importAll(json)) {
        alert('Configuration imported successfully!')
      } else {
        alert('Failed to import configuration. Invalid file format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
      >
        Templates
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Saved Configurations</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                X
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'templates'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                Card Templates ({templates.length})
              </button>
              <button
                onClick={() => setActiveTab('enrichments')}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'enrichments'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                Enrichments ({savedEnrichments.length})
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'export'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                Export/Import
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'templates' && (
                <div className="space-y-4">
                  {/* Save current */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim() || fieldLayouts.length === 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-600"
                    >
                      Save Current
                    </button>
                  </div>

                  {/* List */}
                  {templates.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No saved templates</p>
                  ) : (
                    <div className="space-y-2">
                      {templates.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-gray-400">{formatDate(t.createdAt)}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLoadTemplate(t.id)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deleteTemplate(t.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'enrichments' && (
                <div className="space-y-4">
                  {/* Save current */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={enrichmentName}
                      onChange={(e) => setEnrichmentName(e.target.value)}
                      placeholder="Enrichment name..."
                      className="flex-1 border rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleSaveEnrichment}
                      disabled={!enrichmentName.trim() || !enrichmentGroup}
                      className="px-4 py-2 bg-blue-500 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-600"
                    >
                      Save Current
                    </button>
                  </div>

                  {/* List */}
                  {savedEnrichments.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No saved enrichments</p>
                  ) : (
                    <div className="space-y-2">
                      {savedEnrichments.map(e => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium">{e.name}</div>
                            <div className="text-xs text-gray-400">
                              {formatDate(e.createdAt)} - {e.enrichmentGroup.groupField}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLoadEnrichment(e.id)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deleteEnrichment(e.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <h3 className="font-medium mb-2">Export Configuration</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Download all your saved templates and enrichments as a JSON file.
                    </p>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Export to File
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded">
                    <h3 className="font-medium mb-2">Import Configuration</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Load templates and enrichments from a previously exported JSON file.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Import from File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
