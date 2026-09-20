import type { ImaginedScene, StoryEntry } from '../state/types.ts'

export interface StoryPage { sceneId?: string; narration: string; moments: StoryEntry[]; imaginedScene?: ImaginedScene; key: string }

/**
 * Where bought decorations are stored for one screenful of story: the authored
 * scene, plus the generated scene that was on it when they were placed. The
 * live map and the storybook both build the key here so a page can never look
 * up an arrangement the child made somewhere else.
 */
export function sceneItemKey(sceneId: string, imaginedEntryId?: string): string {
  return `${sceneId}:${imaginedEntryId ?? 'authored'}`
}

export function makeStoryPages(log: StoryEntry[]): StoryPage[] {
  const pages: StoryPage[] = []
  for (let index = 0; index < log.length; index += 1) {
    const item = log[index]
    if (item.kind === 'narration') {
      const current = pages.at(-1)
      if (item.imaginedScene) pages.push({ sceneId: item.sceneId, narration: item.text, moments: [], imaginedScene: item.imaginedScene, key: item.id })
      else if (item.sceneId && current?.sceneId === item.sceneId) current.narration += `\n\n${item.text}`
      else if (!item.sceneId && current && (log[index + 1]?.kind === 'narration' || /joins you on the path|steps out of your drawing/.test(item.text))) current.narration += `\n\n${item.text}`
      else pages.push({ sceneId: item.sceneId, narration: item.text, moments: [], key: item.id })
    }
    else if (item.kind !== 'system') {
      if (!pages.length) pages.push({ narration: '', moments: [], key: item.id })
      pages[pages.length - 1].moments.push(item)
    }
  }
  return pages
}
