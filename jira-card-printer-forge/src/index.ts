import Resolver from '@forge/resolver';

// Issue resolvers
import {
  fetchIssuesResolver,
  fetchIssueResolver,
  fetchProjectsResolver,
  fetchFieldMetadataResolver,
  checkProjectAdminResolver,
} from './resolvers/issueResolver';

// Template resolvers
import {
  saveTemplateResolver,
  loadTemplatesResolver,
  deleteTemplateResolver,
  saveEnrichmentResolver,
  loadEnrichmentsResolver,
  deleteEnrichmentResolver,
  savePreferencesResolver,
  loadPreferencesResolver,
} from './resolvers/templateResolver';

// AI resolvers
import {
  saveAIConfigResolver,
  loadAIConfigResolver,
  processFieldResolver,
  batchProcessFieldsResolver,
  testConnectionResolver,
  deleteAIConfigResolver,
  getPresetsResolver,
} from './resolvers/aiResolver';

const resolver = new Resolver();

// ============ ISSUE RESOLVERS ============
resolver.define('fetchIssues', async ({ payload, context }) => {
  return fetchIssuesResolver(payload);
});

resolver.define('fetchIssue', async ({ payload, context }) => {
  return fetchIssueResolver(payload);
});

resolver.define('fetchProjects', async ({ payload, context }) => {
  return fetchProjectsResolver();
});

resolver.define('fetchFieldMetadata', async ({ payload, context }) => {
  return fetchFieldMetadataResolver();
});

resolver.define('checkProjectAdmin', async ({ payload, context }) => {
  return checkProjectAdminResolver(payload);
});

// ============ TEMPLATE RESOLVERS ============
resolver.define('saveTemplate', async ({ payload, context }) => {
  return saveTemplateResolver(payload);
});

resolver.define('loadTemplates', async ({ payload, context }) => {
  return loadTemplatesResolver(payload);
});

resolver.define('deleteTemplate', async ({ payload, context }) => {
  return deleteTemplateResolver(payload);
});

// ============ ENRICHMENT RESOLVERS ============
resolver.define('saveEnrichment', async ({ payload, context }) => {
  return saveEnrichmentResolver(payload);
});

resolver.define('loadEnrichments', async ({ payload, context }) => {
  return loadEnrichmentsResolver(payload);
});

resolver.define('deleteEnrichment', async ({ payload, context }) => {
  return deleteEnrichmentResolver(payload);
});

// ============ PREFERENCES RESOLVERS ============
resolver.define('savePreferences', async ({ payload, context }) => {
  return savePreferencesResolver(payload);
});

resolver.define('loadPreferences', async ({ payload, context }) => {
  return loadPreferencesResolver(payload);
});

// ============ AI RESOLVERS ============
resolver.define('saveAIConfig', async ({ payload, context }) => {
  return saveAIConfigResolver(payload);
});

resolver.define('loadAIConfig', async ({ payload, context }) => {
  return loadAIConfigResolver(payload);
});

resolver.define('processField', async ({ payload, context }) => {
  return processFieldResolver(payload);
});

resolver.define('batchProcessFields', async ({ payload, context }) => {
  return batchProcessFieldsResolver(payload);
});

resolver.define('testConnection', async ({ payload, context }) => {
  return testConnectionResolver(payload);
});

resolver.define('deleteAIConfig', async ({ payload, context }) => {
  return deleteAIConfigResolver(payload);
});

resolver.define('getPresets', async ({ payload, context }) => {
  return getPresetsResolver();
});

// ============ CONTEXT HELPER ============
resolver.define('getContext', async ({ context }) => {
  return {
    success: true,
    data: {
      accountId: context.accountId,
      localId: context.localId,
    },
  };
});

export const handler = resolver.getDefinitions();
