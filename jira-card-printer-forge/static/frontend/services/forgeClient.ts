import { invoke, view } from '@forge/bridge';

/**
 * Forge Bridge Client - Communicates with backend resolvers
 */

// ============ CONTEXT ============

export async function getContext() {
  const result = await invoke('getContext');
  return result.data;
}

// ============ ISSUE OPERATIONS ============

export interface FetchIssuesParams {
  jql?: string;
  projectKey?: string;
  maxResults?: number;
  startAt?: number;
}

export async function fetchIssues(params: FetchIssuesParams) {
  const result = await invoke('fetchIssues', params);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function fetchIssueByKey(issueKey: string) {
  const result = await invoke('fetchIssue', { issueKey });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function fetchProjects() {
  const result = await invoke('fetchProjects');
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function fetchFieldMetadata() {
  const result = await invoke('fetchFieldMetadata');
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function checkProjectAdmin(projectKey: string) {
  const result = await invoke('checkProjectAdmin', { projectKey });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data.isAdmin;
}

// ============ TEMPLATE OPERATIONS ============

export async function saveTemplate(
  userId: string,
  template: any,
  shared?: boolean,
  projectKey?: string
) {
  const result = await invoke('saveTemplate', {
    userId,
    template,
    shared,
    projectKey,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadTemplates(
  userId: string,
  projectKey?: string,
  includeShared?: boolean
) {
  const result = await invoke('loadTemplates', {
    userId,
    projectKey,
    includeShared,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function deleteTemplate(
  userId: string,
  templateId: string,
  shared?: boolean,
  projectKey?: string
) {
  const result = await invoke('deleteTemplate', {
    userId,
    templateId,
    shared,
    projectKey,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

// ============ ENRICHMENT OPERATIONS ============

export async function saveEnrichment(userId: string, enrichment: any) {
  const result = await invoke('saveEnrichment', { userId, enrichment });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadEnrichments(userId: string) {
  const result = await invoke('loadEnrichments', { userId });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function deleteEnrichment(userId: string, enrichmentId: string) {
  const result = await invoke('deleteEnrichment', { userId, enrichmentId });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

// ============ PREFERENCES OPERATIONS ============

export async function savePreferences(userId: string, preferences: any) {
  const result = await invoke('savePreferences', { userId, preferences });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadPreferences(userId: string) {
  const result = await invoke('loadPreferences', { userId });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

// ============ AI OPERATIONS ============

export interface AIConfig {
  name: string;
  endpoint: string;
  model: string;
  customHeaders?: Record<string, string>;
}

export async function saveAIConfig(
  userId: string,
  config: AIConfig,
  apiKey: string,
  shared?: boolean,
  projectKey?: string
) {
  const result = await invoke('saveAIConfig', {
    userId,
    config,
    apiKey,
    shared,
    projectKey,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadAIConfig(
  userId: string,
  projectKey?: string,
  useShared?: boolean
) {
  const result = await invoke('loadAIConfig', {
    userId,
    projectKey,
    useShared,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function processField(
  userId: string,
  fieldValue: string,
  prompt: string,
  preset?: string,
  projectKey?: string,
  useShared?: boolean
) {
  const result = await invoke('processField', {
    userId,
    fieldValue,
    prompt,
    preset,
    projectKey,
    useShared,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function batchProcessFields(
  userId: string,
  fieldValues: string[],
  prompt: string,
  preset?: string,
  projectKey?: string,
  useShared?: boolean
) {
  const result = await invoke('batchProcessFields', {
    userId,
    fieldValues,
    prompt,
    preset,
    projectKey,
    useShared,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export async function testAIConnection(config: AIConfig, apiKey: string) {
  const result = await invoke('testConnection', { config, apiKey });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function deleteAIConfig(
  userId: string,
  shared?: boolean,
  projectKey?: string
) {
  const result = await invoke('deleteAIConfig', { userId, shared, projectKey });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}

export async function getPresets() {
  const result = await invoke('getPresets');
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

// ============ VIEW HELPERS ============

export async function openJiraIssue(issueKey: string) {
  await view.issue.open({
    issueKey,
  });
}

export async function getViewContext() {
  const context = await view.getContext();
  return context;
}
