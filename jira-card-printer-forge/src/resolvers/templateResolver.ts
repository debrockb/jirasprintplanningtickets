import {
  saveUserTemplate,
  loadUserTemplates,
  loadUserTemplate,
  deleteUserTemplate,
  saveSharedTemplate,
  loadSharedTemplates,
  loadSharedTemplate,
  deleteSharedTemplate,
  saveUserEnrichment,
  loadUserEnrichments,
  deleteUserEnrichment,
  saveUserPreferences,
  loadUserPreferences,
} from '../services/storageService';
import { isProjectAdmin } from '../services/jiraService';
import { CardTemplate, SavedEnrichment } from '../types';

export interface SaveTemplatePayload {
  userId: string;
  template: CardTemplate;
  shared?: boolean;
  projectKey?: string;
}

export interface LoadTemplatesPayload {
  userId: string;
  projectKey?: string;
  includeShared?: boolean;
}

export interface DeleteTemplatePayload {
  userId: string;
  templateId: string;
  shared?: boolean;
  projectKey?: string;
}

export interface SaveEnrichmentPayload {
  userId: string;
  enrichment: SavedEnrichment;
}

export interface LoadEnrichmentsPayload {
  userId: string;
}

export interface DeleteEnrichmentPayload {
  userId: string;
  enrichmentId: string;
}

export interface SavePreferencesPayload {
  userId: string;
  preferences: any;
}

export interface LoadPreferencesPayload {
  userId: string;
}

/**
 * Resolver: Save a template (user or shared)
 */
export async function saveTemplateResolver(payload: SaveTemplatePayload) {
  try {
    const { userId, template, shared, projectKey } = payload;

    if (shared && projectKey) {
      // Check if user is project admin
      const isAdmin = await isProjectAdmin(projectKey);
      if (!isAdmin) {
        return {
          success: false,
          error: 'You must be a project admin to create shared templates',
        };
      }
      await saveSharedTemplate(projectKey, template);
    } else {
      // Save as user template
      await saveUserTemplate(userId, template);
    }

    return {
      success: true,
      message: 'Template saved successfully',
    };
  } catch (error: any) {
    console.error('Error in saveTemplateResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to save template',
    };
  }
}

/**
 * Resolver: Load templates (user and/or shared)
 */
export async function loadTemplatesResolver(payload: LoadTemplatesPayload) {
  try {
    const { userId, projectKey, includeShared } = payload;

    let templates: CardTemplate[] = [];

    // Load user templates
    const userTemplates = await loadUserTemplates(userId);
    templates = templates.concat(userTemplates);

    // Load shared templates if requested
    if (includeShared && projectKey) {
      const sharedTemplates = await loadSharedTemplates(projectKey);
      // Mark shared templates with a flag
      const markedSharedTemplates = sharedTemplates.map(t => ({
        ...t,
        shared: true,
      }));
      templates = templates.concat(markedSharedTemplates as any);
    }

    return {
      success: true,
      data: templates,
    };
  } catch (error: any) {
    console.error('Error in loadTemplatesResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to load templates',
    };
  }
}

/**
 * Resolver: Delete a template
 */
export async function deleteTemplateResolver(payload: DeleteTemplatePayload) {
  try {
    const { userId, templateId, shared, projectKey } = payload;

    if (shared && projectKey) {
      // Check if user is project admin
      const isAdmin = await isProjectAdmin(projectKey);
      if (!isAdmin) {
        return {
          success: false,
          error: 'You must be a project admin to delete shared templates',
        };
      }
      await deleteSharedTemplate(projectKey, templateId);
    } else {
      await deleteUserTemplate(userId, templateId);
    }

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  } catch (error: any) {
    console.error('Error in deleteTemplateResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete template',
    };
  }
}

/**
 * Resolver: Save enrichment
 */
export async function saveEnrichmentResolver(payload: SaveEnrichmentPayload) {
  try {
    const { userId, enrichment } = payload;
    await saveUserEnrichment(userId, enrichment);

    return {
      success: true,
      message: 'Enrichment saved successfully',
    };
  } catch (error: any) {
    console.error('Error in saveEnrichmentResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to save enrichment',
    };
  }
}

/**
 * Resolver: Load enrichments
 */
export async function loadEnrichmentsResolver(payload: LoadEnrichmentsPayload) {
  try {
    const { userId } = payload;
    const enrichments = await loadUserEnrichments(userId);

    return {
      success: true,
      data: enrichments,
    };
  } catch (error: any) {
    console.error('Error in loadEnrichmentsResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to load enrichments',
    };
  }
}

/**
 * Resolver: Delete enrichment
 */
export async function deleteEnrichmentResolver(payload: DeleteEnrichmentPayload) {
  try {
    const { userId, enrichmentId } = payload;
    await deleteUserEnrichment(userId, enrichmentId);

    return {
      success: true,
      message: 'Enrichment deleted successfully',
    };
  } catch (error: any) {
    console.error('Error in deleteEnrichmentResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete enrichment',
    };
  }
}

/**
 * Resolver: Save user preferences
 */
export async function savePreferencesResolver(payload: SavePreferencesPayload) {
  try {
    const { userId, preferences } = payload;
    await saveUserPreferences(userId, preferences);

    return {
      success: true,
      message: 'Preferences saved successfully',
    };
  } catch (error: any) {
    console.error('Error in savePreferencesResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to save preferences',
    };
  }
}

/**
 * Resolver: Load user preferences
 */
export async function loadPreferencesResolver(payload: LoadPreferencesPayload) {
  try {
    const { userId } = payload;
    const preferences = await loadUserPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  } catch (error: any) {
    console.error('Error in loadPreferencesResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to load preferences',
    };
  }
}
