import { useState, useEffect } from 'react'
import { useDataStore } from '../stores/dataStore'
import { useAIStore } from '../stores/aiStore'

const PRESET_PROMPTS = [
  { label: 'Summarize', value: 'summarize' },
  { label: 'Shorten', value: 'shorten' },
  { label: 'Expand', value: 'expand' },
  { label: 'Bullet Points', value: 'bullets' },
  { label: 'Title', value: 'title' },
  { label: 'Keywords', value: 'keywords' },
  { label: 'Sentiment', value: 'sentiment' },
  { label: 'Category', value: 'category' },
]

export function AIFieldProcessor() {
  const { rows, columns, previewIndex, updateRowField } = useDataStore()
  const { config, processField, batchProcessFields } = useAIStore()

  const [sourceField, setSourceField] = useState('')
  const [targetField, setTargetField] = useState('_new')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [applyTo, setApplyTo] = useState<'current' | 'all'>('current')
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<{ original: string; processed: string } | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  useEffect(() => {
    if (columns.length > 0 && !sourceField) {
      setSourceField(columns[0])
    }
  }, [columns, sourceField])

  const currentPrompt = customPrompt || selectedPreset

  const getTargetFieldName = () => {
    if (targetField === '_same') return sourceField
    if (targetField === '_new') return `${sourceField}_AI`
    return targetField
  }

  const handlePreview = async () => {
    if (!config?.hasAPIKey) {
      setPreview({ original: '', processed: 'Error: No AI provider configured. Please configure in AI Settings.' })
      return
    }
    if (!sourceField) {
      setPreview({ original: '', processed: 'Error: No source field selected' })
      return
    }
    if (!currentPrompt) {
      setPreview({ original: '', processed: 'Error: No prompt entered or preset selected' })
      return
    }
    if (rows.length === 0) {
      setPreview({ original: '', processed: 'Error: No data loaded' })
      return
    }

    setIsProcessing(true)
    setPreview(null)

    try {
      const originalValue = String(rows[previewIndex]?.[sourceField] || '')

      if (!originalValue.trim()) {
        setPreview({ original: '(empty)', processed: '(empty - nothing to process)' })
        return
      }

      const processed = await processField(originalValue, customPrompt, selectedPreset)
      setPreview({ original: originalValue, processed })
    } catch (error) {
      console.error('Preview error:', error)
      setPreview({
        original: String(rows[previewIndex]?.[sourceField] || ''),
        processed: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    if (!config?.hasAPIKey || !sourceField || !currentPrompt || rows.length === 0) {
      return
    }

    const targetFieldName = getTargetFieldName()
    setIsProcessing(true)

    try {
      if (applyTo === 'current') {
        const originalValue = String(rows[previewIndex]?.[sourceField] || '')
        if (originalValue.trim()) {
          const processed = await processField(originalValue, customPrompt, selectedPreset)
          updateRowField(previewIndex, targetFieldName, processed)
        }
        setProgress({ current: 1, total: 1 })
      } else {
        // Process all rows
        const fieldValues = rows.map(row => String(row[sourceField] || ''))
        const total = fieldValues.length
        setProgress({ current: 0, total })

        const processed = await batchProcessFields(fieldValues, customPrompt, selectedPreset)

        processed.forEach((value, index) => {
          updateRowField(index, targetFieldName, value)
        })

        setProgress({ current: total, total })
      }

      setTimeout(() => setProgress(null), 2000)
    } catch (error) {
      console.error('Apply error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!config) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          No AI provider configured. Please configure your AI settings in the AI Settings tab.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">AI Field Processing</h3>
        <p className="text-sm text-gray-600 mb-4">
          Transform field values using AI. Select a field, choose a preset or enter a custom prompt, and apply to current or all rows.
        </p>
      </div>

      {/* Field Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source Field</label>
          <select
            value={sourceField}
            onChange={(e) => setSourceField(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Target Field</label>
          <select
            value={targetField}
            onChange={(e) => setTargetField(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="_same">Same field (overwrite)</option>
            <option value="_new">New field ({sourceField}_AI)</option>
            {columns
              .filter((col) => col !== sourceField)
              .map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Preset Prompts */}
      <div>
        <label className="block text-sm font-medium mb-2">Preset Prompts</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => {
                setSelectedPreset(preset.value)
                setCustomPrompt('')
              }}
              className={`px-3 py-1 rounded text-sm ${
                selectedPreset === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div>
        <label className="block text-sm font-medium mb-2">Custom Prompt</label>
        <textarea
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value)
            setSelectedPreset('')
          }}
          placeholder="Enter a custom prompt..."
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 h-24"
        />
      </div>

      {/* Apply To */}
      <div>
        <label className="block text-sm font-medium mb-2">Apply To</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="current"
              checked={applyTo === 'current'}
              onChange={(e) => setApplyTo(e.target.value as 'current')}
              className="mr-2"
            />
            Current row only
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="all"
              checked={applyTo === 'all'}
              onChange={(e) => setApplyTo(e.target.value as 'all')}
              className="mr-2"
            />
            All rows ({rows.length})
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={isProcessing || !currentPrompt}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
        >
          Preview
        </button>
        <button
          onClick={handleApply}
          disabled={isProcessing || !currentPrompt}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing...' : 'Apply'}
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Processing: {progress.current} / {progress.total}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="border rounded p-4 space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Original:</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">{preview.original}</div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Processed:</h4>
            <div className="bg-green-50 p-3 rounded text-sm whitespace-pre-wrap">
              {preview.processed}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIFieldProcessor
