// app/api/sharing/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentAccess } from '@/lib/access';
import { shareDocument, removeShare, getDocumentShares } from '@/lib/sharing';
import { validateEmail } from '@/lib/validation';
import db from '@/lib/db';

/**
 * GET: Retrieve list of users a document is shared with. Enforces owner-only permission.
 */
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        // Verify read/write access
        const { hasAccess } = await getDocumentAccess(documentId, user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this document' }, { status: 403 });
        }

        const shares = await getDocumentShares(documentId);
        
        // Fetch the actual owner of the document from the database
        const ownerInfo = db.prepare(`
            SELECT d.owner_id, u.name, u.email
            FROM documents d
            JOIN users u ON d.owner_id = u.id
            WHERE d.id = ?
        `).get(documentId) as { owner_id: string; name: string; email: string } | undefined;
        
        const owner = ownerInfo ? { user_id: ownerInfo.owner_id, name: ownerInfo.name, email: ownerInfo.email } : null;

        return NextResponse.json({
            shares,
            owner,
        });
    } catch (error) {
        console.error('Error fetching shares:', error);
        return NextResponse.json({ error: 'Failed to retrieve sharing details' }, { status: 500 });
    }
}

/**
 * POST: Share a document with another user. Enforces owner-only permission and input validations.
 */
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const body = await request.json();
        const { documentId, email, role } = body;

        if (!documentId || !email || !role) {
            return NextResponse.json({ error: 'Missing required sharing parameters' }, { status: 400 });
        }

        if (role !== 'viewer' && role !== 'editor') {
            return NextResponse.json({ error: 'Invalid role. Must be viewer or editor' }, { status: 400 });
        }

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            return NextResponse.json({ error: emailValidation.error }, { status: 400 });
        }

        // Verify owner access
        const { hasAccess, role: userRole } = await getDocumentAccess(documentId, user.id);
        if (!hasAccess || userRole !== 'owner') {
            return NextResponse.json({ error: 'Forbidden: Only the owner can share this document' }, { status: 403 });
        }

        // Perform share operation
        const result = await shareDocument(documentId, email.trim(), role);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sharing document:', error);
        return NextResponse.json({ error: 'Failed to share document' }, { status: 500 });
    }
}

/**
 * DELETE: Remove a user's share access. Enforces owner-only permission.
 */
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');
        const targetUserId = searchParams.get('userId');

        if (!documentId || !targetUserId) {
            return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
        }

        // Verify owner access
        const { hasAccess, role } = await getDocumentAccess(documentId, user.id);
        if (!hasAccess || role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden: Only the owner can manage access' }, { status: 403 });
        }

        const success = await removeShare(documentId, targetUserId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to remove user access' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing share:', error);
        return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
    }
}
