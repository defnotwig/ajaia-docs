// app/api/documents/[id]/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDocument, updateDocument, deleteDocument } from '@/lib/documents';
import { getDocumentAccess } from '@/lib/access';
import { validateTitle } from '@/lib/validation';

interface RouteParams {
    params: {
        id: string;
    };
}

/**
 * GET: Fetch document content. Enforces read permission.
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const documentId = params.id;
        const { hasAccess, role } = await getDocumentAccess(documentId, user.id);

        if (!hasAccess || !role) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this document' }, { status: 403 });
        }

        const doc = await getDocument(documentId);
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({
            document: doc,
            role // 'owner' | 'editor' | 'viewer'
        });
    } catch (error) {
        console.error('Error fetching document details:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT: Update document title and/or rich text content. Enforces owner/editor write permission.
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const documentId = params.id;
        const { hasAccess, role } = await getDocumentAccess(documentId, user.id);

        if (!hasAccess || (role !== 'owner' && role !== 'editor')) {
            return NextResponse.json({ error: 'Forbidden: You do not have edit permission' }, { status: 403 });
        }

        const body = await request.json();
        const { title, contentJson, contentHtml } = body;

        // Server-side validation
        if (title !== undefined) {
            const validation = validateTitle(title);
            if (!validation.isValid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
        }

        // Get existing document to merge unchanged fields
        const existingDoc = await getDocument(documentId);
        if (!existingDoc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const updatedTitle = title !== undefined ? title.trim() : existingDoc.title;
        const updatedJson = contentJson !== undefined ? contentJson : existingDoc.content_json;
        const updatedHtml = contentHtml !== undefined ? contentHtml : existingDoc.content_html;

        const success = await updateDocument(documentId, updatedTitle, updatedJson, updatedHtml);

        if (!success) {
            return NextResponse.json({ error: 'Failed to save document changes' }, { status: 500 });
        }

        // Return the canonical updated_at so live-sync clients can reconcile
        // without treating their own save as an incoming remote change.
        const saved = await getDocument(documentId);
        return NextResponse.json({ success: true, updatedAt: saved?.updated_at });
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({ error: 'Internal server error during save' }, { status: 500 });
    }
}

/**
 * DELETE: Purge document. Enforces owner-only permission.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const documentId = params.id;
        const { hasAccess, role } = await getDocumentAccess(documentId, user.id);

        if (!hasAccess || role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden: Only the owner can delete this document' }, { status: 403 });
        }

        const success = await deleteDocument(documentId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Internal server error during deletion' }, { status: 500 });
    }
}
