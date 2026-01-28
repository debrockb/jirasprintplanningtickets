import { useState } from 'react'
import { SortConfig, SortRule, SortRuleType, AISortConfig, AISortMode, GroupingStrategy } from '../types'
import { DEFAULT_AI_PROMPTS, analyzeGroupingOpportunities } from '../utils/aiSorting'
import { useAIStore } from '../stores/aiStore'
import { useDataStore } from '../stores/dataStore'

interface SortPanelProps {
  config: SortConfig
  columns: string[]
  onConfigChange: (config: SortConfig) => void
  onRunAIAnalysis?: () => void
  aiAnalysisState?: {
    isRunning: boolean
    error?: string
    lastRun?: number
  }
}

function generateRuleId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export function SortPanel({ config, columns, onConfigChange, onRunAIAnalysis, aiAnalysisState }: SortPanelProps) {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [showAIConfig, setShowAIConfig] = useState(false)
  const [discoveringStrategies, setDiscoveringStrategies] = useState(false)
  const aiProvider = useAIStore(state => state.provider)
  const rows = useDataStore(state => state.rows)

  const handleAddRule = (type: SortRuleType) => {
    const newRule: SortRule = {
      id: generateRuleId(),
      type
    }

    if (type === 'simple') {
      newRule.simple = {
        field: columns[0] || '',
        direction: 'asc',
        numeric: false
      }
    } else if (type === 'linked-issues') {
      newRule.linkedIssues = {
        keyField: columns[0] || '',
        linkedIssuesField: columns[1] || columns[0] || '',
        issueKeyPattern: /[A-Z]+-\d+/g
      }
    }

    onConfigChange({
      ...config,
      rules: [...config.rules, newRule]
    })
    setExpandedRuleId(newRule.id)
  }

  const handleUpdateRule = (ruleId: string, updates: Partial<SortRule>) => {
    onConfigChange({
      ...config,
      rules: config.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    onConfigChange({
      ...config,
      rules: config.rules.filter(r => r.id !== ruleId)
    })
    if (expandedRuleId === ruleId) {
      setExpandedRuleId(null)
    }
  }

  const handleMoveRule = (ruleId: string, direction: 'up' | 'down') => {
    const index = config.rules.findIndex(r => r.id === ruleId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= config.rules.length) return

    const newRules = [...config.rules]
    const [removed] = newRules.splice(index, 1)
    newRules.splice(newIndex, 0, removed)

    onConfigChange({ ...config, rules: newRules })
  }

  const handleToggleAI = () => {
    if (!config.aiSort) {
      onConfigChange({
        ...config,
        aiSort: {
          enabled: true,
          mode: 'natural-language-links',
          prompts: { ...DEFAULT_AI_PROMPTS },
          fieldsToAnalyze: columns.slice(0, 3)  // Default to first 3 columns
        }
      })
    } else {
      onConfigChange({
        ...config,
        aiSort: {
          ...config.aiSort,
          enabled: !config.aiSort.enabled
        }
      })
    }
  }

  const handleUpdateAIConfig = (updates: Partial<AISortConfig>) => {
    if (!config.aiSort) return
    onConfigChange({
      ...config,
      aiSort: {
        ...config.aiSort,
        ...updates
      }
    })
  }

  const generateDynamicPrompt = (mode: AISortMode, fieldsToAnalyze: string[]): string => {
    const fieldsList = fieldsToAnalyze.join(', ')

    switch (mode) {
      case 'natural-language-links':
        return `Analyze these tickets and identify which ones reference each other.

Look for BOTH:
1. **Structured references** in fields like "Linked Issues" - Parse ticket IDs (e.g., "SBT-711", "PROJCARD-317")
2. **Natural language phrases** - Look for "blocked by X", "depends on X", "related to X", "same as X", "duplicate of X"

Focus on these fields: ${fieldsList}

**IMPORTANT**: If a ticket has "Linked Issues" field with values like "PROJCARD-317, SBT-920", create relationships FROM that ticket TO each linked ticket with confidence 1.0.

Return a JSON array of relationships: [{"from": "TICKET-ID", "to": "TICKET-ID", "confidence": 0.0-1.0}]

Example:
- If ticket SBT-711 has Linked Issues = "PROJCARD-317", return: {"from": "SBT-711", "to": "PROJCARD-317", "confidence": 1.0}`

      case 'semantic-clustering':
        return `Analyze these tickets and group them by semantic similarity and theme.
Consider:
- Similar topics or features
- Same component/area
- Related functionality
- Common goals

Analyze these fields: ${fieldsList}

Return a JSON object mapping ticket IDs to cluster names: {"TICKET-ID": "cluster-name"}`

      case 'fuzzy-matching':
        return `Find all variations of ticket references in these descriptions.
Look for:
- Misspellings: "SBT-l367" → "SBT-1367"
- Variations: "sbt 1367", "ticket #1367", "issue 1367"
- Natural references: "the authentication bug" → find auth tickets

Search in these fields: ${fieldsList}

Return a JSON object mapping variations to canonical ticket IDs: {"variation": "TICKET-ID"}`

      default:
        return DEFAULT_AI_PROMPTS.naturalLanguageLinks
    }
  }

  const handleUpdateFieldsToAnalyze = (fields: string[]) => {
    if (!config.aiSort) return

    // Update fields and regenerate prompt dynamically
    const dynamicPrompt = generateDynamicPrompt(config.aiSort.mode, fields)
    const promptKey = config.aiSort.mode === 'natural-language-links'
      ? 'naturalLanguageLinks'
      : config.aiSort.mode === 'semantic-clustering'
      ? 'semanticClustering'
      : 'fuzzyMatching'

    handleUpdateAIConfig({
      fieldsToAnalyze: fields,
      prompts: {
        ...config.aiSort.prompts,
        [promptKey]: dynamicPrompt
      }
    })
  }

  const handleUpdateAIMode = (mode: AISortMode) => {
    if (!config.aiSort) return

    // Update mode and regenerate prompt dynamically
    const dynamicPrompt = generateDynamicPrompt(mode, config.aiSort.fieldsToAnalyze)
    const promptKey = mode === 'natural-language-links'
      ? 'naturalLanguageLinks'
      : mode === 'semantic-clustering'
      ? 'semanticClustering'
      : 'fuzzyMatching'

    handleUpdateAIConfig({
      mode,
      prompts: {
        ...config.aiSort.prompts,
        [promptKey]: dynamicPrompt
      }
    })
  }

  const handleDiscoverStrategies = async () => {
    if (!config.aiSort) return

    setDiscoveringStrategies(true)
    try {
      const strategies = await analyzeGroupingOpportunities(rows, columns, aiProvider)
      handleUpdateAIConfig({
        suggestedStrategies: strategies
      })
    } catch (error) {
      console.error('Failed to discover strategies:', error)
    } finally {
      setDiscoveringStrategies(false)
    }
  }

  const handleSelectStrategy = (strategy: GroupingStrategy) => {
    if (!config.aiSort) return

    // Apply the strategy
    handleUpdateAIConfig({
      selectedStrategy: strategy,
      mode: strategy.mode,
      fieldsToAnalyze: strategy.suggestedFields,
      prompts: {
        ...config.aiSort.prompts,
        [strategy.mode === 'natural-language-links' ? 'naturalLanguageLinks' :
         strategy.mode === 'semantic-clustering' ? 'semanticClustering' : 'fuzzyMatching']:
          generateDynamicPrompt(strategy.mode, strategy.suggestedFields)
      }
    })
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Preview Button - Prominent at top */}
      {config.rules.length > 0 && (
        <button
          onClick={() => {
            const printTab = document.querySelector('[data-tab="print"]') as HTMLElement
            if (printTab) printTab.click()
          }}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <span>Preview Sorted Cards</span>
          <span className="text-xs opacity-80">({config.rules.length} rule{config.rules.length > 1 ? 's' : ''})</span>
        </button>
      )}

      {/* Rules List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-700">Sort Rules</label>
          <span className="text-xs text-gray-500">Applied in order</span>
        </div>

        {config.rules.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-3 border border-dashed rounded">
            No sorting rules. Add one below.
          </div>
        )}

        <div className="space-y-2">
          {config.rules.map((rule, index) => (
            <div key={rule.id} className="border rounded">
              {/* Rule Header */}
              <div className="flex items-center gap-2 p-2 bg-gray-50">
                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                <button
                  onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
                  className="flex-1 text-left text-xs font-medium"
                >
                  {rule.type === 'simple' ? `Sort by ${rule.simple?.field}` : 'Group Linked Issues'}
                </button>

                {/* Move buttons */}
                <button
                  onClick={() => handleMoveRule(rule.id, 'up')}
                  disabled={index === 0}
                  className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveRule(rule.id, 'down')}
                  disabled={index === config.rules.length - 1}
                  className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  ↓
                </button>

                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="px-2 text-red-600 hover:text-red-800"
                  title="Delete rule"
                >
                  ×
                </button>
              </div>

              {/* Rule Details (Expanded) */}
              {expandedRuleId === rule.id && (
                <div className="p-3 space-y-2">
                  {rule.type === 'simple' && rule.simple && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Field</label>
                        <select
                          value={rule.simple.field}
                          onChange={(e) => handleUpdateRule(rule.id, {
                            simple: { ...rule.simple!, field: e.target.value }
                          })}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <label className="flex items-center text-xs">
                          <input
                            type="radio"
                            checked={rule.simple.direction === 'asc'}
                            onChange={() => handleUpdateRule(rule.id, {
                              simple: { ...rule.simple!, direction: 'asc' }
                            })}
                            className="mr-1"
                          />
                          Ascending
                        </label>
                        <label className="flex items-center text-xs">
                          <input
                            type="radio"
                            checked={rule.simple.direction === 'desc'}
                            onChange={() => handleUpdateRule(rule.id, {
                              simple: { ...rule.simple!, direction: 'desc' }
                            })}
                            className="mr-1"
                          />
                          Descending
                        </label>
                      </div>

                      <label className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={rule.simple.numeric}
                          onChange={(e) => handleUpdateRule(rule.id, {
                            simple: { ...rule.simple!, numeric: e.target.checked }
                          })}
                          className="mr-1"
                        />
                        Treat as numbers
                      </label>
                    </>
                  )}

                  {rule.type === 'linked-issues' && rule.linkedIssues && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Key Field (Primary Issue Key)
                        </label>
                        <select
                          value={rule.linkedIssues.keyField}
                          onChange={(e) => handleUpdateRule(rule.id, {
                            linkedIssues: { ...rule.linkedIssues!, keyField: e.target.value }
                          })}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Linked Issues Field
                        </label>
                        <select
                          value={rule.linkedIssues.linkedIssuesField}
                          onChange={(e) => handleUpdateRule(rule.id, {
                            linkedIssues: { ...rule.linkedIssues!, linkedIssuesField: e.target.value }
                          })}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Issue Key Pattern (regex)
                        </label>
                        <input
                          type="text"
                          value={rule.linkedIssues.issueKeyPattern.source}
                          onChange={(e) => {
                            try {
                              const pattern = new RegExp(e.target.value, 'g')
                              handleUpdateRule(rule.id, {
                                linkedIssues: { ...rule.linkedIssues!, issueKeyPattern: pattern }
                              })
                            } catch (err) {
                              // Invalid regex - ignore
                            }
                          }}
                          className="w-full px-2 py-1 border rounded text-xs font-mono"
                          placeholder="[A-Z]+-\d+"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Rule Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleAddRule('simple')}
          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
        >
          + Simple Sort
        </button>
        <button
          onClick={() => handleAddRule('linked-issues')}
          className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"
        >
          + Link Grouping
        </button>
      </div>

      {/* AI Sorting Section */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center text-xs font-medium">
            <input
              type="checkbox"
              checked={config.aiSort?.enabled || false}
              onChange={handleToggleAI}
              disabled={!aiProvider}
              className="mr-2"
            />
            AI-Powered Sorting
          </label>
          {!aiProvider && (
            <span className="text-xs text-orange-600">AI not configured</span>
          )}
        </div>

        {config.aiSort?.enabled && (
          <>
            <button
              onClick={() => setShowAIConfig(!showAIConfig)}
              className="w-full px-3 py-2 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 mb-2"
            >
              {showAIConfig ? 'Hide' : 'Show'} AI Configuration
            </button>

            {showAIConfig && config.aiSort && (
              <div className="space-y-3 p-3 bg-purple-50 rounded">
                {/* Discover Strategies Button */}
                <div className="pb-3 border-b">
                  <button
                    onClick={handleDiscoverStrategies}
                    disabled={discoveringStrategies || rows.length === 0}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {discoveringStrategies ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Analyzing data...
                      </span>
                    ) : (
                      'Discover Smart Grouping Options'
                    )}
                  </button>
                  <p className="text-xs text-gray-600 mt-1">
                    AI analyzes your data to suggest intelligent grouping strategies
                  </p>
                </div>

                {/* Show Suggested Strategies */}
                {config.aiSort.suggestedStrategies && config.aiSort.suggestedStrategies.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-700 font-medium">Suggested Strategies</label>
                    <div className="space-y-2">
                      {config.aiSort.suggestedStrategies.map((strategy) => (
                        <button
                          key={strategy.id}
                          onClick={() => handleSelectStrategy(strategy)}
                          className={`w-full text-left p-2 rounded border text-xs transition-colors ${
                            config.aiSort?.selectedStrategy?.id === strategy.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-25'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 flex items-center gap-1">
                                {strategy.name}
                                {config.aiSort?.selectedStrategy?.id === strategy.id && (
                                  <span className="text-indigo-600">✓</span>
                                )}
                              </div>
                              <div className="text-gray-600 mt-0.5">{strategy.description}</div>
                              <div className="text-gray-500 mt-1 text-[10px]">
                                Fields: {strategy.suggestedFields.join(', ')}
                              </div>
                            </div>
                            <div className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-medium">
                              {Math.round(strategy.confidence * 100)}%
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Configuration */}
                <div className="pt-3 border-t">
                  <label className="block text-xs text-gray-700 mb-1 font-medium">
                    Manual Configuration
                    {config.aiSort.selectedStrategy && (
                      <span className="ml-1 text-gray-500 font-normal">(from: {config.aiSort.selectedStrategy.name})</span>
                    )}
                  </label>

                  {/* AI Mode */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">AI Mode</label>
                    <select
                      value={config.aiSort.mode}
                      onChange={(e) => handleUpdateAIMode(e.target.value as AISortMode)}
                      className="w-full px-2 py-1 border rounded text-xs"
                    >
                      <option value="natural-language-links">Natural Language Links</option>
                      <option value="semantic-clustering">Semantic Clustering</option>
                      <option value="fuzzy-matching">Fuzzy Matching</option>
                    </select>
                  </div>
                </div>

                {/* Mode Description */}
                <div className="text-xs text-gray-600 bg-white p-2 rounded">
                  {config.aiSort.mode === 'natural-language-links' && (
                    <div>
                      <strong>Natural Language Links:</strong> AI detects relationships from phrases like
                      "blocked by", "depends on", "related to" in ticket descriptions.
                    </div>
                  )}
                  {config.aiSort.mode === 'semantic-clustering' && (
                    <div>
                      <strong>Semantic Clustering:</strong> AI groups tickets by similar topics and themes,
                      even without explicit links.
                    </div>
                  )}
                  {config.aiSort.mode === 'fuzzy-matching' && (
                    <div>
                      <strong>Fuzzy Matching:</strong> AI finds variations and misspellings of ticket
                      references (e.g., "SBT-l367" → "SBT-1367").
                    </div>
                  )}
                </div>

                {/* Fields to Analyze */}
                <div>
                  <label className="block text-xs text-gray-700 mb-1 font-medium">
                    Fields to Analyze
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2 bg-white">
                    {columns.map(col => (
                      <label key={col} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={config.aiSort!.fieldsToAnalyze.includes(col)}
                          onChange={(e) => {
                            const fields = e.target.checked
                              ? [...config.aiSort!.fieldsToAnalyze, col]
                              : config.aiSort!.fieldsToAnalyze.filter(f => f !== col)
                            handleUpdateFieldsToAnalyze(fields)
                          }}
                          className="mr-2"
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Prompts */}
                <div>
                  <label className="block text-xs text-gray-700 mb-1 font-medium">
                    AI Prompt (Optional)
                  </label>
                  <textarea
                    value={config.aiSort.prompts[
                      config.aiSort.mode === 'natural-language-links'
                        ? 'naturalLanguageLinks'
                        : config.aiSort.mode === 'semantic-clustering'
                        ? 'semanticClustering'
                        : 'fuzzyMatching'
                    ]}
                    onChange={(e) => {
                      const promptKey =
                        config.aiSort!.mode === 'natural-language-links'
                          ? 'naturalLanguageLinks'
                          : config.aiSort!.mode === 'semantic-clustering'
                          ? 'semanticClustering'
                          : 'fuzzyMatching'
                      handleUpdateAIConfig({
                        prompts: {
                          ...config.aiSort!.prompts,
                          [promptKey]: e.target.value
                        }
                      })
                    }}
                    className="w-full px-2 py-1 border rounded text-xs font-mono"
                    rows={4}
                    placeholder="Custom prompt for AI analysis..."
                  />
                  <button
                    onClick={() => {
                      handleUpdateAIConfig({
                        prompts: { ...DEFAULT_AI_PROMPTS }
                      })
                    }}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Reset to default
                  </button>
                </div>

                {/* Run AI Analysis Button */}
                <div className="border-t pt-3 mt-3">
                  <button
                    onClick={onRunAIAnalysis}
                    disabled={!onRunAIAnalysis || aiAnalysisState?.isRunning || config.aiSort!.fieldsToAnalyze.length === 0}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiAnalysisState?.isRunning ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Running AI Analysis...
                      </span>
                    ) : (
                      'Run AI Analysis'
                    )}
                  </button>
                  {config.aiSort!.fieldsToAnalyze.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">Select at least one field to analyze</p>
                  )}
                  {aiAnalysisState?.error && (
                    <p className="text-xs text-red-600 mt-1">{aiAnalysisState.error}</p>
                  )}
                  {aiAnalysisState?.lastRun && !aiAnalysisState.isRunning && (
                    <p className="text-xs text-green-600 mt-1">
                      Analysis complete ({new Date(aiAnalysisState.lastRun).toLocaleTimeString()})
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sort Status */}
      {config.rules.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-green-600 font-medium text-xs">
              Sorting Active
            </div>
            <a
              href="#print-view"
              onClick={(e) => {
                e.preventDefault()
                const printTab = document.querySelector('[data-tab="print"]') as HTMLElement
                if (printTab) printTab.click()
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              View Sorted Cards
            </a>
          </div>
          <div className="text-xs text-gray-600">
            {config.rules.length} sort rule{config.rules.length > 1 ? 's' : ''} will be applied automatically in Print View.
            {config.rules.some(r => r.type === 'linked-issues') && (
              <div className="mt-1 font-medium text-green-700">
                Linked tickets will be grouped together
              </div>
            )}
            {config.rules.some(r => r.type === 'simple') && (
              <div className="mt-1 text-gray-700">
                Cards will be sorted by: {config.rules.filter(r => r.type === 'simple').map(r => r.simple?.field).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear All */}
      {(config.rules.length > 0 || config.aiSort?.enabled) && (
        <button
          onClick={() => onConfigChange({ rules: [], aiSort: undefined })}
          className="w-full px-3 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
        >
          Clear All Sorting
        </button>
      )}
    </div>
  )
}
