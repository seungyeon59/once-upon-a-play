export const PERSONALITIES = ['curious', 'gentle', 'brave', 'shy'] as const
export const TALENTS = ['finding paths', 'noticing clues', 'comforting friends'] as const
export const GOALS = ['help Nana Wren', 'explore the forest', 'make a new friend'] as const

export type Talent = typeof TALENTS[number]
export type Goal = typeof GOALS[number]

export function isTalent(value: unknown): value is Talent { return TALENTS.includes(value as Talent) }
export function isGoal(value: unknown): value is Goal { return GOALS.includes(value as Goal) }

export function profileMoment(name: string, talent: Talent, goal: Goal, sceneId: string): string {
  if (sceneId === 'fork') {
    const action = talent === 'finding paths' ? 'looks closely at both paths'
      : talent === 'noticing clues' ? 'spots little tracks near the fork'
      : 'helps everyone feel calm enough to choose a path'
    return `${name} ${action}. ${name} hopes to ${goal}.`
  }
  if (sceneId === 'cottage') return `${name} remembers the wish to ${goal} and stays close to the group.`
  if (sceneId.startsWith('ending-')) return `${name} is glad to have traveled with the group and tried to ${goal}.`
  return ''
}
