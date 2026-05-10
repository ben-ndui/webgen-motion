# create-webgen-motion

Scaffold a fresh [`webgen-motion`](https://github.com/ben-ndui/webgen-motion) project — a local-first motion video generator by [Smooth & Design](https://www.smoothandesign.fr/).

## Usage

```bash
npx create-webgen-motion@latest my-promo
cd my-promo
npm run dev
```

Then open <http://localhost:3000>, run the **Setup** wizard to add your ElevenLabs credentials, and click **Nouveau tour** to start.

## What you get

- A fresh clone of the `webgen-motion` repo with no upstream `.git` history
- A neutral starter tour (`tours/demo-target.json`)
- All dependencies installed (`npm install` already ran)
- Local storage at `~/.webgen-motion/` for captures, audio library, and TTS cache

## Requirements

- Node.js ≥ 18
- `git` available in `PATH`
- `ffmpeg` available in `PATH` (`brew install ffmpeg` on macOS)
- An [ElevenLabs](https://elevenlabs.io/) API key + voice ID if you want voice-over

## Docs

Full docs (architecture, runners, tour schema, AI-agent install guide) are in the [main repo README](https://github.com/ben-ndui/webgen-motion#readme) and [`CLAUDE.md`](https://github.com/ben-ndui/webgen-motion/blob/main/CLAUDE.md).

## License

MIT
