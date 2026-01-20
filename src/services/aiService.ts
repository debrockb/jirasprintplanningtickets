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
  const response = await fetch(`${provider.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`LM Studio error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
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
