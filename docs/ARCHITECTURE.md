# ARCHITECTURE.md - Ajaia Docs System Architecture

## 1. Product Goal
The goal of Ajaia Docs is to deliver a highly polished, robust, and reviewable product slice of a collaborative document editor inspired by Google Docs. The system is designed to be self-contained and easily evaluable in local environments by reviewers.

## 2. Scope Decisions
- **Core Focus**: Seeded login authentication, full-featured rich-text editing (TipTap), autosaving and manual saving, document sharing with access control levels (owner/editor/viewer), and importing `.txt` and `.md` files.
- **Enabled Stretch Features**: Document version history snapshots (with public/private scoping), commenting sidebar panel, and an optional AI Assist panel.
- **Real-Time Collaboration**: Real-time cursor coordinates and selection ranges are synced using an efficient poll-and-heartbeat model over standard HTTP. Sockets/Yjs were deprioritized to guarantee zero-cost hosting and ease of local evaluation.

## 3. System Architecture
Ajaia Docs is built using:
- **Frontend**: Next.js App Router (React) using TypeScript and Tailwind CSS.
- **Rich Text Editor**: TipTap (StarterKit + Underline Extension + RemoteCursors).
- **Backend API**: Next.js Route Handlers.
- **Database**: SQLite via the native `better-sqlite3` driver. Locally the database file lives at the repo root; on Vercel it is bootstrapped in `/tmp` for reviewer-friendly hosted testing.
- **Authentication**: A lightweight cookie-based session manager (`ajaia_user_session`) which stores the seeded User UUID.
- **AI Provider**: Ollama Cloud via an OpenAI-compatible chat completions endpoint, with OpenRouter as fallback.

## 4. Data Model (SQLite)

### `users`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `name` (TEXT): Display name.
- `email` (TEXT, UNIQUE): Unique email address.
- `created_at` (TEXT): ISO timestamp.

### `documents`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `title` (TEXT): Document title.
- `content_json` (TEXT): Rich text serialized as JSON for editor state.
- `content_html` (TEXT): Pre-rendered HTML representation for read-only view.
- `owner_id` (TEXT, FOREIGN KEY -> users.id): Creator and owner.
- `created_at` (TEXT): ISO timestamp.
- `updated_at` (TEXT): ISO timestamp.

### `document_shares`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `document_id` (TEXT, FOREIGN KEY -> documents.id): Purges on document deletion.
- `user_id` (TEXT, FOREIGN KEY -> users.id): Purges on user deletion.
- `role` (TEXT): Permission role ('viewer' | 'editor').
- `created_at` (TEXT): ISO timestamp.
- *Constraint*: UNIQUE(document_id, user_id).

### `attachments`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `document_id` (TEXT, FOREIGN KEY -> documents.id): Purges on document deletion.
- `filename` (TEXT): Original filename.
- `mime_type` (TEXT): MIME type.
- `size_bytes` (INTEGER): File size.
- `imported_text` (TEXT): Stored plain text representation.
- `created_at` (TEXT): ISO timestamp.

### `document_versions`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `document_id` (TEXT, FOREIGN KEY -> documents.id): Purges on document deletion.
- `title` (TEXT): Document title at checkpoint.
- `content_json` (TEXT): Editor JSON content state.
- `content_html` (TEXT): Editor HTML state.
- `created_by` (TEXT, FOREIGN KEY -> users.id): User who created snapshot.
- `scope` (TEXT): Snapshot visibility check ('personal' | 'everyone').
- `created_at` (TEXT): ISO timestamp.

### `document_comments`
- `id` (TEXT, PRIMARY KEY, UUID): Unique ID.
- `document_id` (TEXT, FOREIGN KEY -> documents.id): Purges on document deletion.
- `user_id` (TEXT, FOREIGN KEY -> users.id): User who commented.
- `body` (TEXT): Text content of comment.
- `created_at` (TEXT): ISO timestamp.

### `document_presence`
- `document_id` (TEXT, PRIMARY KEY): Foreign key to documents.
- `user_id` (TEXT, PRIMARY KEY): Foreign key to users.
- `cursor_anchor` (INTEGER): ProseMirror selection anchor coordinate.
- `cursor_head` (INTEGER): ProseMirror selection head coordinate.
- `updated_at` (TEXT): ISO timestamp.

## 5. Access Control Model
- **Ownership (Owner)**: Granted to the document creator. Has full permission (Read, Write, Rename, Share, Delete, Snapshot, Restore).
- **Editor Access**: Shared users with the `editor` role. Permitted to read content, edit document text/title, make snapshots, and add comments. Denied access to rename, share, delete, or modify other user shares.
- **Viewer Access**: Shared users with the `viewer` role. Permitted to read document content, read/add comments, and view version snapshots. Denied all edit privileges (the editor input is read-only).
- **Strict Server-Side Verification**: Permissions are computed on every single request in `/lib/access.ts` by querying the SQLite database. Client-side state is only used for UI rendering overrides.

## 6. File Import Design
- **Supported extensions**: `.txt` and `.md`.
- **Flow**: User drags or uploads a file. The content is processed as plain text on the server. Carriage returns are split and wrapped into standard `<p>` paragraph HTML tags and a serialized JSON format compatible with TipTap's JSON schema.
- **Metadata**: An attachment record is generated linking the original filename, mime type, and bytes size to the newly created document.

## 7. Rich-Text Persistence & Live Sync
- **TipTap Formats**: On save, the editor sends both `content_json` (the full abstract syntax tree of formatting, headings, and lists) and `content_html` (the raw pre-rendered HTML) to `/api/documents/[id]`.
- **Auto-save**: Every keystroke sets state to "Unsaved". An auto-save timeout debounces saves to the server after 1.5 seconds of inactivity.
- **Manual Save**: A save icon in the toolbar permits forcing an immediate save.
- **Live Sync Polling**:
  - The client heartbeats presence every 1.2 seconds, sharing selection coordinate ranges.
  - The client polls document content. If a remote update is detected, it is applied dynamically while preserving the current client's caret position and cursor selection block.
  - Sidebar comments, versions, and collaborators poll (every 2.0s to 5.0s) to keep lists fresh without manual reloads.

## 8. Testing Strategy
- **Real-function tests, isolated database**: Vitest suites under `/tests/unit/` import the actual `lib/*` functions. A setup file sets `AJAIA_DB_PATH` to a unique temp file before the test module imports `lib/db.ts`, applies the production `schema.sql`, and seeds canonical users.
- **Coverage** (66 tests):
  - `access-control.test.ts` — owner/editor/viewer/unshared matrix, role resolution, revocation.
  - `validation.test.ts` — title, email, share role, comment, upload, AI action/text rules.
  - `uploads.test.ts` — extension/empty/size checks, filename sanitization, clean title derivation, and the real import pipeline.
  - `sharing.test.ts` — viewer/editor shares, duplicate-role upsert, self-share rejection, revocation.
  - `documents.test.ts` — CRUD, partial-update preservation, `updated_at` advancement, cascade deletes.
  - `versions.test.ts` — snapshot contents, scoping checks (public vs personal), newest-first ordering, edit-gated creation.
  - `comments.test.ts` — author join, trimming, conversation ordering, read-access rule.
  - `ai.test.ts` — `AI_DISABLED` without a key (no network call), action/text validation, continueWriting, and OpenRouter config fallbacks.

## 8b. Performance Optimizations
- **SQLite pragmas** (`lib/db.ts`): WAL journal mode (readers don't block writers), `synchronous = NORMAL` (faster writes), `busy_timeout = 5000` (queue instead of erroring under contention), and `foreign_keys = ON`.
- **Hosted bootstrap** (`lib/db.ts`): schema application and seeded reviewer-account creation happen automatically at startup so Vercel deployments remain testable without a manual seed step.
- **Composite indexes** (`schema.sql`): `(user_id, document_id)` on shares matches the access-control hot path; `(owner_id, updated_at DESC)` matches the dashboard listing; `(document_id, created_at DESC)` on versions and comments matches the ordered panel queries.
- **Lazy-loaded editor**: TipTap is imported via `next/dynamic` with `ssr: false` and a loading skeleton, keeping it out of the initial dashboard bundle.
- **Debounced autosave**: see §7.

## 8c. Autosave & Polling Robustness
- **Stale-response guard**: each save increments a sequence counter; a slower, earlier response is discarded if a newer save has since started.
- **Flush on blur**: leaving the editor flushes pending changes immediately.
- **Unsaved-changes warning**: a `beforeunload` handler warns before navigating away while changes are unsaved or in flight.

## 9. Tradeoffs & Deprioritized Items
- **Local DB Choice**: SQLite was chosen over Supabase/Docker PostgreSQL for local ease of review. There are zero external dependencies or docker setups.
- **Auth Simulation**: Standard cookie auth is used instead of NextAuth/JWT. This keeps credentials simple and reviewer evaluation immediate.
- **Validation library**: Input validation uses small, dependency-free pure functions in `lib/validation.ts` rather than a schema library (e.g. Zod). They cover every documented rule, are Greatly unit-testable in isolation, and avoid adding a runtime dependency.

## 10. Future Improvements (Next 2-4 Hours)
- **Playwright E2E Integration**: Add visual E2E flow tests in playwright to check user-switching and collaborative edits.
- **Document-level Search**: Search document titles and plain-text contents from the dashboard.
- **PDF Export**: Generate PDF downloads using standard client-side libraries.
