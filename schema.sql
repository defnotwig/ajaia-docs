-- schema.sql
-- SQLite Database Schema for Ajaia Docs

-- Enable foreign key support in SQLite (needs to be run per connection, but defined here for documentation)
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
    scope TEXT CHECK(scope IN ('personal', 'everyone')) NOT NULL DEFAULT 'everyone',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6b. Document Presence Table (live collaborators + cursor positions)
-- One row per (document, user). Heartbeated by active clients; rows older than
-- the liveness window are treated as offline and periodically purged.
CREATE TABLE IF NOT EXISTS document_presence (
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    cursor_anchor INTEGER NOT NULL DEFAULT 0,
    cursor_head INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (document_id, user_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

-- Composite indexes matching real query patterns (access checks + ordered lists).
-- The access-control hot path looks up a share by (user_id, document_id).
CREATE INDEX IF NOT EXISTS idx_document_shares_user_document ON document_shares(user_id, document_id);
-- Dashboard "My Documents" lists owned docs newest-first.
CREATE INDEX IF NOT EXISTS idx_documents_owner_updated ON documents(owner_id, updated_at DESC);
-- Version and comment panels list rows for a document newest-first.
CREATE INDEX IF NOT EXISTS idx_versions_document_created ON document_versions(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_document_created ON document_comments(document_id, created_at DESC);

-- NOTE: An AFTER UPDATE trigger to maintain documents.updated_at was intentionally
-- omitted. updated_at is set explicitly in lib/documents.ts:updateDocument() with a
-- precise ISO-8601 timestamp. A trigger would overwrite that value with a lower
-- resolution datetime('now') and create ambiguity, so the manual approach is kept.
