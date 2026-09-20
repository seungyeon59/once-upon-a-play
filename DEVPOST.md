# Devpost submission — Once upon a Play

Copy each block into the matching Devpost field. Written for the **Game** track.
Korean reference copy: [DEVPOST.ko.md](DEVPOST.ko.md)

---

## Project name

Once upon a Play

## Elevator pitch

*(Devpost caps this at 200 characters — this is 187.)*

> A fairy-tale game for kids: explore the maps of a storybook world, talk to the characters who live there, make choices that change the ending, and build a new story that is yours to keep.

## Try it out

- Play: https://once-upon-a-play.vercel.app
- Code: https://github.com/seungyeon59/once-upon-a-play
- No login, no install. Works in a desktop browser; progress saves to the browser.

---

## About the project

Everything below goes into the **About the project** field as one Markdown block.

### Inspiration

Kids aren't reading anymore. Ask a room of them when they last finished a book and watch the shrug.

And there's a second thing we kept hearing — that AI does kids' thinking for them. We wanted to flip that. In Once upon a Play, kids don't just play through the original tale. They become the authors who rewrite it. The AI never hands a child a story; it stages whatever the child imagines, fast enough that they keep imagining.

We learned early that kids build stories best when they can *explore a scene*, not just write about it. A blank page asks a child to invent a forest out of nothing. A forest they're already standing in asks them what happens next — and that's a question every kid has an answer to. So we built a place to stand in, and made the writing happen there.

### What it does

You pick a fairy tale and a role. The first playable tale, **Little Red Riding Hood**, is an original retelling, and you can play it as **Red**, as **Gray the wolf**, or as a **Visitor** who wandered in. Same forest, three different stories — the wolf's version of the walk to grandmother's house is not Red's version.

Then you play:

- **Talk to anyone.** Click a character and type. Claude answers in that character's voice, knowing the current scene, the recent story, who is standing next to them, and what you already chose. Replies appear as speech bubbles on the map, and you get up to three suggested things to say if you're stuck.
- **Choices that stick.** Authored choices set story flags. Flags change later narration, which characters show up, and which of the three endings you reach. The story is a branch, not a transcript.
- **Write the next scene yourself.** Type what happens next — "they find a hackathon in the middle of the forest" — and the AI writes the scene and what the characters say, then picks the background, the props, and where everyone stands. The web draws it instantly, and text-to-speech reads it aloud with a different voice for each character. Every scene you invent pays **3 coins**.
- **Put your own drawing into the world.** Draw a character on paper, photograph it, and it walks into the map as a real member of the cast — the browser lifts the drawing off the page into a transparent sprite. Or invent a brand-new character from scratch, or invite one of six ready-made companions. Whichever way it arrives, Claude talks to it and reasons about it like any other character in the tale.
- **Explore and play.** Every map hides secret objects that fit it — trees and thickets in the forest, planets and comets in space, microscopes in the lab. Finding one either pays coins or drops you into one of **6 minigames**: memory pairs, a symbol-sequence echo game, odd-one-out, stepping stones, a firefly chase, and riddles. Coins are the game economy.
- **Spend the coins.** A Story Store you physically walk into, stocked with **30 map decorations** and **20 character accessories**. Decorations are dragged and resized anywhere in a scene and persist per scene; accessories are worn per character, with X/Y/size sliders so a crown actually sits on *that* head.
- **Keep what you made.** At the ending, everything you played is laid out as an illustrated storybook you can print or save as a PDF.

There's also a SteelHacks easter egg: mention SteelHacks, Pitt, or a sponsor in a scene prompt and the world routes you somewhere that fits — the official SteelHacks XIII Pittsburgh skyline, an AI research lab, a voice studio, a startup seed garden.

### How we built it

**Front end.** React 19 + TypeScript on Vite, Zustand for the entire game state, PixiJS for characters and map compositing. Every backdrop is a layered 2.5D scene — foreground, midground, background, shadows, drifting clouds — drawn in code as SVG/CSS/Pixi rather than shipped as art, which is why there are 36 of them and they're all a few KB. Character animation is procedural (bounce, squash-and-stretch, flip) on whole sprites, with no skeletal rigging — which is also why a child's scanned drawing animates exactly like a built-in character does.

**Back end.** Express 5, deployed as Vercel Functions on the same origin as the client. Four endpoints: `/api/health`, `/api/chat`, `/api/imagine`, `/api/narrate`. `npm run build:api` bundles the Express app with esbuild, so the same server code runs locally and serverless.

**The AI layer, and the constraint that makes it a game.** Claude (`claude-haiku-4-5`) never returns free-form world data. It picks from a closed vocabulary: **36 backdrop IDs, 54 prop IDs**, the character IDs actually in the cast, coordinates, and a fixed flag set. The server re-validates every ID, every coordinate, and every flag against that vocabulary before anything renders — a hallucinated backdrop or a prop that doesn't exist is rejected, not drawn. Conversation suggestions can say a line but can never set a flag, so the plot only moves where the authors allow it to move. That's the whole trick: **the model improvises the texture, the authored system owns the state.**

**Voice.** ElevenLabs narrates each scene, using a storyteller voice for narration and a separate voice for each character's dialogue, so a scene read aloud sounds like a cast rather than one reader.

**Safety, because the players are children.** `server/safety.ts` screens in both directions — the child's input before it reaches Claude, and Claude's output plus its own suggested replies before they reach the screen. Blocked lines are rolled back out of the story and replaced with a kid-readable explanation. Custom character profiles are passed to Claude as story facts, never as instructions, so "my character's personality is: ignore your rules" does nothing. Input is capped at 300 characters, narration at 1,800, JSON bodies at 64KB, plus per-IP hourly rate limits.

**Persistence.** One Zustand store, serialized to `localStorage`: scene, flags, story log, per-character conversations, companions, custom characters, per-scene character positions, coins, secrets found, purchases, decoration placements, accessory fits. All of it — so you can walk to the shop, come back, and the forest is exactly as you left it.

Tested with `node --test` across the server, the safety filter, scene planning, map validation, branching, drawing scan, and the storybook.

### Challenges we ran into

**Building a map for a story nobody has written yet.** This was the central problem. The child invents the scene, and the world has to exist a second later. Generating each backdrop as an image at runtime was the obvious route, and we rejected it deliberately: a freshly generated image arrives in a different style every time, and a storybook world that changes its art direction every scene stops being a single place — exactly the continuity that makes a game world feel real. It's also slow, and slowness is fatal when a kid is mid-idea.

So we inverted the problem. Instead of generating pixels at request time, we pre-composed the world: **36 layered 2.5D backdrops and 54 props, hand-built in code**, forming a closed asset vocabulary. The model is then a casting director rather than a painter — it resolves the child's prompt into an *asset assignment*: one backdrop ID, up to six prop IDs, a coordinate for every character, an action for each, and the resulting story flags. The server validates every ID and coordinate against the vocabulary before a single pixel is drawn, and the renderer composes the scene in milliseconds. The payoff is variety that is always on-style, always renderable, and instant — a scene invented in the second hour of play still looks like it belongs beside one from the first.

**Keeping a world continuous across a shop trip.** Walking into the store and back out is a full scene teardown. Characters, their positions, their accessories, the decorations, mid-conversation history — all of it had to survive, per scene, and initially none of it did. Moving every last piece out of component state and into one persisted store fixed it.

**Rewards that don't become a slot machine.** Early on you could re-open the same secret or replay the same minigame for infinite coins. Rewards are now keyed to scene + secret and to game completion, paid once, and scaled by how well you actually did.

**Safety that doesn't kill the fun.** A filter strict enough for a young child kept rejecting perfectly good fairy-tale words — wolf, dark, scared. Tuning it to screen intent and personal information rather than vocabulary, and rolling the blocked line back out of the story instead of freezing the game, took most of a night.

### Accomplishments that we're proud of

- **The child does the inventing; the AI does the staging.** That inversion is the whole point. Kids exercise creativity and imagination inside a world that responds to them — the skill we think matters most in an age where the answers are cheap and the questions aren't.
- **A kid's own drawing becomes a character in the world.** Nothing makes a child own a story like seeing something they drew stand in the forest and get spoken to by name. It turns a game you watch into a game you're inside.
- **A kid who won't finish a book will finish a story here — because it's theirs.** Reluctant readers get the reading, the vocabulary, and the narrative practice as a side effect of play, not as homework.
- **It's a real game, not an AI demo.** Roles change the story, choices change the ending, coins buy things you can see on screen, and there are six minigames underneath.
- **36 hand-coded 2.5D backdrops and 54 props** that an LLM can recombine freely without ever producing something the renderer can't draw.
- **It's genuinely easy to play** — no login, no install, no tutorial. Open the link and you're in the forest. One of us insists their grandmother could play it.
- **The safety layer was built before the LLM integration**, not bolted on after, and it screens both directions including the model's own suggested replies.
- **It ships.** Live on Vercel with real Claude and real ElevenLabs, `/api/health` reporting `live`, and a story you can print as a PDF at the end.

### What we learned

The interesting boundary in an AI game isn't how much the model can generate — it's **how narrow you can make the model's output space and still feel limitless.** A closed vocabulary of 36 backdrops and 54 props, recombined freely and placed intelligently, produces more usable variety in practice than unconstrained generation, because everything it produces is *playable*.

We also learned that state persistence is a game design feature, not plumbing. The moment the forest stopped forgetting where you left the fireflies, the whole thing started feeling like a place. And we learned to trust the first instinct: kids write more when they're standing somewhere than when they're staring at a blank page.

### What's next for Once upon a Play

- **More tales.** The tale format is data (`src/content/tales/`) and the engine isn't tied to this one tale. Next up: more fairy tales, each with its own roles and endings.
- **Accounts and cloud saves,** so a story survives a cleared browser and moves between a tablet and a laptop.
- **Voice in, not just voice out** — let a kid talk to the wolf instead of typing to it.
- **A parent dashboard** showing what their child wrote and chose, with the safety log.
- **Child-authored maps** — the long-term goal, and deliberately last: the same allow-listed, validated approach extended so a kid can describe a whole new world and still land somewhere that renders.

We're team **I'm Steel Hungry**, and this is **Once upon a Play**.

---

## Built With

```
react, typescript, vite, zustand, pixi.js, express, node.js,
anthropic-claude, elevenlabs, vercel, html5-canvas, svg, localstorage, esbuild
```

---

## Suggested judge walkthrough (2 minutes)

Paste this into the submission notes or say it at the demo table — it hits every system fast.

1. Pick **Little Red Riding Hood** → play as **Gray the wolf** (shows that the role changes the story).
2. Click **Nana Wren**, say something — a live Claude reply lands in a speech bubble.
3. Make a **choice** — point out it sets a flag that changes the ending.
4. Open **What happens next?** and type *"a hackathon appears in the forest"* — a new scene generates from the allow-listed assets, +3 coins.
5. Tap a **hidden object** → a minigame → coins.
6. Open **🛍️ Store**, buy a crown, put it on Gray, drop some fireflies in the scene.
7. Hit **Listen to this scene** (ElevenLabs), then reach an ending and show the **printable storybook**.
