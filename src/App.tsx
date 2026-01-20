import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { FieldMapper } from './components/FieldMapper'
import { CardDesigner } from './components/CardDesigner'
import { Enrichment } from './components/Enrichment'
import { PrintView } from './components/PrintView'
import { AIChat } from './components/AIChat'
import { TemplateManager } from './components/TemplateManager'
import { StylePanel } from './components/StylePanel'
import { useDataStore } from './stores/dataStore'

type Tab = 'design' | 'print'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('design')
  const rows = useDataStore(state => state.rows)
  const columns = useDataStore(state => state.columns)
  const clearData = useDataStore(state => state.clearData)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="no-print bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Ticket Card Printer</h1>

          <div className="flex items-center gap-4">
            <TemplateManager />
            {rows.length > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {rows.length} tickets loaded ({columns.length} columns)
                </span>
                <button
                  onClick={clearData}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear data
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        {rows.length > 0 && (
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab('design')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'design'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Design Cards
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'print'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Print Preview
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {rows.length === 0 ? (
          <FileUpload />
        ) : activeTab === 'design' ? (
          <div className="flex gap-4">
            {/* Left sidebar */}
            <div className="w-72 flex-shrink-0 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
              <FieldMapper />
              <StylePanel />
              <Enrichment />
            </div>

            {/* Card designer */}
            <div className="flex-1 min-w-0">
              <CardDesigner />
            </div>
          </div>
        ) : (
          <PrintView />
        )}
      </main>

      {/* AI Chat */}
      <AIChat />
    </div>
  )
}

export default App
