import type { StoryEntry } from '../state/types.ts'

export interface StoryPage { sceneId?: string; narration: string; moments: StoryEntry[] }

export function makeStoryPages(log: StoryEntry[]): StoryPage[] {
  const pages: StoryPage[] = []
  for (let index = 0; index < log.length; index += 1) {
    const item = log[index]
    if (item.kind === 'narration') {
      const current = pages.at(-1)
      if (item.sceneId && current?.sceneId === item.sceneId) current.narration += `\n\n${item.text}`
      else if (!item.sceneId && current && (log[index + 1]?.kind === 'narration' || /joins you on the path|steps out of your drawing/.test(item.text))) current.narration += `\n\n${item.text}`
      else pages.push({ sceneId: item.sceneId, narration: item.text, moments: [] })
    }
    else if (item.kind !== 'system') {
      if (!pages.length) pages.push({ narration: '', moments: [] })
      pages[pages.length - 1].moments.push(item)
    }
  }
  return pages
}
