// lib/versions.ts
import cryptoNode from 'crypto';
import db from './db';

export interface DocumentVersion {
    id: string;
    document_id: string;
    title: string;
    content_json: string;
    content_html: string;
    created_by: string;
    scope: 'personal' | 'everyone';
    created_at: string;
    creator_name?: string;
}

/**
 * Saves a snapshot of a document version.
 */
export async function createDocumentVersion(
    documentId: string,
    title: string,
    contentJson: string,
    contentHtml: string,
    createdBy: string,
    scope: 'personal' | 'everyone' = 'everyone'
): Promise<boolean> {
    try {
        const id = cryptoNode.randomUUID();
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO document_versions (id, document_id, title, content_json, content_html, created_by, scope, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, documentId, title, contentJson, contentHtml, createdBy, scope, now);
        return true;
    } catch (error) {
        console.error('Failed to save document version:', error);
        return false;
    }
}

/**
 * Retrieves all versions saved for a specific document, filtered by access scope.
 * Users can see all 'everyone' public snapshots, but only their own 'personal' snapshots.
 */
export async function getDocumentVersions(documentId: string, userId: string): Promise<DocumentVersion[]> {
    try {
        const stmt = db.prepare(`
            SELECT dv.id, dv.document_id, dv.title, dv.content_json, dv.content_html, dv.created_by, dv.scope, dv.created_at, u.name as creator_name
            FROM document_versions dv
            JOIN users u ON dv.created_by = u.id
            WHERE dv.document_id = ? AND (dv.scope = 'everyone' OR dv.created_by = ?)
            ORDER BY dv.created_at DESC
        `);
        return stmt.all(documentId, userId) as DocumentVersion[];
    } catch (error) {
        console.error('Error fetching document versions:', error);
        return [];
    }
}
