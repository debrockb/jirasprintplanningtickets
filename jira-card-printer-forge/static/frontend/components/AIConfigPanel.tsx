import React, { useState, useEffect } from 'react';
import * as forgeClient from '../services/forgeClient';

interface AIConfigPanelProps {
  currentUserId: string;
  currentProjectKey?: string;
}

interface AIProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  customHeaders?: Record<string, string>;
}

const AI_PROVIDERS = [
  {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4',
    keyPlaceholder: 'sk-...',
  },
  {
    name: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    keyPlaceholder: 'sk-ant-...',
  },
  {
    name: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4',
    keyPlaceholder: 'sk-or-...',
  },
  {
    name: 'Azure OpenAI',
    defaultEndpoint: 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2023-05-15',
    defaultModel: 'gpt-4',
    keyPlaceholder: 'Your Azure API key',
  },
  {
    name: 'AWS Bedrock',
    defaultEndpoint: 'https://bedrock-runtime.{region}.amazonaws.com/model/{model-id}/invoke',
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    keyPlaceholder: 'AWS credentials',
  },
  {
    name: 'Custom',
    defaultEndpoint: '',
    defaultModel: '',
    keyPlaceholder: 'Your API key',
  },
];

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({
  currentUserId,
  currentProjectKey,
}) => {
  const [provider, setProvider] = useState<string>('OpenAI');
  const [endpoint, setEndpoint] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean>(false);

  useEffect(() => {
    loadConfig();
    checkAdminStatus();
  }, [currentUserId, currentProjectKey]);

  useEffect(() => {
    // Update defaults when provider changes
    const selectedProvider = AI_PROVIDERS.find((p) => p.name === provider);
    if (selectedProvider) {
      setEndpoint(selectedProvider.defaultEndpoint);
      setModel(selectedProvider.defaultModel);
    }
  }, [provider]);

  const checkAdminStatus = async () => {
    if (currentProjectKey) {
      try {
        const isAdmin = await forgeClient.checkProjectAdmin(currentProjectKey);
        setIsProjectAdmin(isAdmin);
      } catch (err) {
        console.error('Failed to check admin status:', err);
      }
    }
  };

  const loadConfig = async () => {
    try {
      const config = await forgeClient.loadAIConfig(
        currentUserId,
        currentProjectKey,
        false
      );

      if (config) {
        setProvider(config.name);
        setEndpoint(config.endpoint);
        setModel(config.model);
        setHasConfig(config.hasAPIKey);
        // Note: API key is never returned from backend
      }
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await forgeClient.testAIConnection(
        {
          name: provider,
          endpoint,
          model,
        },
        apiKey
      );

      setTestResult('✓ Connection successful!');
    } catch (err: any) {
      setError(`Connection failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey && !hasConfig) {
      setError('Please enter your API key');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await forgeClient.saveAIConfig(
        currentUserId,
        {
          name: provider,
          endpoint,
          model,
        },
        apiKey,
        isShared,
        isShared ? currentProjectKey : undefined
      );

      setTestResult('✓ Configuration saved successfully!');
      setHasConfig(true);
      setApiKey(''); // Clear from UI for security
    } catch (err: any) {
      setError(`Failed to save configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this AI configuration?')) {
      return;
    }

    try {
      await forgeClient.deleteAIConfig(
        currentUserId,
        isShared,
        isShared ? currentProjectKey : undefined
      );
      setHasConfig(false);
      setApiKey('');
      setTestResult('Configuration deleted');
    } catch (err: any) {
      setError(`Failed to delete configuration: ${err.message}`);
    }
  };

  const selectedProvider = AI_PROVIDERS.find((p) => p.name === provider);

  return (
    <div className="ai-config-panel p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">AI Provider Configuration</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {testResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {testResult}
        </div>
      )}

      {/* Shared vs Personal */}
      {isProjectAdmin && currentProjectKey && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="mr-2"
            />
            <span className="font-medium">
              Configure for entire project team (shared)
            </span>
          </label>
          <p className="text-sm text-gray-600 mt-1 ml-6">
            When enabled, all team members will use this AI configuration
          </p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">AI Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Endpoint */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">API Endpoint</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://api.example.com/v1/chat/completions"
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {/* Model */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4"
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          API Key
          {hasConfig && (
            <span className="text-green-600 text-xs ml-2">
              (configured - leave empty to keep existing)
            </span>
          )}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={selectedProvider?.keyPlaceholder}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="text-xs text-gray-600 mt-1">
          🔒 Your API key is stored securely and never exposed to the client
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleTestConnection}
          disabled={testing || !apiKey}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>

        {hasConfig && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {/* Documentation Links */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Getting API Keys:</h3>
        <ul className="text-sm space-y-1">
          <li>
            • <strong>OpenAI:</strong>{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            • <strong>Anthropic:</strong>{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              console.anthropic.com/settings/keys
            </a>
          </li>
          <li>
            • <strong>OpenRouter:</strong>{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              openrouter.ai/keys
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AIConfigPanel;
