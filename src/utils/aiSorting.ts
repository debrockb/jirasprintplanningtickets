import { TicketRow, AISortConfig, SortedCardResult, AIProvider, GroupingStrategy } from '../types'
import { sendChatMessage } from '../services/aiService'

/**
 * Analyze data using AI to suggest intelligent grouping strategies
 */
export async function analyzeGroupingOpportunities(
  rows: TicketRow[],
  columns: string[],
  aiProvider: AIProvider | null
): Promise<GroupingStrategy[]> {
  console.log('🔍 Analyzing data for grouping opportunities with AI...')

  if (rows.length === 0) return []
  if (!aiProvider) {
    console.warn('No AI provider available for strategy discovery')
    return []
  }

  // Sample up to 50 random rows for AI analysis
  const sampleSize = Math.min(50, rows.length)
  const sampledRows = rows
    .map((row, index) => ({ row, index, random: Math.random() }))
    .sort((a, b) => a.random - b.random)
    .slice(0, sampleSize)
    .map(item => item.row)

  // Prepare sample data for AI
  const sampleData = sampledRows.map((row, index) => {
    const data: Record<string, unknown> = { _index: index }
    columns.forEach(col => {
      data[col] = row[col]
    })
    return data
  })

  const prompt = `You are analyzing ticket/card data to suggest intelligent grouping strategies for printing/organizing.

**Your task:** Analyze this sample data and suggest 3-5 different ways these tickets could be intelligently grouped together.

**Available fields:** ${columns.join(', ')}

**Sample data (${sampleSize} of ${rows.length} total tickets):**
${JSON.stringify(sampleData, null, 2)}

**Instructions:**
1. Study the data structure and content patterns
2. Identify which fields would be most useful for grouping
3. Suggest 3-5 different grouping strategies
4. For each strategy, specify:
   - A clear name
   - A description of what it does
   - Which mode to use: "natural-language-links" (for finding references between tickets), "semantic-clustering" (for grouping by theme/category)
   - Which fields to analyze
   - A confidence score (0.0-1.0) for how well you think it will work

**Output format (JSON only, no explanation):**
[
  {
    "id": "unique-id",
    "name": "Strategy Name",
    "description": "What this strategy does",
    "mode": "natural-language-links" or "semantic-clustering",
    "suggestedFields": ["field1", "field2"],
    "confidence": 0.9
  }
]

**Examples of good strategies:**
- If you see fields with ticket references (like "SBT-711", "PROJ-123"), suggest using "natural-language-links" mode on those fields
- If you see categorical fields (Status, Team, Priority), suggest grouping by those
- If you see rich text descriptions, suggest semantic clustering on those fields

Respond with ONLY the JSON array.`

  try {
    console.log('🔍 Calling AI to discover strategies...')
    const response = await sendChatMessage(
      aiProvider,
      [{ role: 'user', content: prompt }],
      []
    )

    console.log('🔍 AI response:', response)

    // Try to parse the response
    let strategies: GroupingStrategy[]

    // Handle potential markdown code blocks
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    strategies = JSON.parse(jsonStr)

    // Validate and fix strategies
    strategies = strategies.filter(s =>
      s.id && s.name && s.mode && Array.isArray(s.suggestedFields) && s.suggestedFields.length > 0
    ).map(s => ({
      ...s,
      confidence: Math.max(0, Math.min(1, s.confidence || 0.7))
    }))

    console.log(`🔍 Found ${strategies.length} AI-suggested strategies:`, strategies.map(s => s.name))
    return strategies

  } catch (error) {
    console.error('Failed to discover strategies with AI:', error)

    // Fallback to basic strategy
    return [{
      id: 'fallback-semantic',
      name: 'AI Auto-Group',
      description: 'AI will analyze all fields and group similar tickets together',
      mode: 'semantic-clustering',
      suggestedFields: columns.slice(0, 5),
      confidence: 0.6
    }]
  }
}

/**
 * Default prompts for AI sorting modes
 */
export const DEFAULT_AI_PROMPTS = {
  naturalLanguageLinks: `Analyze these tickets and identify which ones reference each other.

Look for BOTH:
1. **Structured references** in fields like "Linked Issues" - Parse ticket IDs (e.g., "SBT-711", "PROJCARD-317")
2. **Natural language phrases** - Look for "blocked by X", "depends on X", "related to X", "same as X", "duplicate of X"

**IMPORTANT**: If a ticket has "Linked Issues" field with values like "PROJCARD-317, SBT-920", create relationships FROM that ticket TO each linked ticket with confidence 1.0.

Return a JSON array of relationships: [{"from": "TICKET-ID", "to": "TICKET-ID", "confidence": 0.0-1.0}]

Example:
- If ticket SBT-711 has Linked Issues = "PROJCARD-317", return: {"from": "SBT-711", "to": "PROJCARD-317", "confidence": 1.0}`,

  semanticClustering: `Analyze these tickets and group them by semantic similarity and theme.
Consider:
- Similar topics or features
- Same component/area
- Related functionality
- Common goals

Return a JSON object mapping ticket IDs to cluster names: {"TICKET-ID": "cluster-name"}`,

  fuzzyMatching: `Find all variations of ticket references in these descriptions.
Look for:
- Misspellings: "SBT-l367" → "SBT-1367"
- Variations: "sbt 1367", "ticket #1367", "issue 1367"
- Natural references: "the authentication bug" → find auth tickets

Return a JSON object mapping variations to canonical ticket IDs: {"variation": "TICKET-ID"}`
}

interface AIRelationship {
  from: string
  to: string
  confidence: number
}

interface AICluster {
  [ticketId: string]: string  // ticket ID -> cluster name
}

interface FuzzyMatches {
  [variation: string]: string  // variation -> canonical ticket ID
}

/**
 * Find the primary key field (ticket ID field) in the data
 */
function findKeyField(results: SortedCardResult[]): string {
  if (results.length === 0) return 'Key'

  const firstRow = results[0].row
  const possibleKeyFields = ['Key', 'key', 'ID', 'id', 'Issue Key', 'Issue ID', 'Ticket ID', 'Ticket Key']

  // Try exact matches first
  for (const field of possibleKeyFields) {
    if (field in firstRow) {
      console.log(`🔑 Found key field: ${field}`)
      return field
    }
  }

  // Default to first field with "key" or "id" in the name (case insensitive)
  const fields = Object.keys(firstRow)
  const keyField = fields.find(f => /key|id/i.test(f))
  if (keyField) {
    console.log(`🔑 Found key field by pattern: ${keyField}`)
    return keyField
  }

  console.log(`🔑 No key field found, using first field: ${fields[0]}`)
  return fields[0] || 'Key'
}

/**
 * Extract ticket data for AI analysis
 */
function prepareTicketDataForAI(
  results: SortedCardResult[],
  fieldsToAnalyze: string[],
  keyField: string
): string {
  const ticketData = results.map((result, index) => {
    const data: Record<string, unknown> = { index }

    // ALWAYS include the key field so AI can reference tickets
    data[keyField] = result.row[keyField]

    // Include requested fields
    fieldsToAnalyze.forEach(field => {
      if (field !== keyField) {  // Don't duplicate key field
        data[field] = result.row[field]
      }
    })

    return data
  })

  return JSON.stringify(ticketData, null, 2)
}

/**
 * Fallback: detect relationships locally using pattern matching
 */
function detectRelationshipsLocally(
  results: SortedCardResult[],
  fieldsToAnalyze: string[],
  keyField: string
): Map<string, string[]> {
  console.log('🔍 Local pattern detection fallback...')
  const linkMap = new Map<string, string[]>()
  const ticketPattern = /[A-Z]+-\d+/g

  // Build a set of all valid ticket IDs
  const validTicketIds = new Set(
    results.map(r => String(r.row[keyField])).filter(id => id && id !== 'undefined')
  )

  console.log(`🔍 Found ${validTicketIds.size} valid ticket IDs`)

  // For each ticket, look for references in specified fields
  results.forEach(result => {
    const ticketId = String(result.row[keyField])
    if (!ticketId || ticketId === 'undefined') return

    const links: string[] = []

    fieldsToAnalyze.forEach(field => {
      const fieldValue = String(result.row[field] || '')
      if (!fieldValue) return

      // Extract all ticket-like patterns
      const matches = fieldValue.match(ticketPattern)
      if (matches) {
        matches.forEach(match => {
          // Only add if it's a valid ticket ID and not self-reference
          if (validTicketIds.has(match) && match !== ticketId && !links.includes(match)) {
            links.push(match)
            console.log(`🔗 Local: ${ticketId} → ${match}`)
          }
        })
      }
    })

    if (links.length > 0) {
      linkMap.set(ticketId, links)
    }
  })

  console.log(`🔍 Local detection found ${linkMap.size} tickets with links`)
  return linkMap
}

/**
 * Apply natural language link detection using AI
 */
async function applyNaturalLanguageLinks(
  results: SortedCardResult[],
  config: AISortConfig,
  aiProvider: AIProvider,
  keyField: string
): Promise<Map<string, string[]>> {
  console.log('🤖 applyNaturalLanguageLinks: Starting...')
  const ticketData = prepareTicketDataForAI(results, config.fieldsToAnalyze, keyField)

  const prompt = `${config.prompts.naturalLanguageLinks}

**CRITICAL INSTRUCTIONS:**
1. The primary ticket identifier field is called "${keyField}"
2. Look at each ticket's data and find which OTHER tickets it references
3. Create relationships based on BOTH explicit references AND natural language
4. Return a JSON array of relationship objects

**Ticket data:**
${ticketData}

**Required output format (JSON array only, no markdown, no explanation):**
[
  {"from": "TICKET-ID-HERE", "to": "OTHER-TICKET-ID", "confidence": 0.9},
  {"from": "TICKET-ID-HERE", "to": "ANOTHER-TICKET-ID", "confidence": 1.0}
]

**Example:** If you see a ticket with ${keyField}="SBT-711" and a "Linked Issues" field containing "PROJCARD-317", you MUST return:
[{"from": "SBT-711", "to": "PROJCARD-317", "confidence": 1.0}]

If NO relationships are found, return an empty array: []

Respond now with ONLY the JSON array:`

  console.log('🤖 Sending prompt to AI (length:', prompt.length, 'chars)')
  console.log('🤖 Sample of data:', ticketData.substring(0, 500))

  try {
    console.log('🤖 Calling sendChatMessage...')
    const response = await sendChatMessage(
      aiProvider,
      [{ role: 'user', content: prompt }],
      []  // No ticket data (we include it in the prompt)
    )
    console.log('🤖 AI Raw Response:', response)
    console.log('🤖 AI Response length:', response.length, 'chars)')

    // Parse AI response - handle markdown code blocks
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```')) {
      console.log('🤖 Removing markdown code blocks...')
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    // Check if empty
    if (!jsonStr || jsonStr === '[]') {
      console.warn('🤖 AI returned empty array - trying local pattern detection as fallback')
      return detectRelationshipsLocally(results, config.fieldsToAnalyze, keyField)
    }

    console.log('🤖 Parsing JSON:', jsonStr.substring(0, 200))
    const relationships: AIRelationship[] = JSON.parse(jsonStr)

    if (!Array.isArray(relationships)) {
      console.error('🤖 AI response is not an array:', relationships)
      return new Map()
    }

    console.log(`🤖 Found ${relationships.length} relationships from AI`)

    // Build relationship map
    const linkMap = new Map<string, string[]>()
    relationships.forEach((rel, index) => {
      if (!rel.from || !rel.to) {
        console.warn(`🤖 Invalid relationship at index ${index}:`, rel)
        return
      }
      if (rel.confidence >= 0.5) {  // Minimum confidence threshold
        if (!linkMap.has(rel.from)) {
          linkMap.set(rel.from, [])
        }
        linkMap.get(rel.from)!.push(rel.to)
        console.log(`🔗 Link: ${rel.from} → ${rel.to} (confidence: ${rel.confidence})`)
      }
    })

    console.log(`🔗 Built link map with ${linkMap.size} source tickets`)
    return linkMap
  } catch (error) {
    console.error('AI natural language link detection failed:', error)
    console.error('Response that failed to parse:', response)
    return new Map()
  }
}

/**
 * Apply semantic clustering using AI
 */
async function applySemanticClustering(
  results: SortedCardResult[],
  config: AISortConfig,
  aiProvider: AIProvider,
  keyField: string
): Promise<Map<string, string>> {
  console.log('🤖 applySemanticClustering: Starting...')
  const ticketData = prepareTicketDataForAI(results, config.fieldsToAnalyze, keyField)

  const prompt = `${config.prompts.semanticClustering}

The ticket ID field is "${keyField}". Use this field to identify tickets in your response.

Ticket data:
${ticketData}

Respond with ONLY the JSON object, no explanation.`

  console.log('🤖 Sending prompt to AI (length:', prompt.length, 'chars)')

  try {
    console.log('🤖 Calling sendChatMessage...')
    const response = await sendChatMessage(
      aiProvider,
      [{ role: 'user', content: prompt }],
      []  // No ticket data (we include it in the prompt)
    )
    console.log('🤖 AI Response received (length:', response.length, 'chars)')

    // Parse AI response
    const clusters: AICluster = JSON.parse(response)

    // Build cluster map (ticket ID -> cluster name)
    return new Map(Object.entries(clusters))
  } catch (error) {
    console.error('AI semantic clustering failed:', error)
    return new Map()
  }
}

/**
 * Apply fuzzy matching using AI
 */
async function applyFuzzyMatching(
  results: SortedCardResult[],
  config: AISortConfig,
  aiProvider: AIProvider,
  keyField: string
): Promise<Map<string, string>> {
  console.log('🤖 applyFuzzyMatching: Starting...')
  const ticketData = prepareTicketDataForAI(results, config.fieldsToAnalyze, keyField)

  const prompt = `${config.prompts.fuzzyMatching}

The ticket ID field is "${keyField}". Use this field to identify tickets in your response.

Ticket data:
${ticketData}

Respond with ONLY the JSON object, no explanation.`

  console.log('🤖 Sending prompt to AI (length:', prompt.length, 'chars)')

  try {
    console.log('🤖 Calling sendChatMessage...')
    const response = await sendChatMessage(
      aiProvider,
      [{ role: 'user', content: prompt }],
      []  // No ticket data (we include it in the prompt)
    )
    console.log('🤖 AI Response received (length:', response.length, 'chars)')

    // Parse AI response
    const matches: FuzzyMatches = JSON.parse(response)

    return new Map(Object.entries(matches))
  } catch (error) {
    console.error('AI fuzzy matching failed:', error)
    return new Map()
  }
}

/**
 * Main AI sorting function
 * Note: This is async and should be called separately from synchronous sorting
 */
export async function applyAISorting(
  results: SortedCardResult[],
  config: AISortConfig,
  aiProvider: AIProvider | null
): Promise<SortedCardResult[]> {
  console.log('applyAISorting called', { enabled: config.enabled, hasProvider: !!aiProvider, mode: config.mode })

  if (!config.enabled || !aiProvider) {
    console.log('AI sorting skipped: enabled=', config.enabled, 'hasProvider=', !!aiProvider)
    return results
  }

  console.log('Starting AI analysis with mode:', config.mode)
  console.log('Analyzing', results.length, 'tickets')
  console.log('Fields to analyze:', config.fieldsToAnalyze)

  // Find the key field (ticket ID field) FIRST
  const keyField = findKeyField(results)
  console.log('Using key field for ticket IDs:', keyField)

  const enrichedResults = [...results]

  try {
    switch (config.mode) {
      case 'natural-language-links': {
        // Find natural language references and group related tickets
        const linkMap = await applyNaturalLanguageLinks(enrichedResults, config, aiProvider, keyField)

        console.log('🔗 Building relationship groups from AI links...')

        // Build bidirectional relationship graph
        const graph = new Map<string, Set<string>>()

        // Initialize graph with all ticket keys
        enrichedResults.forEach((result, index) => {
          const ticketKey = String(result.row[keyField] || `ticket-${index}`)
          if (!graph.has(ticketKey)) {
            graph.set(ticketKey, new Set())
          }
        })

        // Add edges from linkMap (bidirectional for grouping)
        linkMap.forEach((linkedTo, from) => {
          linkedTo.forEach(to => {
            graph.get(from)?.add(to)
            // Add reverse link for bidirectional grouping
            if (graph.has(to)) {
              graph.get(to)!.add(from)
            }
          })
        })

        // Find connected components using DFS
        const visited = new Set<string>()
        const groups: string[][] = []

        const dfs = (ticketKey: string, currentGroup: string[]) => {
          if (visited.has(ticketKey)) return
          visited.add(ticketKey)
          currentGroup.push(ticketKey)

          const neighbors = graph.get(ticketKey)
          if (neighbors) {
            neighbors.forEach(neighbor => {
              if (!visited.has(neighbor)) {
                dfs(neighbor, currentGroup)
              }
            })
          }
        }

        // Run DFS for each unvisited ticket
        enrichedResults.forEach((result, index) => {
          const ticketKey = String(result.row[keyField] || `ticket-${index}`)
          if (!visited.has(ticketKey)) {
            const group: string[] = []
            dfs(ticketKey, group)
            if (group.length > 0) {
              groups.push(group)
            }
          }
        })

        console.log(`🔗 Found ${groups.length} relationship groups`)

        // Assign group IDs and sort
        const ticketToGroup = new Map<string, string>()
        groups.forEach((group, groupIndex) => {
          const groupId = `link-group-${groupIndex}`
          group.forEach(ticketKey => {
            ticketToGroup.set(ticketKey, groupId)
          })
        })

        enrichedResults.forEach((result, index) => {
          const ticketKey = String(result.row[keyField] || `ticket-${index}`)
          const groupId = ticketToGroup.get(ticketKey)
          if (groupId) {
            result.aiGroupId = groupId
            result.groupSize = groups.find(g => ticketToGroup.get(ticketKey) === ticketToGroup.get(g[0]))?.length || 1
          }
        })

        // Sort by group ID to keep related tickets together
        enrichedResults.sort((a, b) => {
          const aGroup = a.aiGroupId || 'zzz-ungrouped'
          const bGroup = b.aiGroupId || 'zzz-ungrouped'
          return aGroup.localeCompare(bGroup)
        })

        console.log('🔗 Tickets grouped and sorted by relationships')
        break
      }

      case 'semantic-clustering': {
        // Group tickets by semantic similarity
        const clusterMap = await applySemanticClustering(enrichedResults, config, aiProvider, keyField)

        // Assign cluster IDs
        enrichedResults.forEach((result, index) => {
          const ticketKey = String(result.row[keyField] || `ticket-${index}`)
          const cluster = clusterMap.get(ticketKey)

          if (cluster) {
            result.aiGroupId = cluster
          }
        })

        // Sort by cluster
        enrichedResults.sort((a, b) => {
          const aCluster = a.aiGroupId || 'zzz-unclustered'
          const bCluster = b.aiGroupId || 'zzz-unclustered'
          return aCluster.localeCompare(bCluster)
        })
        break
      }

      case 'fuzzy-matching': {
        // Find fuzzy matches and normalize references
        const fuzzyMap = await applyFuzzyMatching(enrichedResults, config, aiProvider, keyField)

        // This mode doesn't reorder, just enriches data for later use
        enrichedResults.forEach((result, index) => {
          const ticketKey = String(result.row[keyField] || `ticket-${index}`)

          // Store similarity score if fuzzy matched
          if (fuzzyMap.has(ticketKey)) {
            result.aiSimilarity = 1.0
          }
        })
        break
      }
    }
  } catch (error) {
    console.error('AI sorting failed:', error)
    // Return original results on error
    return results
  }

  return enrichedResults
}

/**
 * Generate a simple hash for caching
 */
export function generateDataHash(rows: TicketRow[]): string {
  const str = JSON.stringify(rows.slice(0, 10))  // Hash first 10 rows
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}
