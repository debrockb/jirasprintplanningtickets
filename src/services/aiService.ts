import { AIProvider, ChatMessage, TicketRow } from '../types'

export async function sendChatMessage(
  provider: AIProvider,
  messages: ChatMessage[],
  ticketData: TicketRow[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ticketData)

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  switch (provider.name) {
    case 'ollama':
      return sendToOllama(provider, fullMessages)
    case 'lmstudio':
      return sendToLMStudio(provider, fullMessages)
    case 'openrouter':
      return sendToOpenRouter(provider, fullMessages)
    default:
      throw new Error(`Unknown provider: ${provider.name}`)
  }
}

function buildSystemPrompt(ticketData: TicketRow[]): string {
  const ticketSummary = ticketData.slice(0, 100).map((row, i) => {
    const entries = Object.entries(row)
      .filter(([_, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return `${i + 1}. ${entries}`
  }).join('\n')

  return `You are an assistant helping analyze and manage tickets. You have access to the following ticket data:

TICKET DATA (${ticketData.length} total tickets):
${ticketSummary}
${ticketData.length > 100 ? `\n... and ${ticketData.length - 100} more tickets` : ''}

You can:
1. Answer questions about the tickets (filter, search, summarize)
2. Generate content for tickets (descriptions, notes, summaries)
3. Provide insights and analysis

Be concise and helpful. When referencing tickets, use their key/ID if available.`
}

async function sendToOllama(provider: AIProvider, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${provider.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.message?.content || ''
}

async function sendToLMStudio(provider: AIProvider, messages: ChatMessage[]): Promise<string> {
  const url = `${provider.endpoint}/v1/chat/completions`
  console.log('LM Studio request to:', url)
  console.log('LM Studio model:', provider.model)
  console.log('LM Studio messages:', messages)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for large analysis tasks

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.5,
      max_tokens: 65536  // 64k tokens for very large AI sorting tasks
    }),
    signal: controller.signal
  })

  clearTimeout(timeoutId)

  console.log('LM Studio response status:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('LM Studio error response:', errorText)
    throw new Error(`LM Studio error: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('LM Studio response data:', data)
  let content = data.choices?.[0]?.message?.content || ''

  // Strip out <think> or <thinking> sections from reasoning models
  // Handle closed tags first
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  content = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

  // Handle unclosed tags - if content still starts with <think>, remove up to actual content
  if (content.toLowerCase().startsWith('<think>')) {
    // Look for where actual content might start (after blank lines or common patterns)
    const patterns = [/\n\n\*\*/, /\n\n##/, /\n\n-\s/, /\n\nProblem/i, /\n\nSolution/i]
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match.index !== undefined) {
        content = content.substring(match.index).trim()
        break
      }
    }
    // If still starts with <think>, just remove the tag line
    if (content.toLowerCase().startsWith('<think>')) {
      content = content.replace(/^<think>\s*/i, '').trim()
    }
  }

  console.log('LM Studio extracted content:', content)
  return content
}

async function sendToOpenRouter(provider: AIProvider, messages: ChatMessage[]): Promise<string> {
  if (!provider.apiKey) {
    throw new Error('OpenRouter requires an API key')
  }

  const response = await fetch(`${provider.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Ticket Card Printer'
    },
    body: JSON.stringify({
      model: provider.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function processFieldValue(
  provider: AIProvider,
  fieldValue: string,
  prompt: string
): Promise<string> {
  console.log('processFieldValue called with:', { providerName: provider.name, fieldValueLength: fieldValue.length, promptLength: prompt.length })

  const systemPrompt = `You are a helpful assistant that transforms text based on user instructions.
You will receive a text value and a transformation instruction.
Respond ONLY with the transformed text - no explanations, no meta-commentary.

FORMATTING RULES:
- Use markdown formatting: **bold** for emphasis, - for bullet points (each on new line), ## for headers
- Each bullet point MUST be on its own line
- Keep the response concise and focused on the transformation
- Do not wrap your response in quotes or code blocks`

  const userMessage = `Text to transform:
"""
${fieldValue}
"""

Transformation instruction: ${prompt}

Respond with only the transformed text:`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]

  switch (provider.name) {
    case 'ollama':
      return sendToOllama(provider, messages)
    case 'lmstudio':
      return sendToLMStudio(provider, messages)
    case 'openrouter':
      return sendToOpenRouter(provider, messages)
    default:
      throw new Error(`Unknown provider: ${provider.name}`)
  }
}

export async function testConnection(provider: AIProvider): Promise<boolean> {
  try {
    switch (provider.name) {
      case 'ollama':
        const ollamaRes = await fetch(`${provider.endpoint}/api/tags`)
        return ollamaRes.ok
      case 'lmstudio':
        const lmRes = await fetch(`${provider.endpoint}/v1/models`)
        return lmRes.ok
      case 'openrouter':
        if (!provider.apiKey) return false
        const orRes = await fetch(`${provider.endpoint}/models`, {
          headers: { 'Authorization': `Bearer ${provider.apiKey}` }
        })
        return orRes.ok
      default:
        return false
    }
  } catch {
    return false
  }
}
