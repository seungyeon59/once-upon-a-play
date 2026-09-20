import type { Flags, Scene, Tale } from '../../state/types.ts'
import { SNOW, HUNTSMAN, AUNTIE, VISITOR } from '../characters.ts'

/**
 * "Snow White and the Orchard Gate" — our retelling of the public-domain Snow
 * White tale, kept entirely on the castle grounds so the whole map stays
 * castle-themed: a courtyard, an orchard, and the kitchen wing.
 *
 * Branching contract: only the anchors in this file may set flags or move the
 * story. Flags set in an early scene pick the *variant* of a later scene, which
 * is what makes a choice visibly matter twenty lines later.
 */

const flagged = (key: string) => (flags: Flags) => flags[key] === true

/* ------------------------------------------------------------- scene 1 --- */

const courtyard: Scene = {
  id: 'castle-courtyard',
  title: 'The Postern Gate at Dawn',
  backdrop: 'castle-courtyard',
  objective: 'Get to Auntie Hazel’s kitchen before the guards notice the basket is gone.',
  cast: [
    { characterId: 'snow', x: 0.36, y: 0.86, scale: 1, facing: 1 },
    { characterId: 'huntsman', x: 0.67, y: 0.83, scale: 1, facing: -1 },
  ],
  variants: [
    {
      id: 'meet-rowan',
      narration:
        'The basket is heavy with orchard apples and the courtyard is emptier than you expected this early. ' +
        'Halfway to the postern gate, someone steps out of the stable shadow — a huntsman, tall and quiet, ' +
        'with dew still on his boots. He does not come closer. He just looks at the basket, then at you.\n\n' +
        '"That is an early start," he says. "Where does a basket like that go before the gates are even open?"',
      anchors: [
        {
          id: 'tell-destination',
          label: 'Tell him: to Auntie Hazel’s kitchen, past the orchard.',
          kind: 'say',
          effects: {
            setFlags: { huntsmanKnows: true },
            goToScene: 'castle-garden',
            narration:
              'Rowan repeats the name quietly, like he is filing it somewhere. "Past the orchard," he says. ' +
              '"I know the way." And then he is gone toward the wall, faster than you expected.',
          },
        },
        {
          id: 'ask-back',
          label: 'Ask him why he looks like he hasn’t slept.',
          kind: 'say',
          effects: {
            setFlags: { huntsmanCurious: true },
            goToScene: 'castle-garden',
            narration:
              'Rowan blinks. Nobody has ever asked him a question before — they usually just point him ' +
              'toward whatever needs doing. "I have had better mornings," he says, and follows at a distance, ' +
              'keeping to the hedges.',
          },
        },
        {
          id: 'share-apple',
          label: 'Take out an apple and set it on the wall for him.',
          kind: 'act',
          effects: {
            setFlags: { huntsmanFriendly: true },
            goToScene: 'castle-garden',
            narration:
              'You set an apple on the flat top of the garden wall and step back. Rowan stares at it for a ' +
              'long moment, as if it might be a trick. Then he eats it in one bite and says, very quietly, ' +
              '"Nobody has done that for me in a long time." He falls into step beside you.',
          },
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------- scene 2 --- */

const garden: Scene = {
  id: 'castle-garden',
  title: 'Where the Orchard Path Splits',
  backdrop: 'castle-garden',
  objective: 'Two ways to the kitchen wing. One is beautiful. One is fast.',
  cast: [{ characterId: 'snow', x: 0.34, y: 0.88, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'garden-with-rowan',
      when: flagged('huntsmanFriendly'),
      narration:
        'The path splits at the old sundial. Rowan walks at your shoulder now, close enough that you can ' +
        'hear him breathing.\n\nLeft, the trail opens into a blossoming orchard — Auntie Hazel’s favourite ' +
        'apples grow there. Right, it runs straight along the kitchen wall.\n\n' +
        '"The orchard way is pretty," Rowan says. "The orchard way is also slow."',
      addCast: [{ characterId: 'huntsman', x: 0.52, y: 0.87, scale: 0.95, facing: 1 }],
      anchors: [],
    },
    {
      id: 'garden-watched',
      when: flagged('huntsmanCurious'),
      narration:
        'The path splits at the old sundial. Up on the terrace steps, half-hidden, Rowan is still ' +
        'following — not hunting, just watching, the way you might watch a stranger doing something ' +
        'interesting.\n\nLeft, the blossoming orchard. Right, straight along the kitchen wall.',
      addCast: [{ characterId: 'huntsman', x: 0.82, y: 0.64, scale: 0.6, facing: -1 }],
      anchors: [],
    },
    {
      id: 'garden-alone',
      narration:
        'The path splits at the old sundial, and the garden is very quiet. Rowan is nowhere in sight. ' +
        'You know exactly where he went, because you told him.\n\nLeft, the blossoming orchard. Right, ' +
        'straight along the kitchen wall — the fast way.',
      anchors: [],
    },
  ],
}

/** Both garden variants offer the same two ways forward. */
const GARDEN_ANCHORS = [
  {
    id: 'take-orchard',
    label: 'Go left and gather a few fallen apples for Auntie Hazel.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookApples: true },
      goToScene: 'castle-kitchen',
      narration:
        'The orchard is worth it. You gather apples until your basket will not close, and the light has ' +
        'gone golden by the time you find the kitchen door.',
    },
  },
  {
    id: 'take-wall',
    label: 'Go right and take the fast way along the wall.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookApples: false },
      goToScene: 'castle-kitchen',
      narration:
        'You half-run along the kitchen wall, basket banging against your knee, and reach the door while ' +
        'the ovens are still warm.',
    },
  },
]
for (const variant of garden.variants) variant.anchors = GARDEN_ANCHORS

/* ------------------------------------------------------------- scene 3 --- */

const kitchen: Scene = {
  id: 'castle-kitchen',
  title: 'Auntie Hazel’s Door',
  backdrop: 'castle-kitchen',
  objective: 'Whatever happens next at this door, it is your call.',
  cast: [{ characterId: 'snow', x: 0.28, y: 0.93, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'he-got-here-first',
      // Told him where to go AND dawdled in the orchard: the tense version.
      when: (flags) => flags.huntsmanKnows === true && flags.tookApples === true,
      narration:
        'The kitchen door stands open. Not broken — open, the way a door is when someone walked through it ' +
        'a while ago.\n\nAuntie Hazel is not at her ovens. Her flour sack is on its side by the step. And ' +
        'from inside, unmistakably, you can hear someone moving.',
      addCast: [{ characterId: 'huntsman', x: 0.58, y: 0.9, scale: 0.85, facing: -1 }],
      anchors: [
        {
          id: 'warn-through-door',
          label: 'Shout through the open door: "Auntie! There’s someone here!"',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'apples-first',
          label: 'Hold out the apples and ask Rowan what he actually came for.',
          kind: 'act',
          effects: { setFlags: { askedHuntsman: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'slip-inside',
          label: 'Say nothing. Slip inside and look for her.',
          kind: 'act',
          effects: { setFlags: { snuck: true }, goToScene: 'ending-close-call' },
        },
      ],
    },
    {
      id: 'dead-heat',
      // Told him, but took the fast path — you arrive together.
      when: flagged('huntsmanKnows'),
      narration:
        'You reach the door at the same moment Rowan comes around the corner of the wall. For a second ' +
        'neither of you moves.\n\nInside, a window is open, and you can hear Auntie Hazel humming and ' +
        'knocking flour off a bowl. She has no idea either of you is here.',
      addCast: [{ characterId: 'huntsman', x: 0.72, y: 0.93, scale: 0.9, facing: -1 }],
      anchors: [
        {
          id: 'warn-window',
          label: 'Call in through the window before he takes another step.',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'talk-first',
          label: 'Stand at the door and ask Rowan to talk before he goes in.',
          kind: 'say',
          effects: { setFlags: { askedHuntsman: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'race-him',
          label: 'Race him to the door.',
          kind: 'act',
          effects: { setFlags: { raced: true }, goToScene: 'ending-close-call' },
        },
      ],
    },
    {
      id: 'gate-together',
      when: flagged('huntsmanFriendly'),
      narration:
        'Auntie Hazel is on the step with a sack of flour at her feet. She sees you, and then she sees who ' +
        'is standing beside you, and her hands go still.\n\nRowan stops at the door. He will not come any ' +
        'further. "This is where I turn around," he says.',
      addCast: [
        { characterId: 'huntsman', x: 0.5, y: 0.92, scale: 0.9, facing: 1 },
        { characterId: 'auntie', x: 0.72, y: 0.87, scale: 0.9, facing: -1 },
      ],
      anchors: [
        {
          id: 'introduce',
          label: 'Introduce him. "Auntie, this is Rowan. He walked me here."',
          kind: 'say',
          effects: { setFlags: { introduced: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'bolt-anyway',
          label: 'Tell Auntie to bar the door once you are both inside.',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'say-nothing',
          label: 'Say nothing. See what the two of them do.',
          kind: 'act',
          effects: { setFlags: { snuck: true }, goToScene: 'ending-close-call' },
        },
      ],
    },
    {
      id: 'watched-from-wall',
      narration:
        'Auntie Hazel is on the step, shelling peas into a bowl, entirely unbothered. The apples made it.' +
        '\n\nBut at the edge of the garden, in the long shadow of the wall, Rowan is still there. Watching. ' +
        'He has followed you the whole way and he still has not come close enough to say why.',
      addCast: [
        { characterId: 'auntie', x: 0.7, y: 0.87, scale: 0.9, facing: -1 },
        { characterId: 'huntsman', x: 0.92, y: 0.7, scale: 0.55, facing: -1 },
      ],
      anchors: [
        {
          id: 'point-him-out',
          label: 'Point at the wall. "Auntie — he followed me."',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'go-back-and-invite',
          label: 'Walk back down the garden and invite him in for supper.',
          kind: 'act',
          effects: { setFlags: { invited: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'shut-the-door',
          label: 'Get inside quickly and shut the door.',
          kind: 'act',
          effects: { setFlags: { snuck: true }, goToScene: 'ending-close-call' },
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------- endings --- */

const endingClever: Scene = {
  id: 'ending-clever',
  title: 'The Clever Warning',
  backdrop: 'castle-hall',
  objective: '',
  cast: [
    { characterId: 'snow', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'auntie', x: 0.62, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Clever Warning',
    blurb: 'You trusted your own eyes and spoke up before anyone else had to.',
  },
  variants: [
    {
      id: 'clever-apples',
      when: flagged('tookApples'),
      narration:
        'Auntie Hazel comes to the door fast for someone with flour to her elbows, takes one look, and ' +
        'puts herself between you and the huntsman — not scared, just decided.\n\nRowan does not run. He ' +
        'sits down on the step, which somehow makes him look smaller, and says, "I only wanted to know if ' +
        'you got here safe." Auntie Hazel looks at him for a long moment. Then she looks at the apples in ' +
        'your basket.\n\n"Sprout," she says, "you did exactly right to shout. And now that we have all ' +
        'stopped shouting — bring those apples in before the wasps find them."\n\nThe door stays open. ' +
        'Rowan stays outside it. Both of those were choices, and they were yours.',
      anchors: [],
    },
    {
      id: 'clever-default',
      narration:
        'Your voice carries further than you meant it to. Auntie Hazel is at the door in three strides, ' +
        'a wooden spoon still in her fist like a small kitchen weapon, and Rowan stops dead at the edge of ' +
        'the garden.\n\nNobody moves. Then Auntie Hazel says, to him, not to you: "You have been circling ' +
        'my kitchen wall for a week and never taken so much as an egg. What is it you actually want?"\n\n' +
        'Rowan has no answer. He leaves the way he came.\n\n"You did right, sprout," Auntie Hazel says, ' +
        'barring the door. "Being careful is not the same as being cruel. Ask me again tomorrow and I might ' +
        'have a better answer for him."',
      anchors: [],
    },
  ],
}

const endingFriend: Scene = {
  id: 'ending-friend',
  title: 'A Place at the Table',
  backdrop: 'castle-hall',
  objective: '',
  cast: [
    { characterId: 'snow', x: 0.3, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'huntsman', x: 0.54, y: 0.86, scale: 0.9, facing: 1 },
    { characterId: 'auntie', x: 0.76, y: 0.82, scale: 0.9, facing: -1 },
  ],
  ending: {
    title: 'A Place at the Table',
    blurb: 'You asked the question everyone else was too frightened to ask.',
  },
  variants: [
    {
      id: 'friend-shared',
      when: flagged('huntsmanFriendly'),
      narration:
        'Auntie Hazel sets down her spoon. She looks at Rowan the way she looks at a loaf she cannot quite ' +
        'name the recipe for — carefully, and without fear.\n\n"You walked her here," she says. "All the ' +
        'way?"\n\n"The orchard way is slow," Rowan says. "She would have been walking alone in the dark."' +
        '\n\nThere is a very long pause. Then Auntie Hazel goes inside and comes back with a third bowl, ' +
        'which she sets down on the step — outside the door, because some things take more than one ' +
        'evening.\n\n"Then you can eat on the step," she says. "Doors take a while, sprout. Bowls are ' +
        'faster."',
      anchors: [],
    },
    {
      id: 'friend-default',
      narration:
        'You ask it straight out: what did he actually come here for?\n\nRowan is quiet for so long that ' +
        'you think he will not answer. Then: "The Queen gives orders. You asked a question." He looks at ' +
        'the kitchen, at the light in the window. "I wanted to see that you were all right. That is all. ' +
        'That is the whole thing."\n\nAuntie Hazel, who has been listening from the doorway the entire ' +
        'time, says, "Well. That is the least frightening thing anyone has told me all month."\n\nShe sets ' +
        'a third bowl on the step. Rowan does not come inside. But he does not leave, either, and that is ' +
        'where the story stops for tonight.',
      anchors: [],
    },
  ],
}

const endingCloseCall: Scene = {
  id: 'ending-close-call',
  title: 'The Close Call',
  backdrop: 'castle-hall',
  objective: '',
  cast: [
    { characterId: 'snow', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'auntie', x: 0.64, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Close Call',
    blurb: 'You kept quiet, and the story decided some things without you.',
  },
  variants: [
    {
      id: 'close-call-default',
      narration:
        'You get the door shut. Your heart is going like a bird in a box.\n\nAnd then you hear Auntie ' +
        'Hazel, on the other side of it, out in the garden, saying — perfectly calmly — "You again. Sit ' +
        'down before you knock over my flour."\n\nWhen you finally open the door, she is holding the ' +
        'empty flour sack and Rowan is already gone past the wall.\n\n"He has been coming round for ' +
        'weeks," she says. "Never taken a thing. I keep waiting for him to ask me for something." She ' +
        'gives you a long look. "You went quiet, sprout. That is allowed. But quiet is a choice too, and ' +
        'tonight it chose for you."\n\nThe apples are still fresh. You did get here. Next time you might ' +
        'say the thing out loud.',
      anchors: [],
    },
  ],
}

/* ---------------------------------------------------------------- tale --- */

export const SNOW_WHITE: Tale = {
  id: 'snow-white',
  title: 'Snow White',
  tagline: 'A basket of apples, a garden wall, and a huntsman who couldn’t do it.',
  backdrop: 'castle-courtyard',
  startSceneId: 'castle-courtyard',
  scenes: [courtyard, garden, kitchen, endingClever, endingFriend, endingCloseCall],
  characters: [SNOW, HUNTSMAN, AUNTIE, VISITOR],
  roles: [
    { id: 'snow', title: 'Be Snow', description: 'Carry the basket and lead the story.' },
    { id: 'huntsman', title: 'Be Rowan the huntsman', description: 'See the castle grounds from Rowan’s point of view.' },
    { id: 'visitor', title: 'Be a visitor', description: 'Meet and talk to both Snow and Rowan.' },
  ],
}
