# Taleprints

**Step into a fairy tale and leave your own story behind.**

Taleprints is an interactive story game for children aged 9–12. Pick a role,
explore an illustrated map, talk to its characters, and make choices that shape
the ending. A drawing can become a new character in the story. When the tale is
finished, the child can read and save an illustrated storybook as a PDF.

## Try the story

The first playable tale is **The Path Through the Grey Wood**, an original
retelling inspired by Little Red Riding Hood. Play as Red, Gray the wolf, or a
visitor. Talk to the cast, choose a path, and reach one of three endings.

Features:

- Character dialogue with optional AI replies and scripted demo replies.
- Story choices that change later scenes and the ending.
- Ready-made companions or a character created from a photographed drawing.
- Draggable characters and a layered 2.5D map that pans when you drag the background.
- An illustrated storybook that can be printed or saved as a PDF.
- Progress saved in the current browser so a child can resume later.

The artwork is original placeholder art drawn in code. The drawing scanner
removes light paper in the browser; it does not use an image generation model.

## Run locally

Requires Node.js 24 and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite serves the client on port 5173 and proxies
`/api` to the Express server on port 8787. No API key is needed for the scripted
demo. For AI dialogue, copy `.env.example` to `.env` and set
`ANTHROPIC_API_KEY`. The key stays on the server and is excluded from Git.

To test the production setup locally:

```bash
npm run build
npm start
```

The built client and API are then served from `http://localhost:8787`.

## Deploy and share

The client and API need to run together. A static file upload alone cannot
provide the character conversations. `render.yaml` defines a single Render
web service that builds the client and serves both parts from one HTTPS URL.

1. Push this project to a GitHub repository. `.gitignore` excludes the API key,
   dependencies, build output, logs, and project reference PDFs.
2. In Render, select **New → Blueprint**, connect the repository, and deploy
   using `render.yaml`.
3. Share the resulting `https://…onrender.com` URL after the health check passes.

The deployed demo uses scripted replies unless `ANTHROPIC_API_KEY` is added as
a **secret environment variable in Render**. Do not add the key to the repository.
With an API key, the public server limits requests to 30 per IP per hour as a
basic cost guard. A wider release needs stronger account-based limits.

Production chat logs are disabled by default. Story progress and scanned
drawings are stored in each visitor's browser, not a shared account. Free
Render services may take longer to respond after a period of inactivity.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/content/` | Tale scenes, branches, character profiles, and dialogue rules |
| `src/pixi/` | Illustrated maps, sprite animation, parallax, and drawing scan |
| `src/state/` | Story progress, choices, characters, and local saves |
| `src/ui/` | Map selection, conversations, scanner, ending, and storybook |
| `server/` | Express API, AI integration, scripted replies, and safety filters |
| `render.yaml` | One-service deployment configuration |

Authored choices move the story between scenes and set flags. AI-generated
conversation suggestions can only say a line; they cannot change the plot.
Incoming and outgoing dialogue passes through the safety filters in
`server/safety.ts`.

## Check the build

```bash
npm test
npm run build
```

This is a playable prototype. It currently includes one tale and code-drawn
art. Full 3D worlds, text-to-speech, shared accounts, and a parent dashboard
are not part of this build.
