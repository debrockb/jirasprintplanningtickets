import React, { useState, useRef, useEffect } from 'react'
import { useAIStore } from '../stores/aiStore'
import { useDataStore } from '../stores/dataStore'
import { sendChatMessage, testConnection } from '../services/aiService'
import { AIProvider } from '../types'

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [input, setInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')

  const provider = useAIStore(state => state.provider)
  const setProvider = useAIStore(state => state.setProvider)
  const chatHistory = useAIStore(state => state.chatHistory)
  const addMessage = useAIStore(state => state.addMessage)
  const clearHistory = useAIStore(state => state.clearHistory)
  const isLoading = useAIStore(state => state.isLoading)
  const setLoading = useAIStore(state => state.setLoading)

  const rows = useDataStore(state => state.rows)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleTestConnection = async () => {
    if (!provider) return
    setConnectionStatus('unknown')
    const result = await testConnection(provider)
    setConnectionStatus(result ? 'connected' : 'failed')
  }

  const handleSend = async () => {
    if (!input.trim() || !provider || isLoading) return

    const userMessage = { role: 'user' as const, content: input.trim() }
    addMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      const response = await sendChatMessage(
        provider,
        [...chatHistory, userMessage],
        rows
      )
      addMessage({ role: 'assistant', content: response })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProvider = (updates: Partial<AIProvider>) => {
    if (!provider) return
    setProvider({ ...provider, ...updates })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="no-print fixed bottom-6 left-6 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center text-xl z-50"
        title="AI Chat"
      >
        AI
      </button>
    )
  }

  return (
    <div className="no-print fixed bottom-6 left-6 w-96 h-[500px] bg-white rounded-lg shadow-xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-purple-600 text-white rounded-t-lg">
        <span className="font-medium">AI Assistant</span>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="hover:bg-purple-700 rounded p-1"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-700 rounded p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Provider</label>
            <select
              value={provider?.name || 'ollama'}
              onChange={(e) => {
                const name = e.target.value as AIProvider['name']
                const defaults: Record<AIProvider['name'], Partial<AIProvider>> = {
                  ollama: { endpoint: 'http://localhost:11434', model: 'llama3.2' },
                  lmstudio: { endpoint: 'http://localhost:1234', model: 'local-model' },
                  openrouter: { endpoint: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3-haiku' }
                }
                setProvider({ name, ...defaults[name] } as AIProvider)
              }}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="ollama">Ollama</option>
              <option value="lmstudio">LM Studio</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Endpoint</label>
            <input
              type="text"
              value={provider?.endpoint || ''}
              onChange={(e) => updateProvider({ endpoint: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Model</label>
            <input
              type="text"
              value={provider?.model || ''}
              onChange={(e) => updateProvider({ model: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          {provider?.name === 'openrouter' && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">API Key</label>
              <input
                type="password"
                value={provider?.apiKey || ''}
                onChange={(e) => updateProvider({ apiKey: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Test Connection
            </button>
            <span className={`text-xs ${
              connectionStatus === 'connected' ? 'text-green-600' :
              connectionStatus === 'failed' ? 'text-red-600' : 'text-gray-400'
            }`}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'failed' ? 'Failed' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            Upload data to start chatting about your tickets
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === 'user'
                ? 'ml-8 bg-blue-100 text-blue-900'
                : 'mr-8 bg-gray-100 text-gray-900'
            } rounded-lg p-3 text-sm whitespace-pre-wrap`}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="mr-8 bg-gray-100 rounded-lg p-3 text-sm text-gray-500">
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={rows.length > 0 ? "Ask about your tickets..." : "Load data first..."}
            disabled={rows.length === 0 || isLoading}
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || rows.length === 0 || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  )
}
