# Automake Studio

Local web app that turns facts, images and music into YouTube Shorts (1080x1920, 30 fps) using Remotion.

## Studios
- **Fact Studio**: Shorts Fact (3 scenes, 24 s) and Custom Facts (1-12 scenes, up to 90 s).
- **Edit Studio**: image edits synced to music (beat/BPM detection, tempo sections, drop suggestions, song player, up to 30 images).
- Custom templates: paste TSX written with the master prompts shown in the UI.
- Projects autosave to disk and can be resumed from the Projects menu.

## Requirements
- Node.js 20 or newer
- A modern browser (Chrome or Edge)

## Run
Open two terminals in the project folder.

```console
npm install
npm run server
```

```console
npm run ui
```

Then open http://localhost:5173 (UI). The render server runs on port 4000.

If the server was already running after an update, restart it. The app shows a "Server needs restart" banner when it is running old code.

## Folders
These are created automatically and are git-ignored (generated or uploaded at runtime):
`renders/`, `projects/`, `clips/`, `public/assets/edit/`, `public/assets/facts/`.

`public/assets/audio/<Category>.mp3` are the built-in music tracks for the fact templates.

## Remotion Studio
`npm run dev` opens Remotion Studio to preview compositions directly.

## License note
Remotion needs a company license for some entities. Read the terms here: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md
