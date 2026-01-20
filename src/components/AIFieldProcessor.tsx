import { useState, useEffect } from 'react'
import { useDataStore } from '../stores/dataStore'
import { useAIStore } from '../stores/aiStore'
import { processFieldValue, testConnection } from '../services/aiService'

const PRESET_PROMPTS = [
  { label: 'Summarize', prompt: 'Summarize this text in 1-2 sentences, keeping the key information. Use markdown: **bold** for emphasis.' },
  { label: 'Shorten', prompt: 'Shorten this text to be more concise while keeping the main points. Use markdown formatting.' },
  { label: 'Expand', prompt: 'Expand this text with more detail and context. Use markdown: ## for headers, **bold** for key terms, - for bullet points.' },
  { label: 'Bullet Points', prompt: 'Convert this text into bullet points. Use markdown format with each bullet on a new line starting with "- ". Use **bold** for key terms.' },
  { label: 'Professional', prompt: 'Rewrite this text in a more professional tone. Use markdown formatting where appropriate.' },
  { label: 'Simple', prompt: 'Simplify this text to be easier to understand. Use markdown: - for bullet points if listing items.' },
  { label: 'Fix Grammar', prompt: 'Fix any grammar and spelling errors in this text. Keep the original formatting.' },
  { label: 'Extract Key Info', prompt: 'Extract only the key information from this text. Format as markdown bullet points with - prefix, one per line. Use **bold** for important terms.' },
]

interface SavedPrompt {
  id: string
  label: string
  prompt: string
}

const DEFAULT_SAVED_PROMPTS: SavedPrompt[] = [
  {
    id: 'default-structured',
    label: 'Structured Summary (100 words)',
    prompt: 'Rewrite this entire text, try adding some bulletpoint to improve the structure when needed. Make sure that the problem is clear and if available the possible solution. Make sure to export as markdown and it should not exceed more than EXACTLY 100 words, NOT MORE!!! while still containing most content!!! Only capital letters when needed!'
  }
]

const SAVED_PROMPTS_KEY = 'tickets-ai-saved-prompts'

function loadSavedPrompts(): SavedPrompt[] {
  try {
    const stored = localStorage.getItem(SAVED_PROMPTS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults, avoiding duplicates
      const defaultIds = DEFAULT_SAVED_PROMPTS.map(p => p.id)
      const customPrompts = parsed.filter((p: SavedPrompt) => !defaultIds.includes(p.id))
      return [...DEFAULT_SAVED_PROMPTS, ...customPrompts]
    }
  } catch (e) {
    console.error('Error loading saved prompts:', e)
  }
  return DEFAULT_SAVED_PROMPTS
}

function saveSavedPrompts(prompts: SavedPrompt[]) {
  localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts))
}

export function AIFieldProcessor() {
  const [isOpen, setIsOpen] = useState(false)
  const [sourceField, setSourceField] = useState<string>('')
  const [targetField, setTargetField] = useState<string>('_same')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [applyTo, setApplyTo] = useState<'current' | 'all'>('current')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [preview, setPreview] = useState<{ original: string; processed: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')

  // Saved prompts state
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(DEFAULT_SAVED_PROMPTS)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newPromptLabel, setNewPromptLabel] = useState('')
  const [selectedSavedPrompt, setSelectedSavedPrompt] = useState<string>('')

  // Load saved prompts on mount
  useEffect(() => {
    setSavedPrompts(loadSavedPrompts())
  }, [])

  const columns = useDataStore(state => state.columns)
  const rows = useDataStore(state => state.rows)
  const previewIndex = useDataStore(state => state.previewIndex)
  const updateRowField = useDataStore(state => state.updateRowField)
  const updateAllRowsField = useDataStore(state => state.updateAllRowsField)
  const fieldMappings = useDataStore(state => state.fieldMappings)

  const provider = useAIStore(state => state.provider)

  const enabledFields = fieldMappings.filter(m => m.enabled)
  const currentPrompt = selectedPreset || customPrompt

  const handleTestConnection = async () => {
    if (!provider) return
    setConnectionStatus('unknown')
    const result = await testConnection(provider)
    setConnectionStatus(result ? 'connected' : 'failed')
  }

  const getTargetFieldName = () => {
    if (targetField === '_same') return sourceField
    if (targetField === '_new') return `${sourceField}_AI`
    return targetField
  }

  const handlePreview = async () => {
    console.log('handlePreview called', { provider, sourceField, currentPrompt, rowsLength: rows.length })

    if (!provider) {
      setPreview({ original: '', processed: 'Error: No AI provider configured' })
      return
    }
    if (!sourceField) {
      setPreview({ original: '', processed: 'Error: No source field selected' })
      return
    }
    if (!currentPrompt) {
      setPreview({ original: '', processed: 'Error: No prompt entered' })
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
      console.log('Original value:', originalValue, 'from field:', sourceField)

      if (!originalValue.trim()) {
        setPreview({ original: '(empty)', processed: '(empty - nothing to process)' })
        return
      }

      console.log('Calling processFieldValue...')
      const processed = await processFieldValue(provider, originalValue, currentPrompt)
      console.log('Processed result:', processed)
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
    console.log('handleApply called', { provider, sourceField, currentPrompt, applyTo })

    if (!provider || !sourceField || !currentPrompt || rows.length === 0) {
      console.log('handleApply early return - missing:', { provider: !provider, sourceField: !sourceField, currentPrompt: !currentPrompt, noRows: rows.length === 0 })
      return
    }

    const targetFieldName = getTargetFieldName()
    console.log('Target field name:', targetFieldName)
    setIsProcessing(true)

    try {
      if (applyTo === 'current') {
        const originalValue = String(rows[previewIndex]?.[sourceField] || '')
        if (originalValue.trim()) {
          const processed = await processFieldValue(provider, originalValue, currentPrompt)
          updateRowField(previewIndex, targetFieldName, processed)
        }
        setProgress({ current: 1, total: 1 })
      } else {
        // Process all rows
        const total = rows.length
        const results = new Map<number, string>()
        setProgress({ current: 0, total })

        for (let i = 0; i < rows.length; i++) {
          const originalValue = String(rows[i]?.[sourceField] || '')
          if (originalValue.trim()) {
            try {
              const processed = await processFieldValue(provider, originalValue, currentPrompt)
              results.set(i, processed)
            } catch {
              // Skip failed rows
            }
          }
          setProgress({ current: i + 1, total })
        }

        updateAllRowsField(targetFieldName, results)
      }

      setPreview(null)
    } catch (error) {
      console.error('Error processing fields:', error)
    } finally {
      setIsProcessing(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const handleSavePrompt = () => {
    if (!newPromptLabel.trim() || !currentPrompt.trim()) return

    const newPrompt: SavedPrompt = {
      id: `custom-${Date.now()}`,
      label: newPromptLabel.trim(),
      prompt: currentPrompt
    }

    const updated = [...savedPrompts, newPrompt]
    setSavedPrompts(updated)
    saveSavedPrompts(updated)
    setShowSaveDialog(false)
    setNewPromptLabel('')
    setSelectedSavedPrompt(newPrompt.id)
  }

  const handleDeletePrompt = (id: string) => {
    // Don't allow deleting default prompts
    if (id.startsWith('default-')) return

    const updated = savedPrompts.filter(p => p.id !== id)
    setSavedPrompts(updated)
    saveSavedPrompts(updated)
    if (selectedSavedPrompt === id) {
      setSelectedSavedPrompt('')
    }
  }

  const handleSelectSavedPrompt = (id: string) => {
    setSelectedSavedPrompt(id)
    const prompt = savedPrompts.find(p => p.id === id)
    if (prompt) {
      setCustomPrompt(prompt.prompt)
      setSelectedPreset('')
    }
  }

  if (rows.length === 0) return null

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="no-print fixed bottom-6 left-20 px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2 text-sm z-50"
        title="AI Field Processor"
      >
        <span>AI Process</span>
      </button>
    )
  }

  return (
    <div className="no-print fixed bottom-6 left-6 w-[420px] bg-white rounded-lg shadow-xl flex flex-col z-50 border border-gray-200 max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-indigo-600 text-white rounded-t-lg">
        <span className="font-medium">AI Field Processor</span>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-indigo-700 rounded p-1"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Connection Status */}
        {!provider && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            No AI provider configured. Open AI Chat to configure.
          </div>
        )}

        {provider && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Provider: {provider.name}</span>
            <button
              onClick={handleTestConnection}
              className="px-2 py-0.5 bg-gray-100 rounded text-xs hover:bg-gray-200"
            >
              Test
            </button>
            <span className={`text-xs ${
              connectionStatus === 'connected' ? 'text-green-600' :
              connectionStatus === 'failed' ? 'text-red-600' : 'text-gray-400'
            }`}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'failed' ? 'Connection failed' : ''}
            </span>
          </div>
        )}

        {/* Source Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Field
          </label>
          <select
            value={sourceField}
            onChange={(e) => setSourceField(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a field...</option>
            {enabledFields.map(f => (
              <option key={f.columnName} value={f.columnName}>
                {f.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Target Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Save Result To
          </label>
          <select
            value={targetField}
            onChange={(e) => setTargetField(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="_same">Same field (overwrite)</option>
            <option value="_new">New field ({sourceField || 'field'}_AI)</option>
            <optgroup label="Existing fields">
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Saved Prompts Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saved Prompts
          </label>
          <div className="flex gap-2">
            <select
              value={selectedSavedPrompt}
              onChange={(e) => handleSelectSavedPrompt(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a saved prompt...</option>
              {savedPrompts.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {selectedSavedPrompt && !selectedSavedPrompt.startsWith('default-') && (
              <button
                onClick={() => handleDeletePrompt(selectedSavedPrompt)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                title="Delete saved prompt"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Preset Prompts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {PRESET_PROMPTS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setSelectedPreset(preset.prompt)
                  setCustomPrompt('')
                  setSelectedSavedPrompt('')
                }}
                className={`px-2 py-1 text-xs rounded border ${
                  selectedPreset === preset.prompt
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            value={selectedPreset || customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value)
              setSelectedPreset('')
              setSelectedSavedPrompt('')
            }}
            placeholder="Or write a custom prompt..."
            className="w-full border rounded px-3 py-2 text-sm h-20 resize-none"
          />
          {/* Save prompt button */}
          {currentPrompt && !showSaveDialog && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
            >
              + Save this prompt
            </button>
          )}
          {/* Save dialog */}
          {showSaveDialog && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <input
                type="text"
                value={newPromptLabel}
                onChange={(e) => setNewPromptLabel(e.target.value)}
                placeholder="Enter a name for this prompt..."
                className="w-full border rounded px-2 py-1 text-sm mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePrompt}
                  disabled={!newPromptLabel.trim()}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setNewPromptLabel('')
                  }}
                  className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Apply To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apply To
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={applyTo === 'current'}
                onChange={() => setApplyTo('current')}
                className="text-indigo-600"
              />
              <span className="text-sm">Current card only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={applyTo === 'all'}
                onChange={() => setApplyTo('all')}
                className="text-indigo-600"
              />
              <span className="text-sm">All cards ({rows.length})</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="border rounded p-3 bg-gray-50 space-y-2">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Original:</div>
              <div className="text-sm bg-white p-2 rounded border max-h-20 overflow-y-auto">
                {preview.original}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Processed:</div>
              <div className="text-sm bg-white p-2 rounded border max-h-20 overflow-y-auto">
                {preview.processed}
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isProcessing && progress.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!provider || !sourceField || !currentPrompt || isProcessing}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            Preview
          </button>
          <button
            onClick={handleApply}
            disabled={!provider || !sourceField || !currentPrompt || isProcessing}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {isProcessing ? 'Processing...' : applyTo === 'all' ? `Apply to All (${rows.length})` : 'Apply'}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Tip: Use Preview to test your prompt before applying to all cards.
        </p>
      </div>
    </div>
  )
}
