// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { importFileAsDocument } from '@/lib/uploads';
import { validateUpload } from '@/lib/validation';

/**
 * POST: Import a .txt or .md file as a new document.
 * Supports both FormData (browser upload) and JSON body (API testing).
 */
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        let filename = '';
        let fileContent: string | Buffer = '';
        let mimeType = 'text/plain';

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            filename = file.name;
            const extension = filename.split('.').pop()?.toLowerCase();
            mimeType = file.type;

            if (extension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                fileContent = Buffer.from(arrayBuffer);
            } else {
                fileContent = await file.text();
            }
        } else {
            // Assume JSON payload
            const body = await request.json();
            filename = body.filename;
            mimeType = body.mimeType || 'text/plain';
            const extension = filename.split('.').pop()?.toLowerCase();

            if (extension === 'docx') {
                fileContent = Buffer.from(body.content, 'base64');
            } else {
                fileContent = body.content;
            }
        }

        // Validate upload parameters
        const validation = validateUpload(filename, fileContent);
        if (!validation.isValid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Import the file
        const result = await importFileAsDocument(filename, fileContent, mimeType, user.id);

        if (!result.success || !result.documentId) {
            return NextResponse.json({ error: result.error || 'Failed to import file' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            documentId: result.documentId
        }, { status: 201 });
    } catch (error) {
        console.error('File import API error:', error);
        return NextResponse.json({ error: 'Failed to upload and import file' }, { status: 500 });
    }
}
