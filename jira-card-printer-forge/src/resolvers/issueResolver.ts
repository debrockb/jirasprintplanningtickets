import { fetchIssues, fetchIssueByKey, fetchProjects, fetchFieldMetadata, isProjectAdmin } from '../services/jiraService';

export interface FetchIssuesPayload {
  jql?: string;
  projectKey?: string;
  maxResults?: number;
  startAt?: number;
}

export interface FetchIssuePayload {
  issueKey: string;
}

export interface CheckProjectAdminPayload {
  projectKey: string;
}

/**
 * Resolver: Fetch Jira issues based on JQL or project key
 */
export async function fetchIssuesResolver(payload: FetchIssuesPayload) {
  try {
    const result = await fetchIssues({
      jql: payload.jql,
      projectKey: payload.projectKey,
      maxResults: payload.maxResults || 100,
      startAt: payload.startAt || 0,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('Error in fetchIssuesResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch issues',
    };
  }
}

/**
 * Resolver: Fetch a single issue by key
 */
export async function fetchIssueResolver(payload: FetchIssuePayload) {
  try {
    const issue = await fetchIssueByKey(payload.issueKey);

    if (!issue) {
      return {
        success: false,
        error: 'Issue not found',
      };
    }

    return {
      success: true,
      data: issue,
    };
  } catch (error: any) {
    console.error('Error in fetchIssueResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch issue',
    };
  }
}

/**
 * Resolver: Fetch all projects accessible to the user
 */
export async function fetchProjectsResolver() {
  try {
    const projects = await fetchProjects();

    return {
      success: true,
      data: projects,
    };
  } catch (error: any) {
    console.error('Error in fetchProjectsResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch projects',
    };
  }
}

/**
 * Resolver: Fetch field metadata for better display names
 */
export async function fetchFieldMetadataResolver() {
  try {
    const fieldMap = await fetchFieldMetadata();
    const fieldArray = Array.from(fieldMap.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));

    return {
      success: true,
      data: fieldArray,
    };
  } catch (error: any) {
    console.error('Error in fetchFieldMetadataResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch field metadata',
    };
  }
}

/**
 * Resolver: Check if user is project admin
 */
export async function checkProjectAdminResolver(payload: CheckProjectAdminPayload) {
  try {
    const isAdmin = await isProjectAdmin(payload.projectKey);

    return {
      success: true,
      data: { isAdmin },
    };
  } catch (error: any) {
    console.error('Error in checkProjectAdminResolver:', error);
    return {
      success: false,
      error: error.message || 'Failed to check admin permission',
    };
  }
}
