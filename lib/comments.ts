// lib/comments.ts
import cryptoNode from 'crypto';
import db from './db';

export interface Comment {
    id: string;
    document_id: string;
    user_id: string;
    body: string;
    created_at: string;
    user_name?: string;
}

/**
 * Saves a new document-level comment in the database.
 */
export async function addComment(documentId: string, userId: string, body: string): Promise<boolean> {
    try {
        const id = cryptoNode.randomUUID();
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO document_comments (id, document_id, user_id, body, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(id, documentId, userId, body.trim(), now);
        return true;
    } catch (error) {
        console.error('Failed to add document comment:', error);
        return false;
    }
}

/**
 * Retrieves all comments for a document, along with author name details.
 */
export async function getDocumentComments(documentId: string): Promise<Comment[]> {
    try {
        const stmt = db.prepare(`
            SELECT dc.id, dc.document_id, dc.user_id, dc.body, dc.created_at, u.name as user_name
            FROM document_comments dc
            JOIN users u ON dc.user_id = u.id
            WHERE dc.document_id = ?
            ORDER BY dc.created_at ASC
        `);
        return stmt.all(documentId) as Comment[];
    } catch (error) {
        console.error('Error fetching document comments:', error);
        return [];
    }
}
