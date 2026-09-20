import { useEffect, useRef, useState } from 'react'

import type { Character, ChatTurn, SuggestedChoice } from '../state/types.ts'
import { MAX_SAY_CHARS } from '../state/limits.ts'
import { ListenButton } from './ListenButton.tsx'

interface DialoguePanelProps {
  character: Character
  turns: ChatTurn[]
  suggestions: SuggestedChoice[]
  pending: boolean
  notice: string | null
  source: 'llm' | 'mock' | null
  onSay: (text: string) => void
  onClose: () => void
  onPlay: () => void
}

/**
 * Free conversation with one character. Nothing here moves the story — the
 * suggestion chips are conversation openers, and the plot only advances through
 * the anchor choices behind this panel.
 */
export function DialoguePanel({
  character,
  turns,
  suggestions,
  pending,
  notice,
  source,
  onSay,
  onClose,
  onPlay,
}: DialoguePanelProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const latestReply = [...turns].reverse().find((turn) => turn.role === 'character')?.text
  const speakingCharacter = character.id === 'red' || character.id === 'wolf' || character.id === 'grandma' ? character.id : undefined

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, pending])

  useEffect(() => {
    inputRef.current?.focus()
  }, [character.id])


  function send(text: string): void {
    const trimmed = text.trim()
    if (!trimmed || pending) return
    setDraft('')
    onSay(trimmed)
  }

  return (
    <section className="dialogue" aria-label={`Talking to ${character.name}`}>
      <header className="dialogue__head">
        <div>
          <h2>{character.name}</h2>
          <p className="dialogue__title">{character.title}</p>
        </div>
        <div className="dialogue__traits">
          {character.traits.map((trait) => (
            <span key={trait} className="trait">
              {trait}
            </span>
          ))}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close conversation">
          ✕
        </button>
      </header>


      <div className="dialogue__turns">
        {turns.length === 0 && !pending && (
          <p className="dialogue__hint">
            {character.name} is waiting. Say something, or pick one of the ideas below.
          </p>
        )}
        {turns.map((turn, index) => (
          <p
            key={index}
            className={`bubble ${turn.role === 'child' ? 'bubble--child' : 'bubble--character'}`}
          >
            {turn.text}
          </p>
        ))}
        {pending && (
          <p className="bubble bubble--character bubble--pending">
            {character.name} is thinking<span className="dots" />
          </p>
        )}
        <div ref={endRef} />
      </div>

      {latestReply && !pending && <div className="dialogue__listen"><ListenButton text={latestReply} speakingCharacter={speakingCharacter} replyMode /></div>}

      {notice && (
        <p className="dialogue__notice" role="status">
          {notice}
        </p>
      )}

      {suggestions.length > 0 && !pending && (
        <div className="dialogue__suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="chip"
              onClick={() => send(suggestion.label)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      <form
        className="dialogue__form"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={MAX_SAY_CHARS}
          placeholder={`Say something to ${character.name}...`}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
        />
        <button type="submit" className="button button--primary" disabled={pending || !draft.trim()}>
          Say it
        </button>
      </form>

      {source === 'mock' && (
        <p className="dialogue__source">
          Offline voices — add an API key to <code>server/.env</code> for live conversation.
        </p>
      )}
      <div className="dialogue__game-action"><button type="button" className="button" onClick={onPlay}>Play a mini game with {character.name} ✨</button></div>
    </section>
  )
}
