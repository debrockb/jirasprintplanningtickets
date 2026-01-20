import React from 'react'
import { useDataStore } from '../stores/dataStore'

export function FieldMapper() {
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const updateFieldMapping = useDataStore(state => state.updateFieldMapping)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const setFieldLayouts = useDataStore(state => state.setFieldLayouts)

  const handleToggle = (columnName: string, enabled: boolean) => {
    updateFieldMapping(columnName, { enabled })

    if (enabled) {
      // Add to layout if not present
      const exists = fieldLayouts.find(l => l.i === columnName)
      if (!exists) {
        const maxY = Math.max(0, ...fieldLayouts.map(l => l.y + l.h))
        setFieldLayouts([
          ...fieldLayouts,
          { i: columnName, x: 0, y: maxY, w: 6, h: 2, minW: 2, minH: 1 }
        ])
      }
    } else {
      // Remove from layout
      setFieldLayouts(fieldLayouts.filter(l => l.i !== columnName))
    }
  }

  const handleRename = (columnName: string, displayName: string) => {
    updateFieldMapping(columnName, { displayName })
  }

  if (fieldMappings.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Field Mapping</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {fieldMappings.map(mapping => (
          <div
            key={mapping.columnName}
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={mapping.enabled}
              onChange={(e) => handleToggle(mapping.columnName, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 truncate">
                {mapping.columnName}
              </div>
              <input
                type="text"
                value={mapping.displayName}
                onChange={(e) => handleRename(mapping.columnName, e.target.value)}
                className="w-full text-sm border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 p-0 bg-transparent"
                placeholder="Display name..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
