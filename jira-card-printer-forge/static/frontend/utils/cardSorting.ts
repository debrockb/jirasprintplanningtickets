import { TicketRow, SortConfig, SimpleSortConfig, LinkedIssueGroupConfig, SortedCardResult } from '../types'

/**
 * Extracts issue keys from a field value using the provided pattern
 */
function extractIssueKeys(value: unknown, pattern: RegExp): string[] {
  if (value == null) return []
  const str = String(value)
  // Create new regex instance to avoid stateful issues with global flag
  const regex = new RegExp(pattern.source, 'g')
  const matches = str.match(regex)
  return matches || []
}

/**
 * Performs simple field-based sorting of cards
 */
function applySortSimple(
  results: SortedCardResult[],
  config: SimpleSortConfig
): SortedCardResult[] {
  const sorted = [...results]

  sorted.sort((a, b) => {
    const aVal = a.row[config.field]
    const bVal = b.row[config.field]

    // Handle null/undefined - sort to end
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let comparison = 0

    if (config.numeric) {
      const aNum = parseFloat(String(aVal))
      const bNum = parseFloat(String(bVal))
      // If either is NaN, fall back to string comparison
      comparison = isNaN(aNum) || isNaN(bNum)
        ? String(aVal).localeCompare(String(bVal))
        : aNum - bNum
    } else {
      // Natural sort with numeric awareness (e.g., "2" before "10")
      comparison = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: 'base'  // Case-insensitive
      })
    }

    return config.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

interface IssueGraphNode {
  issueKey: string
  row: TicketRow
  originalIndex: number
  linkedKeys: string[]
}

/**
 * Groups cards by linked issues using graph traversal
 */
function applySortLinkedIssues(
  results: SortedCardResult[],
  config: LinkedIssueGroupConfig
): SortedCardResult[] {
  // Extract rows from results
  const rows = results.map(r => r.row)

  // 1. Build graph
  const graph = new Map<string, IssueGraphNode>()
  const inboundRefs = new Map<string, Set<string>>()
  const rowIndexToKey = new Map<number, string>()

  results.forEach((result, resultIndex) => {
    const row = result.row
    const originalIndex = result.originalIndex

    // Extract primary key from keyField
    const keyFieldValue = row[config.keyField]
    const primaryKeys = extractIssueKeys(keyFieldValue, config.issueKeyPattern)

    if (primaryKeys.length === 0) return  // Skip cards with no primary key

    const primaryKey = primaryKeys[0]  // First match is the card's primary key
    rowIndexToKey.set(resultIndex, primaryKey)

    // Extract linked issue keys from linkedIssuesField
    const linkedFieldValue = row[config.linkedIssuesField]
    const linkedKeys = extractIssueKeys(linkedFieldValue, config.issueKeyPattern)

    graph.set(primaryKey, {
      issueKey: primaryKey,
      row,
      originalIndex,
      linkedKeys
    })

    // Track inbound references
    linkedKeys.forEach(linkedKey => {
      if (!inboundRefs.has(linkedKey)) {
        inboundRefs.set(linkedKey, new Set())
      }
      inboundRefs.get(linkedKey)!.add(primaryKey)
    })
  })

  // 2. Identify roots (not referenced by others)
  const roots: string[] = []
  graph.forEach((node, key) => {
    if (!inboundRefs.has(key)) {
      roots.push(key)
    }
  })

  // 3. DFS traversal to build groups
  const visited = new Set<string>()
  const groups: SortedCardResult[][] = []

  const dfs = (key: string, group: SortedCardResult[], groupRootKey: string) => {
    if (visited.has(key)) return  // Circular reference handling

    const node = graph.get(key)
    if (!node) return

    visited.add(key)
    group.push({
      row: node.row,
      originalIndex: node.originalIndex,
      groupId: groupRootKey,
      groupSize: 0  // Will be set after group is complete
    })

    // Visit linked issues
    node.linkedKeys.forEach(linkedKey => {
      dfs(linkedKey, group, groupRootKey)
    })
  }

  // Process each root
  roots.forEach(rootKey => {
    const group: SortedCardResult[] = []
    dfs(rootKey, group, rootKey)

    if (group.length > 0) {
      // Set group size for all cards in group
      group.forEach(card => {
        card.groupSize = group.length
      })

      // Optional: sort within groups
      if (config.sortWithinGroups) {
        group.sort((a, b) => {
          const aVal = a.row[config.sortWithinGroups!.field]
          const bVal = b.row[config.sortWithinGroups!.field]

          if (aVal == null && bVal == null) return 0
          if (aVal == null) return 1
          if (bVal == null) return -1

          const comparison = String(aVal).localeCompare(String(bVal), undefined, {
            numeric: true,
            sensitivity: 'base'
          })

          return config.sortWithinGroups!.direction === 'asc' ? comparison : -comparison
        })
      }

      groups.push(group)
    }
  })

  // IMPORTANT: Handle circular reference groups (e.g., A->B and B->A)
  // These don't have roots, so process any unvisited nodes as separate groups
  graph.forEach((node, key) => {
    if (!visited.has(key)) {
      console.log(`Found circular/unvisited group starting at: ${key}`)
      const group: SortedCardResult[] = []
      dfs(key, group, key)

      if (group.length > 0) {
        group.forEach(card => {
          card.groupSize = group.length
        })

        if (config.sortWithinGroups) {
          group.sort((a, b) => {
            const aVal = a.row[config.sortWithinGroups!.field]
            const bVal = b.row[config.sortWithinGroups!.field]

            if (aVal == null && bVal == null) return 0
            if (aVal == null) return 1
            if (bVal == null) return -1

            const comparison = String(aVal).localeCompare(String(bVal), undefined, {
              numeric: true,
              sensitivity: 'base'
            })

            return config.sortWithinGroups!.direction === 'asc' ? comparison : -comparison
          })
        }

        groups.push(group)
      }
    }
  })

  // 4. Handle cards with issue keys but not connected (orphans)
  const orphans: SortedCardResult[] = []
  graph.forEach(node => {
    if (!visited.has(node.issueKey)) {
      orphans.push({
        row: node.row,
        originalIndex: node.originalIndex
      })
    }
  })

  // 5. Handle cards with no issue keys at all
  results.forEach((result, resultIndex) => {
    const row = result.row
    const keyFieldValue = row[config.keyField]
    const primaryKeys = extractIssueKeys(keyFieldValue, config.issueKeyPattern)
    if (primaryKeys.length === 0) {
      orphans.push({
        row,
        originalIndex: result.originalIndex
      })
    }
  })

  // Sort orphans alphabetically by key field and append
  orphans.sort((a, b) => {
    const aKey = String(a.row[config.keyField] || '')
    const bKey = String(b.row[config.keyField] || '')
    return aKey.localeCompare(bKey)
  })

  // Flatten groups and append orphans
  return groups.flat().concat(orphans)
}

/**
 * Main sorting function - applies chained sort rules
 */
export function applySorting(
  rows: TicketRow[],
  config: SortConfig
): SortedCardResult[] {
  console.log('applySorting called with:', {
    rowCount: rows.length,
    rulesCount: config.rules?.length || 0,
    rules: config.rules?.map(r => r.type)
  })

  if (rows.length === 0) {
    return []
  }

  // Start with unsorted results
  let results: SortedCardResult[] = rows.map((row, index) => ({
    row,
    originalIndex: index
  }))

  // If no rules, return unsorted
  if (!config.rules || config.rules.length === 0) {
    console.log('No sorting rules, returning unsorted')
    return results
  }

  // Apply each rule in sequence
  for (const rule of config.rules) {
    console.log(`Applying rule: ${rule.type}`)
    if (rule.type === 'simple' && rule.simple) {
      results = applySortSimple(results, rule.simple)
      console.log(`Simple sort complete, results: ${results.length}`)
    } else if (rule.type === 'linked-issues' && rule.linkedIssues) {
      console.log('Applying linked-issues sorting with config:', {
        keyField: rule.linkedIssues.keyField,
        linkedIssuesField: rule.linkedIssues.linkedIssuesField,
        pattern: rule.linkedIssues.issueKeyPattern.source
      })
      results = applySortLinkedIssues(results, rule.linkedIssues)
      console.log(`Linked-issues sort complete, results: ${results.length}`)
    }
  }

  console.log('applySorting complete, returning', results.length, 'results')
  return results
}
