import {
  saveAIConfig,
  loadAIConfig,
  saveSharedAIConfig,
  loadSharedAIConfig,
  saveUserAPIKey,
  getUserAPIKey,
  saveSharedAPIKey,
  getSharedAPIKey,
  deleteUserAPIKey,
  deleteSharedAPIKey,
  AIProviderConfig,
} from '../services/storageService';
import { callAIProvider, PRESET_PROMPTS } from '../services/aiService';
import { isProjectAdmin } from '../services/jiraService';
import { validateAPIKey } from '../utils/validators';

export interface SaveAIConfigPayload {
  userId: string;
  config: AIProviderConfig;
  apiKey: string;
  shared?: boolean;
  projectKey?: string;
}

export interface LoadAIConfigPayload {
  userId: string;
  projectKey?: string;
  useShared?: boolean;
}

export interface ProcessFieldPayload {
  userId: string;
  fieldValue: string;
  prompt: string;
  preset?: string;
  projectKey?: string;
  useShared?: boolean;
}

export interface BatchProcessFieldsPayload {
  userId: string;
  fieldValues: string[];
  prompt: string;
  preset?: string;
  projectKey?: string;
  useShared?: boolean;
}

export interface TestConnectionPayload {
  config: AIProviderConfig;
  apiKey: string;
}

/**
 * Resolver: Save AI provider configuration
 */
export async function saveAIConfigResolver(payload: SaveAIConfigPayload) {
  try {
    const { userId, config, apiKey, shared, projectKey } = payload;

    // Validate API key
    if (!validateAPIKey(apiKey)) {
      return {
        success: false,
        error: 'Invalid API key format',
      };
    }

    if (shared && projectKey) {
      // Check if user is project admin
      const isAdmin = await isProjectAdmin(projectKey);
      if (!isAdmin) {
        return {
          success: false,
          error: 'You must be a project admin to configure shared AI settings',
        };
      }

      // Save shared config and key
      await saveSharedAIConfig(projectKey, config);
      await saveSharedAPIKey(projectKey, apiKey);
    } else {
      // Save user config and key
      await saveAIConfig(userId, config);
      await saveUserAPIKey(userId, apiKey);
    }

    return {
      success: true,
      message: 'AI configuration saved successfully',
    };
  } catch (error: any) {
    console.error('Error in saveAIConfigResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to save AI configuration',
    };
  }
}

/**
 * Resolver: Load AI provider configuration
 */
export async function loadAIConfigResolver(payload: LoadAIConfigPayload) {
  try {
    const { userId, projectKey, useShared } = payload;

    let config: AIProviderConfig | null = null;

    // Try to load shared config first if requested
    if (useShared && projectKey) {
      config = await loadSharedAIConfig(projectKey);
    }

    // Fall back to user config
    if (!config) {
      config = await loadAIConfig(userId);
    }

    if (!config) {
      return {
        success: true,
        data: null,
      };
    }

    // Never return the API key to the client
    return {
      success: true,
      data: {
        ...config,
        hasAPIKey: true, // Indicate that a key is configured
      },
    };
  } catch (error: any) {
    console.error('Error in loadAIConfigResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to load AI configuration',
    };
  }
}

/**
 * Resolver: Process a single field with AI
 */
export async function processFieldResolver(payload: ProcessFieldPayload) {
  try {
    const { userId, fieldValue, prompt, preset, projectKey, useShared } = payload;

    // Get config and API key
    let config: AIProviderConfig | null = null;
    let apiKey: string | null = null;

    // Try shared config first if requested
    if (useShared && projectKey) {
      config = await loadSharedAIConfig(projectKey);
      apiKey = await getSharedAPIKey(projectKey);
    }

    // Fall back to user config
    if (!config || !apiKey) {
      config = await loadAIConfig(userId);
      apiKey = await getUserAPIKey(userId);
    }

    if (!config || !apiKey) {
      return {
        success: false,
        error: 'AI provider not configured. Please configure your AI settings first.',
      };
    }

    // Get prompt (use preset if specified)
    const finalPrompt = preset && PRESET_PROMPTS[preset as keyof typeof PRESET_PROMPTS]
      ? PRESET_PROMPTS[preset as keyof typeof PRESET_PROMPTS]
      : prompt;

    // Call AI provider
    const result = await callAIProvider(
      { ...config, apiKey },
      {
        prompt: finalPrompt,
        fieldValue,
        systemPrompt: 'You are a helpful assistant that transforms text based on user instructions. Return only the transformed text without any explanations or additional formatting.',
      }
    );

    return {
      success: true,
      data: {
        result: result.result,
        usage: result.usage,
      },
    };
  } catch (error: any) {
    console.error('Error in processFieldResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to process field with AI',
    };
  }
}

/**
 * Resolver: Batch process multiple fields with AI
 */
export async function batchProcessFieldsResolver(payload: BatchProcessFieldsPayload) {
  try {
    const { userId, fieldValues, prompt, preset, projectKey, useShared } = payload;

    // Get config and API key
    let config: AIProviderConfig | null = null;
    let apiKey: string | null = null;

    // Try shared config first if requested
    if (useShared && projectKey) {
      config = await loadSharedAIConfig(projectKey);
      apiKey = await getSharedAPIKey(projectKey);
    }

    // Fall back to user config
    if (!config || !apiKey) {
      config = await loadAIConfig(userId);
      apiKey = await getUserAPIKey(userId);
    }

    if (!config || !apiKey) {
      return {
        success: false,
        error: 'AI provider not configured',
      };
    }

    // Get prompt
    const finalPrompt = preset && PRESET_PROMPTS[preset as keyof typeof PRESET_PROMPTS]
      ? PRESET_PROMPTS[preset as keyof typeof PRESET_PROMPTS]
      : prompt;

    // Process all fields
    const results: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < fieldValues.length; i++) {
      try {
        const result = await callAIProvider(
          { ...config, apiKey },
          {
            prompt: finalPrompt,
            fieldValue: fieldValues[i],
            systemPrompt: 'You are a helpful assistant that transforms text based on user instructions. Return only the transformed text without any explanations or additional formatting.',
          }
        );
        results.push(result.result);
      } catch (error: any) {
        results.push(fieldValues[i]); // Keep original on error
        errors.push({ index: i, error: error.message });
      }
    }

    return {
      success: true,
      data: {
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error: any) {
    console.error('Error in batchProcessFieldsResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to batch process fields',
    };
  }
}

/**
 * Resolver: Test AI connection
 */
export async function testConnectionResolver(payload: TestConnectionPayload) {
  try {
    const { config, apiKey } = payload;

    if (!validateAPIKey(apiKey)) {
      return {
        success: false,
        error: 'Invalid API key format',
      };
    }

    // Try a simple test request
    const result = await callAIProvider(
      { ...config, apiKey },
      {
        prompt: 'Say "Connection successful" if you can read this.',
        fieldValue: 'Test',
      }
    );

    return {
      success: true,
      message: 'Connection test successful',
      data: result.result,
    };
  } catch (error: any) {
    console.error('Error in testConnectionResolver:', error);
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}

/**
 * Resolver: Delete AI configuration
 */
export async function deleteAIConfigResolver(payload: { userId: string; shared?: boolean; projectKey?: string }) {
  try {
    const { userId, shared, projectKey } = payload;

    if (shared && projectKey) {
      const isAdmin = await isProjectAdmin(projectKey);
      if (!isAdmin) {
        return {
          success: false,
          error: 'You must be a project admin to delete shared AI settings',
        };
      }
      await deleteSharedAPIKey(projectKey);
    } else {
      await deleteUserAPIKey(userId);
    }

    return {
      success: true,
      message: 'AI configuration deleted successfully',
    };
  } catch (error: any) {
    console.error('Error in deleteAIConfigResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete AI configuration',
    };
  }
}

/**
 * Resolver: Get preset prompts
 */
export async function getPresetsResolver() {
  return {
    success: true,
    data: PRESET_PROMPTS,
  };
}
