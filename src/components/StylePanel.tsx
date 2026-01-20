import { useState } from 'react'
import { useDataStore } from '../stores/dataStore'
import { ColorRule, CardBackgroundRule } from '../types'

export function StylePanel() {
  const columns = useDataStore(state => state.columns)
  const fieldMappings = useDataStore(state => state.fieldMappings)
  const fieldStyles = useDataStore(state => state.fieldStyles)
  const updateFieldStyle = useDataStore(state => state.updateFieldStyle)
  const cardBackgroundRules = useDataStore(state => state.cardBackgroundRules)
  const setCardBackgroundRules = useDataStore(state => state.setCardBackgroundRules)

  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [showCardBg, setShowCardBg] = useState(true)

  const enabledFields = fieldMappings.filter(m => m.enabled)

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

  // Card background rule helpers
  const addCardBgRule = () => {
    const newRule: CardBackgroundRule = {
      field: columns[0] || '',
      operator: 'equals',
      value: '',
      backgroundColor: '#fef3c7'
    }
    setCardBackgroundRules([...cardBackgroundRules, newRule])
  }

  const updateCardBgRule = (index: number, updates: Partial<CardBackgroundRule>) => {
    const newRules = [...cardBackgroundRules]
    newRules[index] = { ...newRules[index], ...updates }
    setCardBackgroundRules(newRules)
  }

  const removeCardBgRule = (index: number) => {
    setCardBackgroundRules(cardBackgroundRules.filter((_, i) => i !== index))
  }

  if (enabledFields.length === 0) {
    return null
  }

  const currentStyle = selectedField ? getFieldStyle(selectedField) : null

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Card Background Section */}
      <div className="mb-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowCardBg(!showCardBg)}
        >
          <h3 className="font-semibold text-gray-700">Card Background</h3>
          <span className="text-gray-400">{showCardBg ? '▼' : '▶'}</span>
        </div>

        {showCardBg && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2">
              Set card background color based on field values (e.g., category)
            </p>

            {cardBackgroundRules.length === 0 ? (
              <p className="text-xs text-gray-400 italic mb-2">
                No rules. Cards use white background.
              </p>
            ) : (
              <div className="space-y-2 mb-2">
                {cardBackgroundRules.map((rule, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs border">
                    <div className="flex gap-1 mb-1">
                      <span className="text-gray-500">If</span>
                      <select
                        value={rule.field}
                        onChange={(e) => updateCardBgRule(idx, { field: e.target.value })}
                        className="flex-1 border rounded px-1 py-0.5 text-xs"
                      >
                        {columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-1 mb-1">
                      <select
                        value={rule.operator}
                        onChange={(e) => updateCardBgRule(idx, { operator: e.target.value as CardBackgroundRule['operator'] })}
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="notEmpty">is not empty</option>
                        <option value="empty">is empty</option>
                      </select>

                      {(rule.operator === 'equals' || rule.operator === 'contains') && (
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => updateCardBgRule(idx, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 border rounded px-1 py-0.5 text-xs"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Color:</span>
                        <input
                          type="color"
                          value={rule.backgroundColor}
                          onChange={(e) => updateCardBgRule(idx, { backgroundColor: e.target.value })}
                          className="w-6 h-6 border rounded cursor-pointer"
                        />
                      </div>
                      <div
                        className="flex-1 h-4 rounded"
                        style={{ backgroundColor: rule.backgroundColor }}
                      />
                      <button
                        onClick={() => removeCardBgRule(idx)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addCardBgRule}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              + Add Card Background Rule
            </button>
          </div>
        )}
      </div>

      <hr className="my-3" />

      <h3 className="font-semibold text-gray-700 mb-3">Field Styles & Colors</h3>

      {/* Field selector */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Select field to style:</label>
        <select
          value={selectedField || ''}
          onChange={(e) => setSelectedField(e.target.value || null)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Choose a field...</option>
          {enabledFields.map(f => (
            <option key={f.columnName} value={f.columnName}>
              {f.displayName}
            </option>
          ))}
        </select>
      </div>

      {selectedField && currentStyle && (
        <>
          {/* Basic styles */}
          <div className="mb-4 p-2 bg-gray-50 rounded">
            <div className="text-xs font-medium text-gray-600 mb-2">Basic Style</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updateFieldStyle(selectedField, {
                  fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold'
                })}
                className={`px-2 py-1 text-xs rounded border ${currentStyle.fontWeight === 'bold' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
              >
                Bold
              </button>
              <button
                onClick={() => updateFieldStyle(selectedField, { showLabel: !currentStyle.showLabel })}
                className={`px-2 py-1 text-xs rounded border ${currentStyle.showLabel ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
              >
                Label
              </button>
              <button
                onClick={() => updateFieldStyle(selectedField, { showBorder: !currentStyle.showBorder })}
                className={`px-2 py-1 text-xs rounded border ${currentStyle.showBorder ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
              >
                Border
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Size:</span>
              <input
                type="range"
                min="8"
                max="24"
                value={currentStyle.fontSize}
                onChange={(e) => updateFieldStyle(selectedField, { fontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs w-6">{currentStyle.fontSize}</span>
            </div>
          </div>

          {/* Color Rules */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Color Rules</span>
              <button
                onClick={() => addColorRule(selectedField)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + Add Rule
              </button>
            </div>

            {(currentStyle.colorRules || []).length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No color rules. Add a rule to change colors based on field values.
              </p>
            ) : (
              <div className="space-y-2">
                {(currentStyle.colorRules || []).map((rule, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs border">
                    <div className="flex gap-1 mb-1">
                      <span className="text-gray-500">If</span>
                      <select
                        value={rule.field}
                        onChange={(e) => updateColorRule(selectedField, idx, { field: e.target.value })}
                        className="flex-1 border rounded px-1 py-0.5 text-xs"
                      >
                        {columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-1 mb-1">
                      <select
                        value={rule.operator}
                        onChange={(e) => updateColorRule(selectedField, idx, { operator: e.target.value as ColorRule['operator'] })}
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="notEmpty">is not empty</option>
                        <option value="empty">is empty</option>
                      </select>

                      {(rule.operator === 'equals' || rule.operator === 'contains') && (
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => updateColorRule(selectedField, idx, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 border rounded px-1 py-0.5 text-xs"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">BG:</span>
                        <input
                          type="color"
                          value={rule.backgroundColor}
                          onChange={(e) => updateColorRule(selectedField, idx, { backgroundColor: e.target.value })}
                          className="w-6 h-6 border rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Text:</span>
                        <input
                          type="color"
                          value={rule.textColor}
                          onChange={(e) => updateColorRule(selectedField, idx, { textColor: e.target.value })}
                          className="w-6 h-6 border rounded cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => removeColorRule(selectedField, idx)}
                        className="ml-auto text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Preview */}
                    <div
                      className="mt-2 px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: rule.backgroundColor,
                        color: rule.textColor
                      }}
                    >
                      Preview: {rule.value || 'Sample'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick presets */}
            <div className="mt-3 pt-2 border-t">
              <div className="text-xs text-gray-500 mb-1">Quick presets:</div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => {
                    const style = getFieldStyle(selectedField)
                    updateFieldStyle(selectedField, {
                      colorRules: [...(style.colorRules || []), {
                        field: selectedField,
                        operator: 'equals',
                        value: 'Yes',
                        backgroundColor: '#dcfce7',
                        textColor: '#166534'
                      }]
                    })
                  }}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Yes=Green
                </button>
                <button
                  onClick={() => {
                    const style = getFieldStyle(selectedField)
                    updateFieldStyle(selectedField, {
                      colorRules: [...(style.colorRules || []), {
                        field: selectedField,
                        operator: 'equals',
                        value: 'No',
                        backgroundColor: '#fee2e2',
                        textColor: '#991b1b'
                      }]
                    })
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  No=Red
                </button>
                <button
                  onClick={() => {
                    const style = getFieldStyle(selectedField)
                    updateFieldStyle(selectedField, {
                      colorRules: [...(style.colorRules || []), {
                        field: selectedField,
                        operator: 'notEmpty',
                        value: '',
                        backgroundColor: '#dbeafe',
                        textColor: '#1e40af'
                      }]
                    })
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Has Value=Blue
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
