// lib/access.ts
import db from './db';

export type AccessRole = 'owner' | 'editor' | 'viewer';

interface AccessResult {
    hasAccess: boolean;
    role: AccessRole | null;
}

/**
 * Computes the access level a specific user has for a given document.
 * Returns whether they have access and their exact role ('owner', 'editor', or 'viewer').
 */
export async function getDocumentAccess(documentId: string, userId: string): Promise<AccessResult> {
    try {
        // 1. Check if the user is the owner of the document
        const docStmt = db.prepare('SELECT owner_id FROM documents WHERE id = ?');
        const doc = docStmt.get(documentId) as { owner_id: string } | undefined;

        if (!doc) {
            return { hasAccess: false, role: null };
        }

        if (doc.owner_id === userId) {
            return { hasAccess: true, role: 'owner' };
        }

        // 2. Check if the document has been shared with this user
        const shareStmt = db.prepare('SELECT role FROM document_shares WHERE document_id = ? AND user_id = ?');
        const share = shareStmt.get(documentId, userId) as { role: 'editor' | 'viewer' } | undefined;

        if (share) {
            return { hasAccess: true, role: share.role };
        }

        // 3. Otherwise, no access
        return { hasAccess: false, role: null };
    } catch (error) {
        console.error('Error verifying document access:', error);
        return { hasAccess: false, role: null };
    }
}

/**
 * Validates if a user is allowed to read a document.
 * Allowed: Owners, Editors, and Viewers.
 */
export async function canRead(documentId: string, userId: string): Promise<boolean> {
    const { hasAccess } = await getDocumentAccess(documentId, userId);
    return hasAccess;
}

/**
 * Validates if a user is allowed to modify/edit a document.
 * Allowed: Owners and Editors.
 */
export async function canEdit(documentId: string, userId: string): Promise<boolean> {
    const { hasAccess, role } = await getDocumentAccess(documentId, userId);
    return hasAccess && (role === 'owner' || role === 'editor');
}

/**
 * Validates if a user is allowed to manage the document (rename, delete, share, create versions).
 * Allowed: Owners only.
 */
export async function canManage(documentId: string, userId: string): Promise<boolean> {
    const { hasAccess, role } = await getDocumentAccess(documentId, userId);
    return hasAccess && role === 'owner';
}
