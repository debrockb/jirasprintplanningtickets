import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import * as forgeClient from './services/forgeClient';
import { useDataStore } from './stores/dataStore';
import { useTemplateStore } from './stores/templateStore';
import { useAIStore } from './stores/aiStore';

// Components
import { IssueSelector } from './components/IssueSelector';
import { CardDesigner } from './components/CardDesigner';
import { FieldMapper } from './components/FieldMapper';
import { StylePanel } from './components/StylePanel';
import { PrintView } from './components/PrintView';
import { AIFieldProcessor } from './components/AIFieldProcessor';
import { AIConfigPanel } from './components/AIConfigPanel';
import { TemplateManager } from './components/TemplateManager';
import { Enrichment } from './components/Enrichment';

type Tab = 'select' | 'design' | 'ai' | 'templates' | 'print';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>('select');
  const [userId, setUserId] = useState<string>('');
  const [projectKey, setProjectKey] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const { rows } = useDataStore();
  const initializeTemplate = useTemplateStore((state) => state.initialize);
  const initializeAI = useAIStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      // Get user context from Forge
      const context = await forgeClient.getContext();
      setUserId(context.accountId);

      // Try to get project context if available
      try {
        const viewContext = await view.getContext();
        if (viewContext.extension.project) {
          setProjectKey(viewContext.extension.project.key);
        }
      } catch (err) {
        console.log('No project context available');
      }

      // Initialize stores
      await initializeTemplate(context.accountId, projectKey);
      await initializeAI(context.accountId, projectKey);

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setLoading(false);
    }
  };

  const handleIssuesSelected = (selectedRows: any[], columns: string[]) => {
    useDataStore.getState().setData(selectedRows, columns);
    setCurrentTab('design');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Card Printer...</p>
        </div>
      </div>
    );
  }

  const hasData = rows.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Jira Card Printer</h1>
          <p className="text-sm text-gray-600 mt-1">
            Design and print custom cards from Jira issues
          </p>
        </div>

        {/* Navigation Tabs */}
        <nav className="px-6">
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setCurrentTab('select')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                currentTab === 'select'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              1. Select Issues
            </button>
            <button
              onClick={() => setCurrentTab('design')}
              disabled={!hasData}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                currentTab === 'design'
                  ? 'border-blue-600 text-blue-600'
                  : !hasData
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              2. Design Cards
            </button>
            <button
              onClick={() => setCurrentTab('ai')}
              disabled={!hasData}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                currentTab === 'ai'
                  ? 'border-blue-600 text-blue-600'
                  : !hasData
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              3. AI Processing
            </button>
            <button
              onClick={() => setCurrentTab('templates')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                currentTab === 'templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setCurrentTab('print')}
              disabled={!hasData}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                currentTab === 'print'
                  ? 'border-blue-600 text-blue-600'
                  : !hasData
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Print
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {currentTab === 'select' && (
          <IssueSelector
            onIssuesSelected={handleIssuesSelected}
            currentUserId={userId}
          />
        )}

        {currentTab === 'design' && hasData && (
          <div className="h-full flex">
            <div className="w-80 border-r bg-white overflow-auto">
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-4">Card Controls</h3>
                <FieldMapper />
                <div className="mt-6">
                  <StylePanel />
                </div>
                <div className="mt-6">
                  <Enrichment />
                </div>
              </div>
            </div>
            <div className="flex-1 p-6">
              <CardDesigner />
            </div>
          </div>
        )}

        {currentTab === 'ai' && hasData && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="space-y-6">
              <AIConfigPanel
                currentUserId={userId}
                currentProjectKey={projectKey}
              />
              <div className="border-t pt-6">
                <AIFieldProcessor />
              </div>
            </div>
          </div>
        )}

        {currentTab === 'templates' && (
          <div className="max-w-4xl mx-auto p-6">
            <TemplateManager />
          </div>
        )}

        {currentTab === 'print' && hasData && (
          <div className="h-full">
            <PrintView />
          </div>
        )}

        {!hasData && currentTab !== 'select' && currentTab !== 'templates' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No issues loaded</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select issues from the first tab to get started
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
