import React, { useMemo, useState } from 'react'
import { useDataStore } from '../stores/dataStore'

export function Enrichment() {
  const columns = useDataStore(state => state.columns)
  const rows = useDataStore(state => state.rows)
  const enrichmentGroup = useDataStore(state => state.enrichmentGroup)
  const setEnrichmentGroup = useDataStore(state => state.setEnrichmentGroup)
  const setEnrichmentValue = useDataStore(state => state.setEnrichmentValue)
  const addCustomField = useDataStore(state => state.addCustomField)
  const removeCustomField = useDataStore(state => state.removeCustomField)

  const [newFieldName, setNewFieldName] = useState('')
  const [selectedGroupValue, setSelectedGroupValue] = useState<string | null>(null)

  // Get unique values for the selected group field
  const uniqueValues = useMemo(() => {
    if (!enrichmentGroup) return []
    const values = new Set<string>()
    rows.forEach(row => {
      const val = row[enrichmentGroup.groupField]
      if (val !== null && val !== undefined && val !== '') {
        values.add(String(val))
      }
    })
    return Array.from(values).sort()
  }, [enrichmentGroup, rows])

  // Count rows per group value
  const valueCounts = useMemo(() => {
    if (!enrichmentGroup) return {}
    const counts: Record<string, number> = {}
    rows.forEach(row => {
      const val = row[enrichmentGroup.groupField]
      if (val !== null && val !== undefined && val !== '') {
        const key = String(val)
        counts[key] = (counts[key] || 0) + 1
      }
    })
    return counts
  }, [enrichmentGroup, rows])

  const handleSelectGroupField = (field: string) => {
    setEnrichmentGroup({
      groupField: field,
      enrichments: {}
    })
    setSelectedGroupValue(null)
  }

  const handleAddField = () => {
    if (!selectedGroupValue || !newFieldName.trim()) return
    addCustomField(selectedGroupValue, newFieldName.trim())
    setNewFieldName('')
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Client Enrichment</h3>

      {/* Group field selector */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Group by field:</label>
        <select
          value={enrichmentGroup?.groupField || ''}
          onChange={(e) => handleSelectGroupField(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a field...</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      {/* Group values list */}
      {enrichmentGroup && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Unique values ({uniqueValues.length}):
          </label>
          <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded">
            {uniqueValues.map(value => {
              const count = valueCounts[value] || 0
              const isSelected = selectedGroupValue === value
              const hasEnrichments = enrichmentGroup.enrichments[value] &&
                Object.keys(enrichmentGroup.enrichments[value]).length > 0

              return (
                <div
                  key={value}
                  onClick={() => setSelectedGroupValue(value)}
                  className={`
                    px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0
                    flex items-center justify-between
                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className="text-sm truncate flex-1">{value}</span>
                  <div className="flex items-center gap-2">
                    {hasEnrichments && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        enriched
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {count} {count === 1 ? 'row' : 'rows'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Enrichment editor for selected value */}
      {selectedGroupValue && enrichmentGroup && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h4 className="font-medium text-sm mb-2">
            Enrichment for: <span className="text-blue-600">{selectedGroupValue}</span>
          </h4>

          {/* Existing custom fields */}
          {enrichmentGroup.enrichments[selectedGroupValue] && (
            <div className="space-y-2 mb-3">
              {Object.entries(enrichmentGroup.enrichments[selectedGroupValue]).map(([fieldName, value]) => (
                <div key={fieldName} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-24 truncate">{fieldName}:</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setEnrichmentValue(selectedGroupValue, fieldName, e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder={`Enter ${fieldName}...`}
                  />
                  <button
                    onClick={() => removeCustomField(selectedGroupValue, fieldName)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="New field name..."
            />
            <button
              onClick={handleAddField}
              disabled={!newFieldName.trim()}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded disabled:opacity-50 hover:bg-blue-600"
            >
              Add Field
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
