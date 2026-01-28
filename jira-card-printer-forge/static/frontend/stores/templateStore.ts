import { create } from 'zustand';
import { CardTemplate, SavedEnrichment } from '../types';
import * as forgeClient from '../services/forgeClient';

interface TemplateStore {
  templates: CardTemplate[];
  enrichments: SavedEnrichment[];
  currentUserId: string | null;
  currentProjectKey: string | null;

  // Initialize
  initialize: (userId: string, projectKey?: string) => Promise<void>;

  // Templates
  loadTemplates: (includeShared?: boolean) => Promise<void>;
  saveTemplate: (template: CardTemplate, shared?: boolean) => Promise<void>;
  deleteTemplate: (templateId: string, shared?: boolean) => Promise<void>;

  // Enrichments
  loadEnrichments: () => Promise<void>;
  saveEnrichment: (enrichment: SavedEnrichment) => Promise<void>;
  deleteEnrichment: (enrichmentId: string) => Promise<void>;

  // Import/Export
  exportAll: () => string;
  importAll: (json: string) => boolean;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  enrichments: [],
  currentUserId: null,
  currentProjectKey: null,

  initialize: async (userId: string, projectKey?: string) => {
    set({ currentUserId: userId, currentProjectKey: projectKey });
    await get().loadTemplates(true);
    await get().loadEnrichments();
  },

  loadTemplates: async (includeShared = false) => {
    const { currentUserId, currentProjectKey } = get();
    if (!currentUserId) return;

    try {
      const templates = await forgeClient.loadTemplates(
        currentUserId,
        currentProjectKey,
        includeShared
      );
      set({ templates });
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  },

  saveTemplate: async (template: CardTemplate, shared = false) => {
    const { currentUserId, currentProjectKey } = get();
    if (!currentUserId) return;

    try {
      await forgeClient.saveTemplate(
        currentUserId,
        template,
        shared,
        shared ? currentProjectKey : undefined
      );
      await get().loadTemplates(true);
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  },

  deleteTemplate: async (templateId: string, shared = false) => {
    const { currentUserId, currentProjectKey } = get();
    if (!currentUserId) return;

    try {
      await forgeClient.deleteTemplate(
        currentUserId,
        templateId,
        shared,
        shared ? currentProjectKey : undefined
      );
      await get().loadTemplates(true);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  },

  loadEnrichments: async () => {
    const { currentUserId } = get();
    if (!currentUserId) return;

    try {
      const enrichments = await forgeClient.loadEnrichments(currentUserId);
      set({ enrichments });
    } catch (error) {
      console.error('Failed to load enrichments:', error);
    }
  },

  saveEnrichment: async (enrichment: SavedEnrichment) => {
    const { currentUserId } = get();
    if (!currentUserId) return;

    try {
      await forgeClient.saveEnrichment(currentUserId, enrichment);
      await get().loadEnrichments();
    } catch (error) {
      console.error('Failed to save enrichment:', error);
      throw error;
    }
  },

  deleteEnrichment: async (enrichmentId: string) => {
    const { currentUserId } = get();
    if (!currentUserId) return;

    try {
      await forgeClient.deleteEnrichment(currentUserId, enrichmentId);
      await get().loadEnrichments();
    } catch (error) {
      console.error('Failed to delete enrichment:', error);
      throw error;
    }
  },

  exportAll: () => {
    const { templates, enrichments } = get();
    const exportData = {
      templates: templates,
      savedEnrichments: enrichments,
    };
    return JSON.stringify(exportData, null, 2);
  },

  importAll: (json: string) => {
    try {
      const data = JSON.parse(json);

      // Validate structure
      if (!data.templates || !Array.isArray(data.templates)) {
        console.error('Invalid format: missing templates array');
        return false;
      }
      if (!data.savedEnrichments || !Array.isArray(data.savedEnrichments)) {
        console.error('Invalid format: missing savedEnrichments array');
        return false;
      }

      // Validate each template has required fields
      for (const template of data.templates) {
        if (!template.id || !template.name || !template.fieldMappings || !template.fieldLayouts || !template.fieldStyles) {
          console.error('Invalid template structure:', template);
          return false;
        }
      }

      // Import templates (overwrite existing with same IDs)
      const currentTemplates = get().templates;
      const importedTemplateIds = new Set(data.templates.map((t: CardTemplate) => t.id));
      const mergedTemplates = [
        ...currentTemplates.filter(t => !importedTemplateIds.has(t.id)),
        ...data.templates
      ];

      // Import enrichments (overwrite existing with same IDs)
      const currentEnrichments = get().enrichments;
      const importedEnrichmentIds = new Set(data.savedEnrichments.map((e: SavedEnrichment) => e.id));
      const mergedEnrichments = [
        ...currentEnrichments.filter(e => !importedEnrichmentIds.has(e.id)),
        ...data.savedEnrichments
      ];

      set({
        templates: mergedTemplates,
        enrichments: mergedEnrichments
      });

      // Save all imported templates to backend
      const { currentUserId, currentProjectKey } = get();
      if (currentUserId) {
        Promise.all([
          ...data.templates.map((template: CardTemplate) =>
            forgeClient.saveTemplate(currentUserId, template, false, undefined)
          ),
          ...data.savedEnrichments.map((enrichment: SavedEnrichment) =>
            forgeClient.saveEnrichment(currentUserId, enrichment)
          )
        ]).then(() => {
          console.log('Import completed and synced to backend');
        }).catch(error => {
          console.error('Failed to sync imported data to backend:', error);
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  },
}));
