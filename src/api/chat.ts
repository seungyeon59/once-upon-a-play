import type { ChatRequest, ChatResponse } from '../state/types.ts'

/**
 * Talks to the local proxy. The server already falls back to its mock when it
 * has no API key, so this only has to cope with the server being down entirely.
 */
export async function requestReply(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!response.ok) throw new Error(`chat failed: ${response.status}`)
    return (await response.json()) as ChatResponse
  } catch (error) {
    console.error('[chat]', error)
    return {
      reply: 'They seem lost in thought, and the moment passes.',
      suggestedChoices: [],
      source: 'mock',
    }
  }
}
