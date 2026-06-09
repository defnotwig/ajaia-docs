// app/api/documents/[id]/presence/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentAccess } from '@/lib/access';
import { upsertPresence, getActivePresence, removePresence } from '@/lib/presence';

interface RouteParams {
    params: { id: string };
}

/**
 * POST: Heartbeat the current user's cursor position and return the other
 * active collaborators. Any user with read access participates in presence.
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

        const body = await request.json().catch(() => ({}));
        const anchor = Number(body?.anchor) || 0;
        const head = Number(body?.head) || 0;

        upsertPresence(documentId, user.id, anchor, head);
        const others = getActivePresence(documentId, user.id);

        return NextResponse.json({ others });
    } catch (error) {
        console.error('Error updating presence:', error);
        return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
    }
}

/**
 * DELETE: Drop the current user's presence (called on navigate away / tab close).
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        removePresence(params.id, user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing presence:', error);
        return NextResponse.json({ error: 'Failed to remove presence' }, { status: 500 });
    }
}
