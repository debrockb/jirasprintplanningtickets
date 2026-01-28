import { create } from 'zustand';
import * as forgeClient from '../services/forgeClient';
import { AIProvider } from '../types';

interface AIConfig {
  name: string;
  endpoint: string;
  model: string;
  hasAPIKey: boolean;
}

interface AIStore {
  config: AIConfig | null;
  currentUserId: string | null;
  currentProjectKey: string | null;
  useShared: boolean;

  // Computed provider for compatibility with sorting components
  provider: AIProvider | null;

  // Initialize
  initialize: (userId: string, projectKey?: string) => Promise<void>;

  // Config
  loadConfig: () => Promise<void>;
  setUseShared: (useShared: boolean) => void;

  // Processing
  processField: (fieldValue: string, prompt: string, preset?: string) => Promise<string>;
  batchProcessFields: (fieldValues: string[], prompt: string, preset?: string) => Promise<string[]>;
}

export const useAIStore = create<AIStore>((set, get) => ({
  config: null,
  currentUserId: null,
  currentProjectKey: null,
  useShared: false,
  provider: null,

  initialize: async (userId: string, projectKey?: string) => {
    set({ currentUserId: userId, currentProjectKey: projectKey });
    await get().loadConfig();
  },

  loadConfig: async () => {
    const { currentUserId, currentProjectKey, useShared } = get();
    if (!currentUserId) return;

    try {
      const config = await forgeClient.loadAIConfig(
        currentUserId,
        currentProjectKey,
        useShared
      );

      // Also compute provider from config
      const provider: AIProvider | null = config && config.hasAPIKey
        ? {
            name: config.name as 'ollama' | 'lmstudio' | 'openrouter',
            endpoint: config.endpoint,
            model: config.model,
            apiKey: undefined // API key is stored on backend
          }
        : null;

      set({ config, provider });
    } catch (error) {
      console.error('Failed to load AI config:', error);
      set({ config: null, provider: null });
    }
  },

  setUseShared: (useShared: boolean) => {
    set({ useShared });
    get().loadConfig();
  },

  processField: async (fieldValue: string, prompt: string, preset?: string) => {
    const { currentUserId, currentProjectKey, useShared } = get();
    if (!currentUserId) throw new Error('User not initialized');

    try {
      const result = await forgeClient.processField(
        currentUserId,
        fieldValue,
        prompt,
        preset,
        currentProjectKey,
        useShared
      );
      return result.result;
    } catch (error) {
      console.error('Failed to process field:', error);
      throw error;
    }
  },

  batchProcessFields: async (fieldValues: string[], prompt: string, preset?: string) => {
    const { currentUserId, currentProjectKey, useShared } = get();
    if (!currentUserId) throw new Error('User not initialized');

    try {
      const result = await forgeClient.batchProcessFields(
        currentUserId,
        fieldValues,
        prompt,
        preset,
        currentProjectKey,
        useShared
      );
      return result.results;
    } catch (error) {
      console.error('Failed to batch process fields:', error);
      throw error;
    }
  },
}));
