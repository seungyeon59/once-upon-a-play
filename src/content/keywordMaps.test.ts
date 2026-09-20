import assert from 'node:assert/strict'
import { test } from 'node:test'

import { KEYWORD_MAP_RULES, mapForKeywords } from './keywordMaps.ts'

test('SteelHacks and Pitt prompts use the official event backdrop', () => {
  for (const prompt of ['Go to SteelHacks', 'Join a hackathon', 'Visit Pitts Univ.', 'Walk around the Pitt campus']) {
    assert.equal(mapForKeywords(prompt)?.backdropId, 'steelhacks', prompt)
  }
  assert.equal(mapForKeywords('피츠버그 대학교 해커톤에 가자')?.backdropId, 'steelhacks')
})

test('Pittsburgh, CMU, NVIDIA, voice, health, and startup terms have fixed maps', () => {
  assert.equal(mapForKeywords('Explore Pittsburgh with CMU friends')?.backdropId, 'city')
  assert.equal(mapForKeywords('Build with NVIDIA Nemotron')?.backdropId, 'laboratory')
  assert.equal(mapForKeywords('엔비디아 인공지능 연구실')?.backdropId, 'laboratory')
  assert.equal(mapForKeywords('Try the ElevenLabs voice track')?.backdropId, 'theater')
  assert.equal(mapForKeywords('Visit UPMC')?.backdropId, 'hospital')
  assert.equal(mapForKeywords('Pitch to Pear VC')?.backdropId, 'garden')
})

test('every SteelHacks XIII host and sponsor is represented by a keyword rule', () => {
  const allKeywords = KEYWORD_MAP_RULES.flatMap((rule) => rule.keywords)
  for (const sponsor of ['Pitt Computer Science Club', 'Pitt School of Computing and Information', 'PNC', 'LANXESS', 'NVIDIA', 'ElevenLabs', 'Anthropic', 'CGI', 'Stevens Capital Management', 'Pear VC', 'Afore Capital', 'BNY', 'Marinus Analytics', 'UPMC', 'Major League Hacking', 'Wolfram', 'Vercel', 'PostHog']) {
    assert.ok(allKeywords.some((keyword) => sponsor.toLowerCase().includes(keyword) || keyword.includes(sponsor.toLowerCase())), sponsor)
  }
})
