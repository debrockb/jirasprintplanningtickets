import React, { useState, useEffect } from 'react';
import * as forgeClient from '../services/forgeClient';
import { TicketRow } from '../types';

interface IssueSelectorProps {
  onIssuesSelected: (rows: TicketRow[], columns: string[]) => void;
  currentUserId: string;
}

export const IssueSelector: React.FC<IssueSelectorProps> = ({
  onIssuesSelected,
  currentUserId,
}) => {
  const [jql, setJql] = useState<string>('');
  const [projectKey, setProjectKey] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ key: string; name: string; id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueCount, setIssueCount] = useState<number>(0);

  // Preset JQL queries
  const presetQueries = [
    { label: 'Recent Issues', jql: 'ORDER BY created DESC' },
    { label: 'My Open Issues', jql: 'assignee = currentUser() AND status != Done ORDER BY updated DESC' },
    { label: 'Updated This Week', jql: 'updated >= -7d ORDER BY updated DESC' },
    { label: 'High Priority', jql: 'priority = High ORDER BY created DESC' },
  ];

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await forgeClient.fetchProjects();
      setProjects(projectList);
      if (projectList.length > 0 && !projectKey) {
        setProjectKey(projectList[0].key);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message);
    }
  };

  const handleFetchIssues = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build final JQL
      let finalJQL = jql;
      if (projectKey && !jql.toLowerCase().includes('project')) {
        finalJQL = jql ? `project = ${projectKey} AND (${jql})` : `project = ${projectKey}`;
      }

      const result = await forgeClient.fetchIssues({
        jql: finalJQL || undefined,
        projectKey: !jql ? projectKey : undefined,
        maxResults: 100,
        startAt: 0,
      });

      setIssueCount(result.total);
      onIssuesSelected(result.rows, result.columns);
    } catch (err: any) {
      console.error('Failed to fetch issues:', err);
      setError(err.message || 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetQuery = (presetJql: string) => {
    setJql(presetJql);
  };

  return (
    <div className="issue-selector p-4 border-b">
      <h2 className="text-2xl font-bold mb-4">Select Jira Issues</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Project Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Project</label>
        <select
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map((project) => (
            <option key={project.key} value={project.key}>
              {project.name} ({project.key})
            </option>
          ))}
        </select>
      </div>

      {/* Preset Queries */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Quick Filters</label>
        <div className="flex flex-wrap gap-2">
          {presetQueries.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetQuery(preset.jql)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* JQL Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          JQL Query (optional)
          <span className="text-gray-500 text-xs ml-2">
            Leave empty to load all issues from selected project
          </span>
        </label>
        <textarea
          value={jql}
          onChange={(e) => setJql(e.target.value)}
          placeholder="e.g., status = 'In Progress' AND assignee = currentUser()"
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"
        />
      </div>

      {/* Fetch Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleFetchIssues}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Load Issues'}
        </button>

        {issueCount > 0 && (
          <span className="text-sm text-gray-600">
            Loaded {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Need help with JQL?</strong> Check out the{' '}
          <a
            href="https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            JQL documentation
          </a>
        </p>
      </div>
    </div>
  );
};

export default IssueSelector;
