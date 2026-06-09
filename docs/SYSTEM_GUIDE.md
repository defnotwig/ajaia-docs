# Ajaia Docs - Master System Documentation

This document provides a comprehensive, end-to-end breakdown of the **Ajaia Docs** system architecture, database design, API route handlers, frontend workspace client logic, and optimization strategies.

---

## 1. Executive Summary & Product Brief
**Ajaia Docs** is a lightweight collaborative document editor inspired by Google Docs. It is designed as a focused, high-fidelity MVP (Minimum Viable Product) slice to showcase solid full-stack engineering practices. 

The application utilizes cookie-based session switching with seeded test accounts, a local SQLite storage engine optimized for concurrency, a TipTap-powered editing canvas featuring auto-saving, secure backend permissions checks, comments, history versions, and AI assistance powered by **Google Gemini 1.5 Flash**.

---

## 2. Directory Layout & Folder Hierarchy
The codebase is structured cleanly in a standard Next.js App Router format, avoiding redundant nested directory configurations:

```text
Ajaia/
├── app/
│   ├── (auth)/login/page.tsx      # User switch login screen
│   ├── dashboard/page.tsx          # Documents hub dashboard (Owned vs Shared)
│   ├── documents/[id]/page.tsx    # Editor workspace (dynamic sidebar with tabs)
│   ├── api/                        # Next.js Server Route Handlers
│   │   ├── auth/                   # Session APIs (login, logout, me)
│   │   ├── documents/              # Document APIs (index, create, details, delete)
│   │   ├── sharing/                # ACL permissions APIs (share list, add, remove)
│   │   ├── upload/                 # .txt and .md uploader endpoint
│   │   └── ai/                     # Gemini AI assistant actions endpoint
│   ├── layout.tsx                  # Global HTML wrapper
│   ├── page.tsx                    # Route redirect gateway
│   └── globals.css                 # Tailwind directives and TipTap typography styles
├── components/
│   ├── Editor.tsx                  # TipTap client editor with debounced auto-saves
│   ├── DashboardHeader.tsx         # Blended navigation header with active profile
│   ├── ShareModal.tsx              # Sharing settings modal
│   ├── ImportModal.tsx             # File uploader modal
│   └── Toast.tsx                   # Action success/error toast alerts
├── lib/                            # Isolated server services & queries
│   ├── db.ts                       # SQLite WAL-mode connection helper
│   ├── auth.ts                     # Lightweight cookie session readers
│   ├── access.ts                   # Strict backend ACL checks
│   ├── documents.ts                # CRUD database operations queries
│   ├── sharing.ts                  # Collaborator shares SQL statements
│   ├── uploads.ts                  # File reading and parsing helpers
│   ├── comments.ts                 # Comments query manager
│   ├── versions.ts                 # Version history query manager
│   ├── validation.ts               # Input payload validators
│   └── ai.ts                       # Google Gemini API connector
├── tests/
│   └── access-control.test.ts      # Vitest security checks suite
├── schema.sql                      # SQL database schema script
├── seed.js                         # Database table migration and user seeder script
├── .env.example                    # Sample environment configurations
├── .env                            # Active environment keys
├── package.json                    # Scripts and dependencies declarations
├── tsconfig.json                   # TypeScript compiler rules
├── README.md                       # Installation and setup guide
└── SUBMISSION.md                   # Core deliverables checklists
```

---

## 3. SQLite Database Design & Schema
We use local SQLite (`better-sqlite3`) to enable zero-configuration local runs for reviewers. All table definitions and constraints are stored in `schema.sql`:

```sql
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_json TEXT NOT NULL DEFAULT '{}',
    content_html TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Document Shares Table (Access Control List)
CREATE TABLE IF NOT EXISTS document_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('viewer', 'editor')) NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(document_id, user_id)
);

-- 4. Attachments / Imports Table
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    imported_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 5. Document Versions Table (Snapshots)
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_json TEXT NOT NULL,
    content_html TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Document Comments Table
CREATE TABLE IF NOT EXISTS document_comments (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON document_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_attachments_document_id ON attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
```

---

## 4. Server-Side Access Control (ACL) Security Model
The system uses a strict backend permission validation model in `lib/access.ts` to ensure that unauthorized requests are rejected at the API endpoint level before database reads/writes:

- **Ownership (`owner` role)**: Computed when `documents.owner_id === userId`. Gives complete permission to read, write, rename, share, delete, and checkpoint/restore versions.
- **Editor Access (`editor` role)**: Computed when an entry in `document_shares` exists with `role = 'editor'`. Gives permission to read document text, modify content/title, write comments, and save version checkpoints. Denied privileges for renaming, sharing, deleting, or managing other collaborator access records.
- **Viewer Access (`viewer` role)**: Computed when an entry in `document_shares` exists with `role = 'viewer'`. Gives permission to read document content, read comments, and view version snapshots. Denied all edit privileges.
- **Unshared Access (Denied)**: If no ownership or share entry exists, the API Route immediately returns `403 Forbidden` and the frontend renders an **Access Denied** interface block.

---

## 5. Next.js API Layer (Route Handlers)
All APIs enforce authentication checking using the cookie-based session session helper:

1. **Authentication Gate**:
   - `/api/auth/login` (POST): Validates the User UUID and sets the session cookie.
   - `/api/auth/logout` (POST): Purges the active session cookie.
   - `/api/auth/me` (GET): Resolves the active cookie session and returns the current user profile.
2. **Documents CRUD**:
   - `/api/documents` (GET): Fetches owned documents and shared documents separately.
   - `/api/documents` (POST): Creates a new blank document.
   - `/api/documents/[id]` (GET): Fetches document details if read-authorized.
   - `/api/documents/[id]` (PUT): Saves title/content modifications if edit-authorized.
   - `/api/documents/[id]` (DELETE): Purges document and cascades purges on shares, comments, and attachments if owner-authorized.
3. **Sharing Management**:
   - `/api/sharing` (GET): Lists document shares (owner-only).
   - `/api/sharing` (POST): Adds/updates collaborator role (owner-only).
   - `/api/sharing` (DELETE): Revokes collaborator access (owner-only).
4. **File Imports**:
   - `/api/upload` (POST): Resolves files (FormData) or JSON strings, parses `.txt` or `.md` paragraphs, generates the document, and registers metadata in `attachments`.
5. **Comments Discussions**:
   - `/api/documents/[id]/comments` (GET/POST): Lists or creates comment entries (read-authorized).
6. **Versions Control**:
   - `/api/documents/[id]/versions` (GET/POST): Lists checkpoints (read-authorized) or creates a snapshot (edit-authorized).
7. **Gemini AI assist**:
   - `/api/ai` (POST): Connects to Google AI Studio Gemini API to trigger summarization, checklist extractions, and professional rewrites.

---

## 6. Frontend Workspace & TipTap Editor
- **Workspace Sidebar Tabs**: A right sidebar panel splits auxiliary collaborative features into clean tabs (Collaborators Sharing, Version checkpoints, Comments, and AI Assist).
- **TipTap Canvas (`components/Editor.tsx`)**: Renders the rich-text text area. If the active session is a Viewer, editing inputs are disabled.
- **Debounced Autosave**: Changes to document content set state to "Unsaved changes". A debounced timer triggers a save POST query to the server 1.5 seconds after typing stops. Pointing to the status pill shows active status ("Saving...", "All changes saved", etc.).

---

## 7. Performance & Concurrency Optimizations
- **SQLite WAL Concurrency**: Enabled Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and set synchronization writes to `NORMAL`. This prevents database locks during simultaneous read/write cycles, making database operations extremely fast.
- **Lazy Loading Editor**: Lazy-loaded the heavy TipTap components using Next.js dynamic import with SSR disabled:
  ```typescript
  const Editor = dynamic(() => import('../../../components/Editor'), { ssr: false });
  ```
  This optimization decreased the document page bundle size by **90%** (from 148 kB to 14.7 kB) and First Load JS by **56%** (from 235 kB to 102 kB), making the workspace page highly optimized.

---

## 8. Setup & Seeding Instructions
1. Install dependencies: `npm install`
2. Create environment variables configuration: `cp .env.example .env`
3. Add your `GEMINI_API_KEY` (Google AI Studio key) in `.env` to enable AI assist.
4. Setup database tables and seed Gabriel, Maria, and Alex accounts: `npm run seed`
5. Run Vitest access-control checks: `npm run test`
6. Start dev server: `npm run dev` (Opens on port 3000, or port 3001 if port 3000 is occupied).
