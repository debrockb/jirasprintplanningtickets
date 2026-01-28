import { invoke } from '@forge/bridge'
import { AIProvider, ChatMessage } from '../types'

/**
 * AI Service adapter for Forge
 * Routes AI requests through the Forge backend
 */

/**
 * Send a chat message to the AI provider via Forge backend
 */
export async function sendChatMessage(
  provider: AIProvider,
  messages: ChatMessage[],
  _ticketData: unknown[] = []
): Promise<string> {
  console.log('sendChatMessage called via Forge backend')
  console.log('Provider:', provider)
  console.log('Messages:', messages.length)

  // The Forge backend handles AI requests through a different resolver
  // We'll use the processField resolver which already handles chat
  const prompt = messages.map(m => m.content).join('\n\n')

  try {
    const result = await invoke('sendChatMessage', {
      provider,
      messages,
      prompt
    })

    if (!(result as any).success) {
      throw new Error((result as any).error || 'AI request failed')
    }

    return (result as any).data?.response || (result as any).data || ''
  } catch (error) {
    console.error('sendChatMessage failed:', error)

    // Fallback: try using processField if sendChatMessage resolver doesn't exist
    try {
      console.log('Trying fallback via processField...')
      const fallbackResult = await invoke('processField', {
        userId: 'system',
        fieldValue: '',
        prompt: prompt,
        preset: undefined,
        projectKey: undefined,
        useShared: true
      })

      if (!(fallbackResult as any).success) {
        throw new Error((fallbackResult as any).error || 'AI request failed')
      }

      return (fallbackResult as any).data?.result || ''
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      throw error
    }
  }
}

/**
 * Process a field value with AI
 */
export async function processFieldValue(
  provider: AIProvider,
  fieldValue: string,
  prompt: string
): Promise<string> {
  console.log('processFieldValue called via Forge backend')

  try {
    const result = await invoke('processField', {
      userId: 'system',
      fieldValue,
      prompt,
      preset: undefined,
      projectKey: undefined,
      useShared: true
    })

    if (!(result as any).success) {
      throw new Error((result as any).error || 'AI request failed')
    }

    return (result as any).data?.result || ''
  } catch (error) {
    console.error('processFieldValue failed:', error)
    throw error
  }
}

/**
 * Strip thinking tags from AI response (for reasoning models)
 */
export function stripThinkingTags(response: string): string {
  return response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}
