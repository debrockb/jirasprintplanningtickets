import api, { route } from '@forge/api';
import { TicketRow } from '../types';
import { mapIssueToTicketRow, extractColumns } from '../utils/issueMapper';
import { validateJQL, sanitizeJQL } from '../utils/validators';

export interface FetchIssuesOptions {
  jql?: string;
  projectKey?: string;
  maxResults?: number;
  startAt?: number;
  nextPageToken?: string;
  fields?: string[];
}

export interface FetchIssuesResult {
  rows: TicketRow[];
  columns: string[];
  total: number;
  startAt: number;
  maxResults: number;
  nextPageToken?: string;
}

/**
 * Fetches Jira issues and transforms them to TicketRow format
 */
export async function fetchIssues(options: FetchIssuesOptions): Promise<FetchIssuesResult> {
  const {
    jql,
    projectKey,
    maxResults = 100,
    startAt = 0,
    nextPageToken,
    fields = [
      'summary',
      'description',
      'issuetype',
      'status',
      'priority',
      'assignee',
      'reporter',
      'created',
      'updated',
      'labels',
      'components',
    ],
  } = options;

  // Build JQL query
  let finalJQL = jql || '';
  if (projectKey && !jql) {
    // Quote the project key to ensure valid JQL
    finalJQL = `project = "${projectKey}" ORDER BY created DESC`;
  }

  // Validate JQL
  if (finalJQL && !validateJQL(finalJQL)) {
    throw new Error('Invalid JQL query');
  }

  finalJQL = sanitizeJQL(finalJQL);

  try {
    // Prepare request body for the new /search/jql endpoint
    const requestBody: any = {
      jql: finalJQL,
      maxResults,
      fields,
    };

    // Only add nextPageToken if provided (for pagination)
    if (nextPageToken) {
      requestBody.nextPageToken = nextPageToken;
    }

    // Call Jira REST API (using the new /search/jql endpoint)
    const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Transform issues to TicketRow format
    const rows: TicketRow[] = data.issues.map((issue: any) => mapIssueToTicketRow(issue));
    const columns = extractColumns(rows);

    return {
      rows,
      columns,
      total: data.total || rows.length,
      startAt: startAt,
      maxResults: data.maxResults || maxResults,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.error('Error fetching Jira issues:', error);
    throw error;
  }
}

/**
 * Fetches a single Jira issue by key
 */
export async function fetchIssueByKey(issueKey: string): Promise<TicketRow | null> {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const issue = await response.json();
    return mapIssueToTicketRow(issue);
  } catch (error) {
    console.error('Error fetching Jira issue:', error);
    return null;
  }
}

/**
 * Fetches projects accessible to the current user
 */
export async function fetchProjects(): Promise<Array<{ key: string; name: string; id: string }>> {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/project/search`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const data = await response.json();
    return data.values.map((project: any) => ({
      key: project.key,
      name: project.name,
      id: project.id,
    }));
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Fetches custom field metadata for better display names
 */
export async function fetchFieldMetadata(): Promise<Map<string, any>> {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch field metadata: ${response.status}`);
    }

    const fields = await response.json();
    const fieldMap = new Map();

    fields.forEach((field: any) => {
      fieldMap.set(field.key || field.id, {
        name: field.name,
        custom: field.custom,
        schema: field.schema,
      });
    });

    return fieldMap;
  } catch (error) {
    console.error('Error fetching field metadata:', error);
    return new Map();
  }
}

/**
 * Validates if user has admin permissions for a project
 */
export async function isProjectAdmin(projectKey: string): Promise<boolean> {
  try {
    const response = await api.asUser().requestJira(
      route`/rest/api/3/user/permission/search?projectKey=${projectKey}&permissions=ADMINISTER_PROJECTS`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.permissions?.ADMINISTER_PROJECTS?.havePermission || false;
  } catch (error) {
    console.error('Error checking project admin permission:', error);
    return false;
  }
}
