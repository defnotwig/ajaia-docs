// app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createDocument, getUserDocuments, getSharedDocuments } from '@/lib/documents';
import { validateTitle } from '@/lib/validation';

/**
 * GET: Retrieve My Documents and Shared With Me documents for the authenticated user.
 */
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const myDocuments = await getUserDocuments(user.id);
        const sharedDocuments = await getSharedDocuments(user.id);

        return NextResponse.json({
            myDocuments,
            sharedDocuments
        });
    } catch (error) {
        console.error('Error fetching documents list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST: Create a new blank document owned by the authenticated user.
 */
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        let title = 'Untitled Document';
        
        // Try parsing body if provided
        try {
            const body = await request.json();
            if (body && body.title) {
                const validation = validateTitle(body.title);
                if (!validation.isValid) {
                    return NextResponse.json({ error: validation.error }, { status: 400 });
                }
                title = body.title.trim();
            }
        } catch {
            // Ignore parse errors, default to Untitled
        }

        const documentId = await createDocument(title, user.id);

        return NextResponse.json({ success: true, documentId }, { status: 201 });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
