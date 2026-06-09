// lib/documents.ts
import cryptoNode from 'crypto';
import db from './db';

export interface Document {
    id: string;
    title: string;
    content_json: string;
    content_html: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface SharedDocument extends Document {
    shared_role: 'viewer' | 'editor';
    owner_name: string;
    owner_email: string;
}

/**
 * Creates a new document in the database and returns the generated UUID.
 */
export async function createDocument(
    title: string,
    ownerId: string,
    contentJson = '{}',
    contentHtml = ''
): Promise<string> {
    const documentId = cryptoNode.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO documents (id, title, content_json, content_html, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(documentId, title, contentJson, contentHtml, ownerId, now, now);
    return documentId;
}

/**
 * Retrieves a single document by ID.
 */
export async function getDocument(id: string): Promise<Document | null> {
    try {
        const stmt = db.prepare('SELECT id, title, content_json, content_html, owner_id, created_at, updated_at FROM documents WHERE id = ?');
        const doc = stmt.get(id) as Document | undefined;
        return doc || null;
    } catch (error) {
        console.error('Error fetching document:', error);
        return null;
    }
}

/**
 * Updates document content and title. Modifies updated_at.
 */
export async function updateDocument(
    id: string,
    title: string,
    contentJson: string,
    contentHtml: string
): Promise<boolean> {
    const now = new Date().toISOString();
    try {
        const stmt = db.prepare(`
            UPDATE documents
            SET title = ?, content_json = ?, content_html = ?, updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(title, contentJson, contentHtml, now, id);
        return result.changes > 0;
    } catch (error) {
        console.error('Error updating document:', error);
        return false;
    }
}

/**
 * Deletes a document by ID. Cascading deletion will automatically purge shares and attachments.
 */
export async function deleteDocument(id: string): Promise<boolean> {
    try {
        const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    } catch (error) {
        console.error('Error deleting document:', error);
        return false;
    }
}

/**
 * Retrieves all documents owned by the specified user.
 */
export async function getUserDocuments(ownerId: string): Promise<Document[]> {
    try {
        const stmt = db.prepare(`
            SELECT id, title, content_json, content_html, owner_id, created_at, updated_at
            FROM documents
            WHERE owner_id = ?
            ORDER BY updated_at DESC
        `);
        return stmt.all(ownerId) as Document[];
    } catch (error) {
        console.error('Error fetching user documents:', error);
        return [];
    }
}

/**
 * Retrieves all documents shared with the specified user, including owner details.
 */
export async function getSharedDocuments(userId: string): Promise<SharedDocument[]> {
    try {
        const stmt = db.prepare(`
            SELECT 
                d.id, 
                d.title, 
                d.content_json, 
                d.content_html, 
                d.owner_id, 
                d.created_at, 
                d.updated_at,
                ds.role as shared_role,
                u.name as owner_name,
                u.email as owner_email
            FROM documents d
            JOIN document_shares ds ON d.id = ds.document_id
            JOIN users u ON d.owner_id = u.id
            WHERE ds.user_id = ?
            ORDER BY d.updated_at DESC
        `);
        return stmt.all(userId) as SharedDocument[];
    } catch (error) {
        console.error('Error fetching shared documents:', error);
        return [];
    }
}
