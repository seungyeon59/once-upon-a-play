import type { BackdropId } from './mapAssets.ts'

export type KeywordMapRule = { backdropId: BackdropId; label: string; keywords: string[] }

/**
 * Deterministic map choices for SteelHacks XIII, its hosts, sponsors, tracks,
 * and nearby universities. The first matching rule wins, so the event artwork
 * takes priority over broad words such as "city" or "school".
 */
export const KEYWORD_MAP_RULES: KeywordMapRule[] = [
  { backdropId: 'steelhacks', label: 'SteelHacks XIII in Pittsburgh', keywords: ['steelhacks', 'steel hacks', '스틸핵스', 'hackathon', '해커톤', 'hacker portal', 'pitt hack', 'university of pittsburgh', 'pittsburgh university', 'pitts university', 'pitts univ', 'pitt university', 'pitt campus', '피츠버그 대학교', '피트 대학교', 'pitt csc', 'pitt computer science club', 'pitt sci', 'school of computing and information', 'major league hacking', 'mlh'] },
  { backdropId: 'city', label: 'Pittsburgh technology district', keywords: ['pittsburgh', '피츠버그', 'pgh', 'carnegie mellon', 'cmu', 'carnegie mellon university', '카네기 멜론', '카네기멜론', 'pnc', 'compound', 'financial hack', '금융', 'bny', 'bank of new york mellon', 'stevens capital management', 'scm', 'cgi', 'marinus analytics'] },
  { backdropId: 'laboratory', label: 'AI and science laboratory', keywords: ['nvidia', '엔비디아', 'nemotron', '네모트론', 'beyond the chatbot', 'anthropic', '앤트로픽', 'claude', '클로드', 'wolfram', '울프람', 'lanxess', 'xtract', 'signal-to-insight', 'artificial intelligence', '인공지능', 'ai lab'] },
  { backdropId: 'theater', label: 'Voice and sound studio', keywords: ['elevenlabs', 'eleven labs', '일레븐랩스', 'out loud', 'text to speech', 'speech to text', 'voice agent', 'dubbing', 'sound effects', '음성', '더빙'] },
  { backdropId: 'hospital', label: 'Pittsburgh health innovation center', keywords: ['upmc', 'healthcare', 'health care', 'medical center', 'hospital', 'clinic', '의료', '병원'] },
  { backdropId: 'garden', label: 'Startup seed garden', keywords: ['pear vc', 'afore capital', 'seed round', 'venture capital', 'startup', 'fundable hack', '벤처 캐피탈', '스타트업'] },
  { backdropId: 'hackathon', label: 'Collaborative makerspace', keywords: ['vercel', 'posthog', 'press start', 'cold start', 'no wrapper', 'best game', 'beginner hack', 'cloud technologies', 'makerspace', 'coding event'] },
  { backdropId: 'classroom', label: 'University classroom', keywords: ['university', 'college', 'campus', 'student', 'computer science'] },
]

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9가-힣]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function mapForKeywords(value: string): KeywordMapRule | undefined {
  const normalized = normalize(value)
  return KEYWORD_MAP_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(normalize(keyword))))
}
