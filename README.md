# AJAIA Docs

AJAIA Docs is a collaborative document editor built as a focused take-home product slice for Ajaia. The implementation prioritizes a clean reviewer flow: seeded login, document creation and import, rich-text editing, sharing, comments, version history, and document-grounded AI assistance.

Live review deployment: [https://ajaia-docs-chi-puce.vercel.app](https://ajaia-docs-chi-puce.vercel.app)

## Stack

- **Frontend**: Next.js 14 App Router, React, TypeScript
- **Styling**: Tailwind CSS
- **Editor**: TipTap
- **Database**: SQLite with `better-sqlite3`
- **Testing**: Vitest
- **Deployment**: Vercel

## Features

- Seeded profile-based authentication
- Document dashboard for owned and shared files
- Rich-text editing with autosave and manual save
- `.txt` and `.md` import support
- ACL-based sharing with owner, editor, and viewer roles
- Comments and version snapshots
- Live presence indicators and collaborative cursors
- AI Assist for summaries, rewrites, action items, and continuation
- In-app confirmation and toast UX instead of browser-native dialogs

## Reviewer Accounts

No password is required. Reviewers can sign in from the login screen using any seeded profile:

- **Gabriel Rivera** — `gabriel@ajaia.test` (owner)
- **Maria Santos** — `maria@ajaia.test` (editor)
- **Alex Cruz** — `alex@ajaia.test` (viewer)

## What Was Intentionally Scoped

- No CRDT or Google Docs-style simultaneous text merging
- No PDF export
- No full-text search
- No paid infrastructure dependencies

## Local Setup

### Requirements

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Optional AI environment variables:

- `OLLAMA_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

### Seed the local database

```bash
npm run seed
```

### Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run test
npm run build
```

The automated suite runs against isolated temporary SQLite databases and covers access control, validation, uploads, sharing, documents, versions, comments, and AI integration behavior.

## Deployment Notes

For Vercel deployment, the app uses an ephemeral SQLite database in `/tmp`. On cold start it automatically:

- creates the schema
- seeds the reviewer accounts
- serves the app without requiring a manual `seed` step

That keeps the live review environment testable without introducing paid infrastructure. For a production system, this would be replaced with a managed persistent database.

Current hosted review URL: [https://ajaia-docs-chi-puce.vercel.app](https://ajaia-docs-chi-puce.vercel.app)

## Included Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)
- [docs/WALKTHROUGH_SCRIPT.md](docs/WALKTHROUGH_SCRIPT.md)
- [SUBMISSION.md](SUBMISSION.md)
- [WALKTHROUGH_VIDEO_URL.txt](WALKTHROUGH_VIDEO_URL.txt)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
