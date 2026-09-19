import type { Choice } from '../state/types.ts'

interface ChoiceButtonsProps {
  choices: Choice[]
  onChoose: (choice: Choice) => void
}

/**
 * The authored anchors. These are the only buttons that move the story, which
 * is why they live outside the dialogue panel and are always reachable.
 */
export function ChoiceButtons({ choices, onChoose }: ChoiceButtonsProps) {
  if (choices.length === 0) return null

  return (
    <div className="choices">
      <p className="choices__prompt">What do you do?</p>
      <div className="choices__list">
        {choices.map((choice) => (
          <button key={choice.id} type="button" className="choice" onClick={() => onChoose(choice)}>
            <span className={`choice__kind choice__kind--${choice.kind}`}>
              {choice.kind === 'say' ? 'Say' : 'Do'}
            </span>
            <span>{choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
