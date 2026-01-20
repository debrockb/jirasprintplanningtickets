import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AIProvider, ChatMessage } from '../types'

interface AIStore {
  provider: AIProvider | null
  setProvider: (provider: AIProvider | null) => void

  chatHistory: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearHistory: () => void

  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      provider: {
        name: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3.2'
      },
      setProvider: (provider) => set({ provider }),

      chatHistory: [],
      addMessage: (message) => set(state => ({
        chatHistory: [...state.chatHistory, message]
      })),
      clearHistory: () => set({ chatHistory: [] }),

      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading })
    }),
    {
      name: 'tickets-ai-store',
      partialize: (state) => ({ provider: state.provider })
    }
  )
)
