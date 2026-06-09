// lib/presence.ts
//
// Lightweight live-collaboration presence. Clients heartbeat their cursor
// position for a document; other clients poll for the active set. This is a
// poll/heartbeat model (no persistent socket) so it deploys anywhere, including
// serverless platforms, without paid realtime services.

import db from './db';

export interface PresenceEntry {
    user_id: string;
    name: string;
    email: string;
    cursor_anchor: number;
    cursor_head: number;
    updated_at: string;
}

// A presence row is considered "online" if it was heartbeated within this window.
export const PRESENCE_WINDOW_MS = 10_000;

/**
 * Records (upserts) a user's live cursor position for a document.
 */
export function upsertPresence(
    documentId: string,
    userId: string,
    anchor: number,
    head: number
): boolean {
    try {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO document_presence (document_id, user_id, cursor_anchor, cursor_head, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(document_id, user_id) DO UPDATE SET
                cursor_anchor = excluded.cursor_anchor,
                cursor_head = excluded.cursor_head,
                updated_at = excluded.updated_at
        `);
        stmt.run(documentId, userId, Math.max(0, Math.floor(anchor)), Math.max(0, Math.floor(head)), now);
        return true;
    } catch (error) {
        console.error('Failed to upsert presence:', error);
        return false;
    }
}

/**
 * Returns the set of users currently active on a document (heartbeated within
 * the liveness window), optionally excluding the requesting user. Also opportunistically
 * purges rows that have gone stale.
 */
export function getActivePresence(documentId: string, excludeUserId?: string): PresenceEntry[] {
    try {
        const cutoffIso = new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString();

        // Opportunistic cleanup of stale rows for this document.
        db.prepare('DELETE FROM document_presence WHERE document_id = ? AND updated_at < ?').run(documentId, cutoffIso);

        const rows = db.prepare(`
            SELECT dp.user_id, u.name, u.email, dp.cursor_anchor, dp.cursor_head, dp.updated_at
            FROM document_presence dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.document_id = ? AND dp.updated_at >= ?
            ORDER BY u.name ASC
        `).all(documentId, cutoffIso) as PresenceEntry[];

        return excludeUserId ? rows.filter((r) => r.user_id !== excludeUserId) : rows;
    } catch (error) {
        console.error('Failed to read presence:', error);
        return [];
    }
}

/**
 * Removes a user's presence row (e.g. on tab close / navigate away).
 */
export function removePresence(documentId: string, userId: string): boolean {
    try {
        const result = db.prepare('DELETE FROM document_presence WHERE document_id = ? AND user_id = ?').run(documentId, userId);
        return result.changes > 0;
    } catch (error) {
        console.error('Failed to remove presence:', error);
        return false;
    }
}
