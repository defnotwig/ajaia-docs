// app/api/documents/[id]/comments/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentAccess } from '@/lib/access';
import { addComment, getDocumentComments } from '@/lib/comments';
import { validateComment } from '@/lib/validation';

interface RouteParams {
    params: {
        id: string;
    };
}

/**
 * GET: Fetch all comments on a document. Enforces read access.
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

        const comments = await getDocumentComments(documentId);
        return NextResponse.json({ comments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Failed to retrieve comments' }, { status: 500 });
    }
}

/**
 * POST: Add a new comment. Enforces read access (viewers, editors, and owners can write comments).
 */
export async function POST(request: Request, { params }: RouteParams) {
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

        const body = await request.json();
        const { commentBody } = body;

        const validation = validateComment(commentBody);
        if (!validation.isValid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const success = await addComment(documentId, user.id, commentBody);

        if (!success) {
            return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }
}
