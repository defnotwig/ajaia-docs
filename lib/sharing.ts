// lib/sharing.ts
import cryptoNode from 'crypto';
import db from './db';

export interface DocumentShare {
    id: string;
    document_id: string;
    user_id: string;
    role: 'viewer' | 'editor';
    created_at: string;
}

export interface ShareDetail {
    user_id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor';
}

/**
 * Shares a document with a user via their email address.
 * Enforces server-side validations:
 * 1. Checks if target user exists.
 * 2. Checks if user is the document owner.
 * 3. Checks for duplicate share.
 */
export async function shareDocument(
    documentId: string,
    email: string,
    role: 'viewer' | 'editor'
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Find the target user by email
        const userStmt = db.prepare('SELECT id, name FROM users WHERE email = ?');
        const targetUser = userStmt.get(email) as { id: string; name: string } | undefined;

        if (!targetUser) {
            return { success: false, error: 'User not found. Please verify the email address.' };
        }

        // 2. Check if the target user is the document owner
        const docStmt = db.prepare('SELECT owner_id FROM documents WHERE id = ?');
        const doc = docStmt.get(documentId) as { owner_id: string } | undefined;

        if (!doc) {
            return { success: false, error: 'Document not found.' };
        }

        if (doc.owner_id === targetUser.id) {
            return { success: false, error: 'You cannot share a document with its owner.' };
        }

        // 3. Check if the share already exists
        const checkStmt = db.prepare('SELECT role FROM document_shares WHERE document_id = ? AND user_id = ?');
        const existingShare = checkStmt.get(documentId, targetUser.id) as { role: string } | undefined;

        if (existingShare) {
            if (existingShare.role === role) {
                return { success: false, error: 'Duplicate share: This user already has this level of access.' };
            } else {
                // Update their access role if it changed
                const updateStmt = db.prepare('UPDATE document_shares SET role = ? WHERE document_id = ? AND user_id = ?');
                updateStmt.run(role, documentId, targetUser.id);
                return { success: true };
            }
        }

        // 4. Create new share record
        const shareId = cryptoNode.randomUUID();
        const now = new Date().toISOString();
        const insertStmt = db.prepare(`
            INSERT INTO document_shares (id, document_id, user_id, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        insertStmt.run(shareId, documentId, targetUser.id, role, now);

        return { success: true };
    } catch (error) {
        console.error('Error sharing document:', error);
        return { success: false, error: 'Failed to share document.' };
    }
}

/**
 * Removes a share record, stripping a user of access.
 */
export async function removeShare(documentId: string, userId: string): Promise<boolean> {
    try {
        const stmt = db.prepare('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?');
        const result = stmt.run(documentId, userId);
        return result.changes > 0;
    } catch (error) {
        console.error('Error removing document share:', error);
        return false;
    }
}

/**
 * Lists all users with whom a document is shared.
 */
export async function getDocumentShares(documentId: string): Promise<ShareDetail[]> {
    try {
        const stmt = db.prepare(`
            SELECT ds.user_id, u.name, u.email, ds.role
            FROM document_shares ds
            JOIN users u ON ds.user_id = u.id
            WHERE ds.document_id = ?
            ORDER BY ds.created_at ASC
        `);
        return stmt.all(documentId) as ShareDetail[];
    } catch (error) {
        console.error('Error getting document shares:', error);
        return [];
    }
}
