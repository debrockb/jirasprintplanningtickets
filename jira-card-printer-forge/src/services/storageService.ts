import { storage, startsWith } from '@forge/api';
import { CardTemplate, SavedEnrichment } from '../types';

/**
 * Storage service for managing templates and enrichments in Forge storage
 */

// ============ USER-SCOPED TEMPLATES ============

/**
 * Saves a user-scoped template
 */
export async function saveUserTemplate(userId: string, template: CardTemplate): Promise<void> {
  const key = `template:user:${userId}:${template.id}`;
  await storage.set(key, template);
}

/**
 * Loads all templates for a specific user
 */
export async function loadUserTemplates(userId: string): Promise<CardTemplate[]> {
  const query = storage.query().where('key', startsWith(`template:user:${userId}:`));
  const result = await query.getMany();
  return result.results.map(item => item.value as CardTemplate);
}

/**
 * Loads a specific user template
 */
export async function loadUserTemplate(userId: string, templateId: string): Promise<CardTemplate | null> {
  const key = `template:user:${userId}:${templateId}`;
  const template = await storage.get(key);
  return template as CardTemplate | null;
}

/**
 * Deletes a user template
 */
export async function deleteUserTemplate(userId: string, templateId: string): Promise<void> {
  const key = `template:user:${userId}:${templateId}`;
  await storage.delete(key);
}

// ============ PROJECT-SCOPED SHARED TEMPLATES ============

/**
 * Saves a project-scoped shared template
 */
export async function saveSharedTemplate(projectKey: string, template: CardTemplate): Promise<void> {
  const key = `template:shared:${projectKey}:${template.id}`;
  await storage.set(key, template);
}

/**
 * Loads all shared templates for a project
 */
export async function loadSharedTemplates(projectKey: string): Promise<CardTemplate[]> {
  const query = storage.query().where('key', startsWith(`template:shared:${projectKey}:`));
  const result = await query.getMany();
  return result.results.map(item => item.value as CardTemplate);
}

/**
 * Loads a specific shared template
 */
export async function loadSharedTemplate(projectKey: string, templateId: string): Promise<CardTemplate | null> {
  const key = `template:shared:${projectKey}:${templateId}`;
  const template = await storage.get(key);
  return template as CardTemplate | null;
}

/**
 * Deletes a shared template
 */
export async function deleteSharedTemplate(projectKey: string, templateId: string): Promise<void> {
  const key = `template:shared:${projectKey}:${templateId}`;
  await storage.delete(key);
}

// ============ ENRICHMENT STORAGE ============

/**
 * Saves a user enrichment configuration
 */
export async function saveUserEnrichment(userId: string, enrichment: SavedEnrichment): Promise<void> {
  const key = `enrichment:user:${userId}:${enrichment.id}`;
  await storage.set(key, enrichment);
}

/**
 * Loads all enrichments for a user
 */
export async function loadUserEnrichments(userId: string): Promise<SavedEnrichment[]> {
  const query = storage.query().where('key', startsWith(`enrichment:user:${userId}:`));
  const result = await query.getMany();
  return result.results.map(item => item.value as SavedEnrichment);
}

/**
 * Deletes a user enrichment
 */
export async function deleteUserEnrichment(userId: string, enrichmentId: string): Promise<void> {
  const key = `enrichment:user:${userId}:${enrichmentId}`;
  await storage.delete(key);
}

// ============ AI PROVIDER CONFIGURATION (NON-SECRET) ============

export interface AIProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  customHeaders?: Record<string, string>;
}

/**
 * Saves AI provider configuration (non-secret parts)
 */
export async function saveAIConfig(userId: string, config: AIProviderConfig): Promise<void> {
  const key = `ai-config:user:${userId}`;
  await storage.set(key, config);
}

/**
 * Loads AI provider configuration
 */
export async function loadAIConfig(userId: string): Promise<AIProviderConfig | null> {
  const key = `ai-config:user:${userId}`;
  const config = await storage.get(key);
  return config as AIProviderConfig | null;
}

/**
 * Saves shared AI provider configuration for a project
 */
export async function saveSharedAIConfig(projectKey: string, config: AIProviderConfig): Promise<void> {
  const key = `ai-config:shared:${projectKey}`;
  await storage.set(key, config);
}

/**
 * Loads shared AI provider configuration for a project
 */
export async function loadSharedAIConfig(projectKey: string): Promise<AIProviderConfig | null> {
  const key = `ai-config:shared:${projectKey}`;
  const config = await storage.get(key);
  return config as AIProviderConfig | null;
}

// ============ SECRET STORAGE (API KEYS) ============

/**
 * Saves user API key securely
 */
export async function saveUserAPIKey(userId: string, apiKey: string): Promise<void> {
  const key = `ai-key:user:${userId}`;
  await storage.setSecret(key, apiKey);
}

/**
 * Retrieves user API key securely
 */
export async function getUserAPIKey(userId: string): Promise<string | null> {
  const key = `ai-key:user:${userId}`;
  const apiKey = await storage.getSecret(key);
  return apiKey as string | null;
}

/**
 * Deletes user API key
 */
export async function deleteUserAPIKey(userId: string): Promise<void> {
  const key = `ai-key:user:${userId}`;
  await storage.deleteSecret(key);
}

/**
 * Saves shared API key for a project (admin only)
 */
export async function saveSharedAPIKey(projectKey: string, apiKey: string): Promise<void> {
  const key = `ai-key:shared:${projectKey}`;
  await storage.setSecret(key, apiKey);
}

/**
 * Retrieves shared API key for a project
 */
export async function getSharedAPIKey(projectKey: string): Promise<string | null> {
  const key = `ai-key:shared:${projectKey}`;
  const apiKey = await storage.getSecret(key);
  return apiKey as string | null;
}

/**
 * Deletes shared API key for a project
 */
export async function deleteSharedAPIKey(projectKey: string): Promise<void> {
  const key = `ai-key:shared:${projectKey}`;
  await storage.deleteSecret(key);
}

// ============ USER PREFERENCES ============

export interface UserPreferences {
  defaultProjectKey?: string;
  defaultJQL?: string;
  theme?: 'light' | 'dark';
  defaultCardSize?: 'half-a4' | 'full-a4';
}

/**
 * Saves user preferences
 */
export async function saveUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const key = `prefs:user:${userId}`;
  await storage.set(key, prefs);
}

/**
 * Loads user preferences
 */
export async function loadUserPreferences(userId: string): Promise<UserPreferences | null> {
  const key = `prefs:user:${userId}`;
  const prefs = await storage.get(key);
  return prefs as UserPreferences | null;
}
