import { TicketRow } from '../types';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string; emailAddress?: string };
    reporter?: { displayName: string; emailAddress?: string };
    created: string;
    updated: string;
    labels: string[];
    components: Array<{ name: string }>;
    [key: string]: any; // For custom fields
  };
}

/**
 * Maps a Jira issue to the TicketRow format used by the card designer
 */
export function mapIssueToTicketRow(issue: JiraIssue): TicketRow {
  const row: TicketRow = {
    Key: issue.key,
    Summary: issue.fields.summary,
    Type: issue.fields.issuetype.name,
    Status: issue.fields.status.name,
    Priority: issue.fields.priority?.name || '',
    Assignee: issue.fields.assignee?.displayName || 'Unassigned',
    AssigneeEmail: issue.fields.assignee?.emailAddress || '',
    Reporter: issue.fields.reporter?.displayName || '',
    ReporterEmail: issue.fields.reporter?.emailAddress || '',
    Created: formatDate(issue.fields.created),
    Updated: formatDate(issue.fields.updated),
    Description: issue.fields.description || '',
    Labels: issue.fields.labels.join(', '),
    Components: issue.fields.components.map(c => c.name).join(', '),
  };

  // Map custom fields dynamically
  Object.keys(issue.fields).forEach(fieldKey => {
    if (fieldKey.startsWith('customfield_')) {
      const value = issue.fields[fieldKey];
      if (value !== null && value !== undefined) {
        // Handle different custom field types
        if (typeof value === 'object' && value.value) {
          row[fieldKey] = value.value; // Select fields
        } else if (typeof value === 'object' && value.displayName) {
          row[fieldKey] = value.displayName; // User fields
        } else if (typeof value === 'object' && value.name) {
          row[fieldKey] = value.name; // Various named objects
        } else if (Array.isArray(value)) {
          row[fieldKey] = value.map(v => v.value || v.name || v).join(', ');
        } else {
          row[fieldKey] = String(value);
        }
      }
    }
  });

  return row;
}

/**
 * Formats ISO date string to readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Extracts column names from an array of ticket rows
 */
export function extractColumns(rows: TicketRow[]): string[] {
  if (rows.length === 0) return [];

  const columnsSet = new Set<string>();
  rows.forEach(row => {
    Object.keys(row).forEach(key => columnsSet.add(key));
  });

  return Array.from(columnsSet);
}

/**
 * Gets friendly name for a Jira custom field
 */
export function getCustomFieldName(fieldKey: string, fieldMeta?: any): string {
  if (fieldMeta && fieldMeta.name) {
    return fieldMeta.name;
  }
  // Fallback: format the field key
  return fieldKey
    .replace('customfield_', 'Custom Field ')
    .replace(/_/g, ' ');
}
