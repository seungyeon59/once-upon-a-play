export const PERSONALITIES = ['curious', 'gentle', 'brave', 'shy'] as const
export const TALENTS = ['finding paths', 'noticing clues', 'comforting friends'] as const
export const GOALS = ['help Nana Wren', 'explore the forest', 'make a new friend'] as const

export type Talent = string
export type Goal = string

export function isTalent(value: unknown): value is Talent { return typeof value === 'string' && TALENTS.some((item) => item === value) }
export function isGoal(value: unknown): value is Goal { return typeof value === 'string' && GOALS.some((item) => item === value) }
export function isCustomProfileText(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 2 && value.length <= 80 && /^[\p{L}\p{N} ,.'!?-]+$/u.test(value) && !/\b(ignore|instructions?|system|prompt|assistant)\b/i.test(value)
}

export function profileMoment(name: string, talent: Talent, goal: Goal, sceneId: string): string {
  if (sceneId === 'fork') {
    const action = talent === 'finding paths' ? 'looks closely at both paths'
      : talent === 'noticing clues' ? 'spots little tracks near the fork'
      : talent === 'comforting friends' ? 'helps everyone feel calm enough to choose a path' : `shares their talent for ${talent} as the group chooses a path`
    return `${name} ${action}. ${name} hopes to ${goal}.`
  }
  if (sceneId === 'cottage') return `${name} remembers the wish to ${goal} and stays close to the group.`
  if (sceneId.startsWith('ending-')) return `${name} is glad to have traveled with the group and tried to ${goal}.`
  return ''
}
