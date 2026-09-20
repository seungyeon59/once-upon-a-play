import type { Flags, Scene, Tale } from '../../state/types.ts'
import { CINDERS, WHISK, DAME, VISITOR } from '../characters.ts'

/**
 * "Cinderella and the Glass Hour" — our retelling of the public-domain
 * Cinderella tale, kept entirely inside the castle so the whole map stays
 * castle-themed: the scullery, a corridor, the terrace, and the ballroom.
 *
 * Branching contract: only the anchors in this file may set flags or move the
 * story. Flags set in an early scene pick the *variant* of a later scene, which
 * is what makes a choice visibly matter twenty lines later.
 */

const flagged = (key: string) => (flags: Flags) => flags[key] === true

/* ------------------------------------------------------------- scene 1 --- */

const scullery: Scene = {
  id: 'castle-scullery',
  title: 'The Scullery, an Hour Before the Ball',
  backdrop: 'castle-scullery',
  objective: 'Get to the ballroom terrace before Dame Ferro closes the doors.',
  cast: [
    { characterId: 'cinderella', x: 0.36, y: 0.86, scale: 1, facing: 1 },
    { characterId: 'whisk', x: 0.67, y: 0.83, scale: 1, facing: -1 },
  ],
  variants: [
    {
      id: 'meet-whisk',
      narration:
        'The glass slippers are hidden in your apron and the scullery is quieter than it should be this ' +
        'close to midnight. Something stirs in the cold hearth ashes — small, grey, and quick, with soot ' +
        'still on its shoulders. It does not come closer. It just looks at your apron, then at you.\n\n' +
        '"Those weren’t there this morning," it says. "Where does a girl in kitchen shoes go dressed like ' +
        'that in such a hurry?"',
      anchors: [
        {
          id: 'tell-destination',
          label: 'Tell it: to the ballroom terrace, past the conservatory.',
          kind: 'say',
          effects: {
            setFlags: { whiskKnows: true },
            goToScene: 'castle-corridor',
            narration:
              'Whisk repeats the word quietly, like it is filing it somewhere. "Past the conservatory," it ' +
              'says. "I know that way." And then it is gone into the flue, faster than you expected.',
          },
        },
        {
          id: 'ask-back',
          label: 'Ask why a spirit is hiding in a cold hearth.',
          kind: 'say',
          effects: {
            setFlags: { whiskCurious: true },
            goToScene: 'castle-corridor',
            narration:
              'Whisk blinks. Nobody has ever asked it a question before — they usually just sweep it out ' +
              'with the ash. "This is just where I live," it says, and follows at a distance, keeping to ' +
              'the shadows along the wall.',
          },
        },
        {
          id: 'share-blossom',
          label: 'Take a conservatory blossom from your apron and set it by the hearth.',
          kind: 'act',
          effects: {
            setFlags: { whiskFriendly: true },
            goToScene: 'castle-corridor',
            narration:
              'You set the blossom on the cold hearthstone and step back. Whisk stares at it for a long ' +
              'moment, as if it might be a trick. Then it holds it close and says, very quietly, "Nobody ' +
              'has ever given me anything before." It slips out of the ashes and pads along beside you.',
          },
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------- scene 2 --- */

const corridor: Scene = {
  id: 'castle-corridor',
  title: 'Where the Corridor Splits',
  backdrop: 'castle-corridor',
  objective: 'Two ways to the terrace. One is beautiful. One is fast.',
  cast: [{ characterId: 'cinderella', x: 0.34, y: 0.88, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'corridor-with-whisk',
      when: flagged('whiskFriendly'),
      narration:
        'The corridor splits at a tall glass door. Whisk pads at your heel now, close enough that you can ' +
        'hear it breathing.\n\nLeft, the door opens into the moonlit conservatory — night-blooming flowers ' +
        'Dame Ferro is proud of. Right, the servants’ stair runs straight down to the terrace.\n\n' +
        '"The conservatory way is pretty," Whisk says. "The conservatory way is also slow."',
      addCast: [{ characterId: 'whisk', x: 0.52, y: 0.87, scale: 0.95, facing: 1 }],
      anchors: [],
    },
    {
      id: 'corridor-watched',
      when: flagged('whiskCurious'),
      narration:
        'The corridor splits at a tall glass door. Up on the gallery rail, half-hidden, Whisk is still ' +
        'following — not haunting, just watching, the way you might watch a stranger doing something ' +
        'interesting.\n\nLeft, the moonlit conservatory. Right, straight down the servants’ stair.',
      addCast: [{ characterId: 'whisk', x: 0.82, y: 0.64, scale: 0.6, facing: -1 }],
      anchors: [],
    },
    {
      id: 'corridor-alone',
      narration:
        'The corridor splits at a tall glass door, and the hall is very quiet. Whisk is nowhere in sight. ' +
        'You know exactly where it went, because you told it.\n\nLeft, the moonlit conservatory. Right, ' +
        'straight down the servants’ stair — the fast way.',
      anchors: [],
    },
  ],
}

/** Both corridor variants offer the same two ways forward. */
const CORRIDOR_ANCHORS = [
  {
    id: 'take-conservatory',
    label: 'Go left and cut a few moonflowers for your hair.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookBlossoms: true },
      goToScene: 'castle-terrace',
      narration:
        'The conservatory is worth it. You gather moonflowers until your hands are full of them, and the ' +
        'candlelight has gone gold by the time you find the terrace doors.',
    },
  },
  {
    id: 'take-stair',
    label: 'Go right and take the servants’ stair.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookBlossoms: false },
      goToScene: 'castle-terrace',
      narration:
        'You half-run down the servants’ stair, slippers in hand, and reach the terrace doors while the ' +
        'music is still just starting.',
    },
  },
]
for (const variant of corridor.variants) variant.anchors = CORRIDOR_ANCHORS

/* ------------------------------------------------------------- scene 3 --- */

const terrace: Scene = {
  id: 'castle-terrace',
  title: 'Dame Ferro’s Terrace',
  backdrop: 'castle-terrace',
  objective: 'Whatever happens next at these doors, it is your call.',
  cast: [{ characterId: 'cinderella', x: 0.28, y: 0.93, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'it-got-here-first',
      // Told it where to go AND dawdled in the conservatory: the tense version.
      when: (flags) => flags.whiskKnows === true && flags.tookBlossoms === true,
      narration:
        'The terrace doors stand open. Not broken — open, the way a door is when someone slipped through ' +
        'it a while ago.\n\nDame Ferro is not at her post. Her ring of keys is on the ground by the step. ' +
        'And from just inside, unmistakably, you can hear soft footsteps.',
      addCast: [{ characterId: 'whisk', x: 0.58, y: 0.9, scale: 0.85, facing: -1 }],
      anchors: [
        {
          id: 'warn-through-door',
          label: 'Call through the open door: "Dame Ferro! Someone’s inside!"',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'blossoms-first',
          label: 'Hold out the moonflowers and ask Whisk what it actually came for.',
          kind: 'act',
          effects: { setFlags: { askedWhisk: true }, goToScene: 'ending-friend' },
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
      // Told it, but took the fast path — you arrive together.
      when: flagged('whiskKnows'),
      narration:
        'You reach the doors the same moment Whisk slips out from behind a pillar. For a second neither of ' +
        'you moves.\n\nInside, the ballroom is glowing, and you can hear Dame Ferro counting candles under ' +
        'her breath. She has no idea either of you is here.',
      addCast: [{ characterId: 'whisk', x: 0.72, y: 0.93, scale: 0.9, facing: -1 }],
      anchors: [
        {
          id: 'warn-window',
          label: 'Call in through the doors before it takes another step.',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'talk-first',
          label: 'Stand at the doors and ask Whisk to talk before it goes in.',
          kind: 'say',
          effects: { setFlags: { askedWhisk: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'race-it',
          label: 'Race it to the doors.',
          kind: 'act',
          effects: { setFlags: { raced: true }, goToScene: 'ending-close-call' },
        },
      ],
    },
    {
      id: 'gate-together',
      when: flagged('whiskFriendly'),
      narration:
        'Dame Ferro is on the terrace with her keys in her lap. She sees you, and then she sees what is ' +
        'sitting beside you, and her hands go still.\n\nWhisk stops at the threshold. It will not go any ' +
        'further. "This is where I turn back," it says.',
      addCast: [
        { characterId: 'whisk', x: 0.5, y: 0.92, scale: 0.9, facing: 1 },
        { characterId: 'dame', x: 0.72, y: 0.87, scale: 0.9, facing: -1 },
      ],
      anchors: [
        {
          id: 'introduce',
          label: 'Introduce it. "Dame Ferro, this is Whisk. It walked me here."',
          kind: 'say',
          effects: { setFlags: { introduced: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'bolt-anyway',
          label: 'Ask Dame Ferro to shut the doors once you are both inside.',
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
      id: 'watched-from-pillar',
      narration:
        'Dame Ferro is on the terrace, counting candles, entirely unbothered. The slippers made it.' +
        '\n\nBut at the edge of the gallery, in the shadow of a pillar, Whisk is still there. Watching. It ' +
        'has followed you the whole way and it still has not come close enough to say why.',
      addCast: [
        { characterId: 'dame', x: 0.7, y: 0.87, scale: 0.9, facing: -1 },
        { characterId: 'whisk', x: 0.92, y: 0.7, scale: 0.55, facing: -1 },
      ],
      anchors: [
        {
          id: 'point-it-out',
          label: 'Point at the pillar. "Dame Ferro — it followed me."',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'go-back-and-invite',
          label: 'Walk back and invite it in out of the cold.',
          kind: 'act',
          effects: { setFlags: { invited: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'shut-the-door',
          label: 'Get inside quickly and shut the doors.',
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
  backdrop: 'ballroom',
  objective: '',
  cast: [
    { characterId: 'cinderella', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'dame', x: 0.62, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Clever Warning',
    blurb: 'You trusted your own eyes and spoke up before anyone else had to.',
  },
  variants: [
    {
      id: 'clever-blossoms',
      when: flagged('tookBlossoms'),
      narration:
        'Dame Ferro crosses the floor fast for someone in a long gown, takes one look, and puts herself ' +
        'between you and the ash-spirit — not scared, just decided.\n\nWhisk does not vanish. It sits down ' +
        'on the marble, which somehow makes it look smaller, and says, "I only wanted to know you got here ' +
        'safe." Dame Ferro looks at it for a long moment. Then she looks at the moonflowers in your hand.' +
        '\n\n"Sprout," she says, "you did exactly right to call out. And now that we have all stopped ' +
        'calling out — put those in water before they wilt."\n\nThe doors stay open. Whisk stays outside ' +
        'them. Both of those were choices, and they were yours.',
      anchors: [],
    },
    {
      id: 'clever-default',
      narration:
        'Your voice carries further than you meant it to. Dame Ferro is at the doors in three strides, her ' +
        'ring of keys still in her fist like a small silver weapon, and Whisk stops dead at the edge of the ' +
        'terrace.\n\nNobody moves. Then Dame Ferro says, to it, not to you: "You have been haunting my ' +
        'scullery hearth for a month and never taken so much as a crumb. What is it you actually want?"' +
        '\n\nWhisk has no answer. It leaves the way it came.\n\n"You did right, sprout," Dame Ferro says, ' +
        'closing the doors. "Being careful is not the same as being cruel. Ask me again tomorrow and I ' +
        'might have a better answer for it."',
      anchors: [],
    },
  ],
}

const endingFriend: Scene = {
  id: 'ending-friend',
  title: 'A Place on the Floor',
  backdrop: 'ballroom',
  objective: '',
  cast: [
    { characterId: 'cinderella', x: 0.3, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'whisk', x: 0.54, y: 0.86, scale: 0.9, facing: 1 },
    { characterId: 'dame', x: 0.76, y: 0.82, scale: 0.9, facing: -1 },
  ],
  ending: {
    title: 'A Place on the Floor',
    blurb: 'You asked the question everyone else was too frightened to ask.',
  },
  variants: [
    {
      id: 'friend-shared',
      when: flagged('whiskFriendly'),
      narration:
        'Dame Ferro sets down her keys. She looks at Whisk the way she looks at a candle flame that will ' +
        'not quite go out — carefully, and without fear.\n\n"You walked her here," she says. "All the ' +
        'way?"\n\n"The conservatory way is slow," Whisk says. "She would have been walking alone in the ' +
        'dark."\n\nThere is a very long pause. Then Dame Ferro steps back and leaves the terrace doors ' +
        'wide, which is not quite an invitation inside, because some things take more than one evening.' +
        '\n\n"Then you can watch from the doorway," she says. "Halls take a while, sprout. Doorways are ' +
        'faster."',
      anchors: [],
    },
    {
      id: 'friend-default',
      narration:
        'You ask it straight out: what did it actually come here for?\n\nWhisk is quiet for so long that ' +
        'you think it will not answer. Then: "The staff sweep me out with the ash. You asked a question." ' +
        'It looks at the ballroom, at the light spilling out. "I wanted to see what people do in there. ' +
        'That is all. That is the whole thing."\n\nDame Ferro, who has been listening from the doorway the ' +
        'entire time, says, "Well. That is the least frightening thing anyone has told me all month."\n\n' +
        'She leaves the doors wide. Whisk does not come inside. But it does not leave, either, and that is ' +
        'where the story stops for tonight.',
      anchors: [],
    },
  ],
}

const endingCloseCall: Scene = {
  id: 'ending-close-call',
  title: 'The Close Call',
  backdrop: 'ballroom',
  objective: '',
  cast: [
    { characterId: 'cinderella', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'dame', x: 0.64, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Close Call',
    blurb: 'You kept quiet, and the story decided some things without you.',
  },
  variants: [
    {
      id: 'close-call-default',
      narration:
        'You get the doors shut. Your heart is going like a bird in a box.\n\nAnd then you hear Dame ' +
        'Ferro, on the other side of it, out on the terrace, saying — perfectly calmly — "You again. Sit ' +
        'still before you knock over the candles."\n\nWhen you finally open the doors, she is holding her ' +
        'ring of keys and Whisk is already gone past the pillars.\n\n"It has been coming round for weeks," ' +
        'she says. "Never taken a thing. I keep waiting for it to ask me for something." She gives you a ' +
        'long look. "You went quiet, sprout. That is allowed. But quiet is a choice too, and tonight it ' +
        'chose for you."\n\nThe slippers still fit. You did get here. Next time you might say the thing ' +
        'out loud.',
      anchors: [],
    },
  ],
}

/* ---------------------------------------------------------------- tale --- */

export const CINDERELLA: Tale = {
  id: 'cinderella',
  title: 'Cinderella',
  tagline: 'A pair of glass slippers, a midnight corridor, and a spirit who only ever wanted to be asked.',
  backdrop: 'castle-scullery',
  startSceneId: 'castle-scullery',
  scenes: [scullery, corridor, terrace, endingClever, endingFriend, endingCloseCall],
  characters: [CINDERS, WHISK, DAME, VISITOR],
  roles: [
    { id: 'cinderella', title: 'Be Ellie', description: 'Wear the slippers and lead the story.' },
    { id: 'whisk', title: 'Be Whisk the ash-spirit', description: 'See the castle from Whisk’s point of view.' },
    { id: 'visitor', title: 'Be a visitor', description: 'Meet and talk to both Ellie and Whisk.' },
  ],
}
