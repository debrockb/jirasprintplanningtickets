import { useMemo } from 'react'
import { useDataStore } from '../stores/dataStore'

export function FieldMapper() {
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const updateFieldMapping = useDataStore(state => state.updateFieldMapping)
  const setFieldMappings = useDataStore(state => state.setFieldMappings)
  const fieldLayouts = useDataStore(state => state.fieldLayouts)
  const setFieldLayouts = useDataStore(state => state.setFieldLayouts)

  const selectedCount = useMemo(() =>
    fieldMappings.filter(m => m.enabled).length,
    [fieldMappings]
  )

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

  const handleSelectAll = () => {
    // Enable all fields
    const updatedMappings = fieldMappings.map(m => ({ ...m, enabled: true }))
    setFieldMappings(updatedMappings)

    // Add all to layout
    let currentY = 0
    const newLayouts = fieldMappings.map((m, i) => {
      const existing = fieldLayouts.find(l => l.i === m.columnName)
      if (existing) return existing

      const layout = {
        i: m.columnName,
        x: (i % 2) * 6,
        y: currentY,
        w: 6,
        h: 2,
        minW: 2,
        minH: 1
      }
      if (i % 2 === 1) currentY += 2
      return layout
    })
    setFieldLayouts(newLayouts)
  }

  const handleDeselectAll = () => {
    // Disable all fields
    const updatedMappings = fieldMappings.map(m => ({ ...m, enabled: false }))
    setFieldMappings(updatedMappings)

    // Clear layouts
    setFieldLayouts([])
  }

  const handleRename = (columnName: string, displayName: string) => {
    updateFieldMapping(columnName, { displayName })
  }

  if (fieldMappings.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Field Mapping</h3>
        <span className="text-xs text-gray-400">
          {selectedCount}/{fieldMappings.length}
        </span>
      </div>

      {/* Select/Deselect buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelectAll}
          disabled={selectedCount === fieldMappings.length}
          className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select All
        </button>
        <button
          onClick={handleDeselectAll}
          disabled={selectedCount === 0}
          className="flex-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Deselect All
        </button>
      </div>

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
