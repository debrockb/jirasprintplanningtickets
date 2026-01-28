import { fetch } from '@forge/api';
import { sanitizePrompt } from '../utils/validators';

export interface AIProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

export interface AIProviderRequest {
  prompt: string;
  fieldValue: string;
  systemPrompt?: string;
}

export interface AIProviderResponse {
  result: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Sends a request to the configured AI provider
 */
export async function callAIProvider(
  config: AIProviderConfig,
  request: AIProviderRequest
): Promise<AIProviderResponse> {
  const { prompt, fieldValue, systemPrompt } = request;

  // Sanitize prompt
  const sanitizedPrompt = sanitizePrompt(prompt);
  const sanitizedFieldValue = sanitizePrompt(fieldValue);

  // Determine provider type and call appropriate handler
  const providerName = config.name.toLowerCase();

  if (providerName === 'openai' || config.endpoint.includes('openai.com')) {
    return await callOpenAI(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  } else if (providerName === 'anthropic' || config.endpoint.includes('anthropic.com')) {
    return await callAnthropic(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  } else if (providerName === 'openrouter' || config.endpoint.includes('openrouter.ai')) {
    return await callOpenRouter(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  } else if (providerName === 'aws' || providerName === 'bedrock' || config.endpoint.includes('bedrock')) {
    return await callAWSBedrock(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  } else if (providerName === 'azure' || config.endpoint.includes('azure.com')) {
    return await callAzureOpenAI(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  } else {
    // Generic HTTP endpoint
    return await callGenericProvider(config, sanitizedPrompt, sanitizedFieldValue, systemPrompt);
  }
}

/**
 * OpenAI provider
 */
async function callOpenAI(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  const endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nInput text:\n${fieldValue}`,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.customHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content || '';

  return {
    result: stripThinkTags(result),
    usage: data.usage,
  };
}

/**
 * Anthropic provider
 */
async function callAnthropic(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  const endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      ...config.customHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nInput text:\n${fieldValue}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.content[0]?.text || '';

  return {
    result: stripThinkTags(result),
    usage: data.usage,
  };
}

/**
 * OpenRouter provider (unified API for multiple models)
 */
async function callOpenRouter(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  const endpoint = config.endpoint || 'https://openrouter.ai/api/v1/chat/completions';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nInput text:\n${fieldValue}`,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://jira-card-printer.forge.atlassian.com',
      'X-Title': 'Jira Card Printer',
      ...config.customHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content || '';

  return {
    result: stripThinkTags(result),
    usage: data.usage,
  };
}

/**
 * AWS Bedrock provider
 */
async function callAWSBedrock(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  // Note: AWS Bedrock requires AWS SDK and IAM credentials
  // This is a simplified version - full implementation would need AWS SDK
  const endpoint = config.endpoint;

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\nUser: ${prompt}\n\nInput text:\n${fieldValue}\n\nAssistant:`
    : `User: ${prompt}\n\nInput text:\n${fieldValue}\n\nAssistant:`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.apiKey, // Simplified - real impl uses AWS SigV4
      ...config.customHeaders,
    },
    body: JSON.stringify({
      modelId: config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: fullPrompt,
        max_tokens_to_sample: 2000,
        temperature: 0.7,
      }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AWS Bedrock API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.completion || data.content || '';

  return {
    result: stripThinkTags(result),
  };
}

/**
 * Azure OpenAI provider
 */
async function callAzureOpenAI(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  // Azure OpenAI uses deployment-specific endpoints
  // Format: https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2023-05-15
  const endpoint = config.endpoint;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nInput text:\n${fieldValue}`,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
      ...config.customHeaders,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content || '';

  return {
    result: stripThinkTags(result),
    usage: data.usage,
  };
}

/**
 * Generic provider with custom endpoint
 */
async function callGenericProvider(
  config: AIProviderConfig,
  prompt: string,
  fieldValue: string,
  systemPrompt?: string
): Promise<AIProviderResponse> {
  // Try OpenAI-compatible format first
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nInput text:\n${fieldValue}`,
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.customHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Provider API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Try to extract result from common response formats
  let result = '';
  if (data.choices && data.choices[0]?.message?.content) {
    result = data.choices[0].message.content;
  } else if (data.content) {
    result = Array.isArray(data.content) ? data.content[0]?.text : data.content;
  } else if (data.completion) {
    result = data.completion;
  } else if (data.response) {
    result = data.response;
  } else if (data.text) {
    result = data.text;
  }

  return {
    result: stripThinkTags(result),
    usage: data.usage,
  };
}

/**
 * Strips <think>...</think> tags from reasoning models
 */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Preset prompts for common field transformations
 */
export const PRESET_PROMPTS = {
  summarize: 'Summarize this text in 1-2 sentences:',
  shorten: 'Make this text shorter while keeping the key information:',
  expand: 'Expand this text with more details:',
  bullets: 'Convert this text into bullet points:',
  title: 'Create a concise title for this text (max 8 words):',
  keywords: 'Extract 3-5 keywords from this text:',
  sentiment: 'Analyze the sentiment of this text (positive, negative, or neutral):',
  category: 'Categorize this text (provide a category label):',
};
