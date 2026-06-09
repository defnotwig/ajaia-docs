// app/api/documents/[id]/versions/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentAccess } from '@/lib/access';
import { getDocument } from '@/lib/documents';
import { createDocumentVersion, getDocumentVersions } from '@/lib/versions';

interface RouteParams {
    params: {
        id: string;
    };
}

/**
 * GET: Retrieve list of saved versions for a document. Enforces read access.
 * Returns public versions ('everyone') and personal versions created by the current user.
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const documentId = params.id;
        const { hasAccess } = await getDocumentAccess(documentId, user.id);

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this document' }, { status: 403 });
        }

        const versions = await getDocumentVersions(documentId, user.id);
        return NextResponse.json({ versions });
    } catch (error) {
        console.error('Error fetching document versions:', error);
        return NextResponse.json({ error: 'Failed to retrieve document versions' }, { status: 500 });
    }
}

/**
 * POST: Create a new version snapshot.
 * Viewers can create 'personal' snapshots. Editors and owners can create either 'everyone' or 'personal' snapshots.
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const documentId = params.id;
        const { hasAccess, role } = await getDocumentAccess(documentId, user.id);

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this document' }, { status: 403 });
        }

        const doc = await getDocument(documentId);
        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        let scope = body?.scope === 'personal' ? 'personal' : 'everyone';

        // Viewers are strictly restricted to 'personal' snapshots
        if (role === 'viewer') {
            scope = 'personal';
        }

        const success = await createDocumentVersion(
            documentId,
            doc.title,
            doc.content_json,
            doc.content_html,
            user.id,
            scope as 'personal' | 'everyone'
        );

        if (!success) {
            return NextResponse.json({ error: 'Failed to save version snapshot' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating document version snapshot:', error);
        return NextResponse.json({ error: 'Failed to create version snapshot' }, { status: 500 });
    }
}
