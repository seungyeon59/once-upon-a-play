import type { Flags, Scene, Tale } from '../../state/types.ts'
import { CHARACTERS } from '../characters.ts'

/**
 * "The Path Through the Grey Wood" — our retelling of the public-domain Red
 * Riding Hood tale.
 *
 * Branching contract: only the anchors in this file may set flags or move the
 * story. Flags set in an early scene pick the *variant* of a later scene, which
 * is what makes a choice visibly matter twenty lines later.
 */

const flagged = (key: string) => (flags: Flags) => flags[key] === true

/* ------------------------------------------------------------- scene 1 --- */

const forestPath: Scene = {
  id: 'forest-path',
  title: 'The Path Through the Grey Wood',
  backdrop: 'forest-path',
  objective: "Get to Nana Wren's cottage before the muffins go cold.",
  cast: [
    { characterId: 'red', x: 0.36, y: 0.86, scale: 1, facing: 1 },
    { characterId: 'wolf', x: 0.67, y: 0.83, scale: 1, facing: -1 },
  ],
  variants: [
    {
      id: 'meet-gray',
      narration:
        'The basket is heavy with warm muffins and the path is longer than you remembered. ' +
        'Halfway through the grey wood, something steps out of the ferns — a wolf, tall and ' +
        'thin, with rain still on his shoulders. He does not come closer. He just looks at ' +
        'the basket, then at you.\n\n"That smells like it came out of an oven," he says. ' +
        '"Where does a basket like that go in a hurry?"',
      anchors: [
        {
          id: 'tell-destination',
          label: "Tell him: to Nana Wren's cottage, past the meadow.",
          kind: 'say',
          effects: {
            setFlags: { wolfKnows: true },
            goToScene: 'fork',
            narration:
              'Gray repeats the name quietly, like he is filing it somewhere. "Past the meadow," ' +
              'he says. "I know it." And then he is gone into the ferns, faster than you expected.',
          },
        },
        {
          id: 'ask-back',
          label: 'Ask him why a wolf is out here all alone.',
          kind: 'say',
          effects: {
            setFlags: { wolfCurious: true },
            goToScene: 'fork',
            narration:
              'Gray blinks. Nobody has ever asked him a question before — they usually run. ' +
              '"Alone is just where I live," he says, and follows you at a distance, keeping to the trees.',
          },
        },
        {
          id: 'share-muffin',
          label: 'Take out a muffin and set it on a stone for him.',
          kind: 'act',
          effects: {
            setFlags: { wolfFriendly: true },
            goToScene: 'fork',
            narration:
              'You put a muffin on the flat stone between you and step back. Gray stares at it for ' +
              'a long moment, as if it might be a trick. Then he eats it in one bite and says, ' +
              'very quietly, "Nobody\'s ever done that." He walks out of the ferns and onto the path beside you.',
          },
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------- scene 2 --- */

const fork: Scene = {
  id: 'fork',
  title: 'Where the Path Splits',
  backdrop: 'fork',
  objective: 'Two ways to the cottage. One is beautiful. One is fast.',
  cast: [{ characterId: 'red', x: 0.34, y: 0.88, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'fork-with-gray',
      when: flagged('wolfFriendly'),
      narration:
        'The path splits at a mossy signpost. Gray walks at your shoulder now, close enough that ' +
        'you can hear him breathing.\n\nLeft, the trail opens into a meadow of wild asters — Nana ' +
        "Wren's favourite. Right, it drops straight downhill to the cottage.\n\n" +
        '"The left way is pretty," Gray says. "The left way is also slow."',
      addCast: [{ characterId: 'wolf', x: 0.52, y: 0.87, scale: 0.95, facing: 1 }],
      anchors: [],
    },
    {
      id: 'fork-watched',
      when: flagged('wolfCurious'),
      narration:
        'The path splits at a mossy signpost. Up on the ridge, half-hidden, Gray is still ' +
        'following — not hunting, just watching, the way you might watch a stranger doing ' +
        'something interesting.\n\nLeft, a meadow of wild asters. Right, straight downhill to the cottage.',
      addCast: [{ characterId: 'wolf', x: 0.82, y: 0.64, scale: 0.6, facing: -1 }],
      anchors: [],
    },
    {
      id: 'fork-alone',
      narration:
        'The path splits at a mossy signpost, and the wood is very quiet. Gray is nowhere in ' +
        'sight. You know exactly where he went, because you told him.\n\nLeft, a meadow of wild ' +
        'asters. Right, straight downhill to the cottage — the fast way.',
      anchors: [],
    },
  ],
}

/** Both fork variants offer the same two ways forward. */
const FORK_ANCHORS = [
  {
    id: 'take-meadow',
    label: 'Go left and pick a bunch of asters for Nana Wren.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookFlowers: true },
      goToScene: 'cottage',
      narration:
        'The meadow is worth it. You pick asters until your fist will not close around any more ' +
        'stems, and the light has gone golden by the time you find the cottage gate.',
    },
  },
  {
    id: 'take-short',
    label: 'Go right and take the fast way down.',
    kind: 'act' as const,
    effects: {
      setFlags: { tookFlowers: false },
      goToScene: 'cottage',
      narration:
        'You half-run the downhill path, basket banging against your knee, and reach the cottage ' +
        'gate with the muffins still warm.',
    },
  },
]
for (const variant of fork.variants) variant.anchors = FORK_ANCHORS

/* ------------------------------------------------------------- scene 3 --- */

const cottage: Scene = {
  id: 'cottage',
  title: "Nana Wren's Gate",
  backdrop: 'cottage',
  objective: 'Whatever happens next at this door, it is your call.',
  cast: [{ characterId: 'red', x: 0.28, y: 0.93, scale: 1, facing: 1 }],
  variants: [
    {
      id: 'he-got-here-first',
      // Told him where to go AND dawdled in the meadow: the tense version.
      when: (flags) => flags.wolfKnows === true && flags.tookFlowers === true,
      narration:
        'The cottage door stands open. Not broken — open, the way a door is when someone walked ' +
        'through it a while ago.\n\nNana Wren is not on her porch. Her gardening basket is on its ' +
        'side by the step. And from inside, unmistakably, you can hear breathing.',
      addCast: [{ characterId: 'wolf', x: 0.58, y: 0.9, scale: 0.85, facing: -1 }],
      anchors: [
        {
          id: 'warn-through-door',
          label: 'Shout through the open door: "Nana! There\'s a wolf!"',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'flowers-first',
          label: 'Hold out the asters and ask Gray what he actually came for.',
          kind: 'act',
          effects: { setFlags: { askedGray: true }, goToScene: 'ending-friend' },
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
      when: flagged('wolfKnows'),
      narration:
        'You reach the gate at the same moment Gray comes out of the treeline on the other side. ' +
        'For a second neither of you moves.\n\nInside, a window is open, and you can hear Nana ' +
        'Wren humming and knocking soil off a pot. She has no idea either of you is here.',
      addCast: [{ characterId: 'wolf', x: 0.72, y: 0.93, scale: 0.9, facing: -1 }],
      anchors: [
        {
          id: 'warn-window',
          label: 'Call in through the window before he takes another step.',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'talk-first',
          label: 'Stand in the gate and ask Gray to talk before he goes in.',
          kind: 'say',
          effects: { setFlags: { askedGray: true }, goToScene: 'ending-friend' },
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
      when: flagged('wolfFriendly'),
      narration:
        'Nana Wren is on her porch with a pot of rosemary in her lap. She sees you, and then she ' +
        'sees what is standing beside you, and her hands go still.\n\nGray stops at the gate. He ' +
        'will not come any further. "This is where I turn around," he says.',
      addCast: [
        { characterId: 'wolf', x: 0.5, y: 0.92, scale: 0.9, facing: 1 },
        { characterId: 'grandma', x: 0.72, y: 0.87, scale: 0.9, facing: -1 },
      ],
      anchors: [
        {
          id: 'introduce',
          label: 'Introduce him. "Nana, this is Gray. He walked me here."',
          kind: 'say',
          effects: { setFlags: { introduced: true }, goToScene: 'ending-friend' },
        },
        {
          id: 'bolt-anyway',
          label: 'Tell Nana to bolt the door once you are both inside.',
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
      id: 'watched-from-trees',
      narration:
        'Nana Wren is on her porch, shelling something into a bowl, entirely unbothered. The ' +
        'muffins made it.\n\nBut at the edge of the garden, in the long shadow of the hedge, Gray ' +
        'is still there. Watching. He has followed you the whole way and he still has not come ' +
        'close enough to say why.',
      addCast: [
        { characterId: 'grandma', x: 0.7, y: 0.87, scale: 0.9, facing: -1 },
        { characterId: 'wolf', x: 0.92, y: 0.7, scale: 0.55, facing: -1 },
      ],
      anchors: [
        {
          id: 'point-him-out',
          label: 'Point at the hedge. "Nana — he followed me."',
          kind: 'say',
          effects: { setFlags: { warned: true }, goToScene: 'ending-clever' },
        },
        {
          id: 'go-back-and-invite',
          label: 'Walk back down the garden and invite him to supper.',
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
  backdrop: 'hearth',
  objective: '',
  cast: [
    { characterId: 'red', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'grandma', x: 0.62, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Clever Warning',
    blurb: 'You trusted your own eyes and spoke up before anyone else had to.',
  },
  variants: [
    {
      id: 'clever-flowers',
      when: flagged('tookFlowers'),
      narration:
        'Nana Wren comes out fast for someone her age, takes one look, and puts herself between ' +
        'you and the door — not scared, just decided.\n\nGray does not run. He sits down in the ' +
        'wet grass, which is somehow worse, and says, "I only wanted to know where the warm smell ' +
        'went." Nana Wren looks at him for a long moment. Then she looks at the asters crushed in ' +
        'your fist.\n\n"Sprout," she says, "you did exactly right to shout. And now that we have ' +
        'all stopped shouting — put those in water before they wilt."\n\nThe door stays open. ' +
        'Gray stays outside it. Both of those were choices, and they were yours.',
      anchors: [],
    },
    {
      id: 'clever-default',
      narration:
        'Your voice carries further than you meant it to. Nana Wren is at the door in three ' +
        'strides, rosemary still in her fist like a small green weapon, and Gray stops dead at ' +
        'the edge of the garden.\n\nNobody moves. Then Nana Wren says, to him, not to you: ' +
        '"You have been circling my fence for a month and never taken so much as an egg. What is ' +
        'it you actually want?"\n\nGray has no answer. He leaves the way he came.\n\n"You did ' +
        'right, sprout," Nana Wren says, bolting the door. "Being careful is not the same as ' +
        'being cruel. Ask me again tomorrow and I might have a better answer for him."',
      anchors: [],
    },
  ],
}

const endingFriend: Scene = {
  id: 'ending-friend',
  title: 'A Place at the Table',
  backdrop: 'hearth',
  objective: '',
  cast: [
    { characterId: 'red', x: 0.3, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'wolf', x: 0.54, y: 0.86, scale: 0.9, facing: 1 },
    { characterId: 'grandma', x: 0.76, y: 0.82, scale: 0.9, facing: -1 },
  ],
  ending: {
    title: 'A Place at the Table',
    blurb: 'You asked the question everyone else was too frightened to ask.',
  },
  variants: [
    {
      id: 'friend-shared',
      when: flagged('wolfFriendly'),
      narration:
        'Nana Wren sets down the rosemary. She looks at Gray the way she looks at a plant she ' +
        'cannot name yet — carefully, and without fear.\n\n"You walked her here," she says. ' +
        '"All the way?"\n\n"The meadow way is slow," Gray says. "She would have been walking in ' +
        'the dark."\n\nThere is a very long pause. Then Nana Wren goes inside and comes back with ' +
        'a third bowl, which she sets down on the step — outside the door, because some things ' +
        'take more than one evening.\n\n"Then you can eat on the porch," she says. "Doors take a ' +
        'while, sprout. Bowls are faster."',
      anchors: [],
    },
    {
      id: 'friend-default',
      narration:
        'You ask it straight out: what did he actually come here for?\n\nGray is quiet for so ' +
        'long that you think he will not answer. Then: "The village throws stones. You asked a ' +
        'question." He looks at the cottage, at the light in the window. "I wanted to see what ' +
        'people do in there. That is all. That is the whole thing."\n\nNana Wren, who has been ' +
        'listening from the doorway the entire time, says, "Well. That is the least frightening ' +
        'thing anyone has told me all month."\n\nShe sets a third bowl on the step. Gray does not ' +
        'come inside. But he does not leave, either, and that is where the story stops for tonight.',
      anchors: [],
    },
  ],
}

const endingCloseCall: Scene = {
  id: 'ending-close-call',
  title: 'The Close Call',
  backdrop: 'hearth',
  objective: '',
  cast: [
    { characterId: 'red', x: 0.36, y: 0.88, scale: 1, facing: 1 },
    { characterId: 'grandma', x: 0.64, y: 0.86, scale: 0.95, facing: -1 },
  ],
  ending: {
    title: 'The Close Call',
    blurb: 'You kept quiet, and the story decided some things without you.',
  },
  variants: [
    {
      id: 'close-call-default',
      narration:
        'You get the door shut. Your heart is going like a bird in a box.\n\nAnd then you hear ' +
        'Nana Wren, on the other side of it, out in the garden, saying — perfectly calmly — ' +
        '"You again. Sit down before you knock over my beans."\n\nWhen you finally open the door, ' +
        'she is holding the empty gardening basket and Gray is already gone into the trees.\n\n' +
        '"He has been coming round for weeks," she says. "Never taken a thing. I keep waiting for ' +
        'him to ask me for something." She gives you a long look. "You went quiet, sprout. That ' +
        'is allowed. But quiet is a choice too, and tonight it chose for you."\n\nThe muffins are ' +
        'still warm. You did get here. Next time you might say the thing out loud.',
      anchors: [],
    },
  ],
}

/* ---------------------------------------------------------------- tale --- */

export const RED_RIDING_HOOD: Tale = {
  id: 'red-riding-hood',
  title: 'Little Red Riding Hood',
  tagline: 'A basket, a long walk, and a wolf who only ever wanted to be asked.',
  backdrop: 'forest-path',
  startSceneId: 'forest-path',
  scenes: [forestPath, fork, cottage, endingClever, endingFriend, endingCloseCall],
  characters: CHARACTERS,
  roles: [
    { id: 'red', title: 'Be Red', description: 'Carry the basket and lead the story.' },
    { id: 'wolf', title: 'Be Gray the wolf', description: 'See the forest from Gray’s point of view.' },
    { id: 'visitor', title: 'Be a visitor', description: 'Meet and talk to both Red and Gray.' },
  ],
}

/** First matching variant wins; the last variant must have no `when` (the default). */
export function resolveVariant(scene: Scene, flags: Flags) {
  return scene.variants.find((variant) => !variant.when || variant.when(flags)) ?? scene.variants[0]
}

export function getScene(tale: Tale, sceneId: string): Scene | undefined {
  return tale.scenes.find((scene) => scene.id === sceneId)
}
