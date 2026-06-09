// lib/uploads.ts
import cryptoNode from 'crypto';
import db from './db';
import { createDocument } from './documents';
import { sanitizeFilename, titleFromFilename } from './validation';
import mammoth from 'mammoth';

export interface Attachment {
    id: string;
    document_id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    imported_text: string;
    created_at: string;
}

/**
 * Handles importing a .txt, .md, or .docx file as a new document.
 * Creates the document and saves the file metadata into the attachments table.
 */
export async function importFileAsDocument(
    filename: string,
    fileContent: string | Buffer,
    mimeType: string,
    ownerId: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
        // 1. Validate file extension and MIME type
        const extension = filename.split('.').pop()?.toLowerCase();
        if (extension !== 'txt' && extension !== 'md' && extension !== 'docx') {
            return { success: false, error: 'Unsupported file type. Only .txt, .md, and .docx are supported.' };
        }

        // Derive a clean, human-friendly title from the (sanitized) filename.
        const title = titleFromFilename(filename);
        const safeFilename = sanitizeFilename(filename);

        let contentHtml = '';
        let contentJson = '';
        let importedText = '';
        let sizeBytes = 0;

        if (extension === 'docx') {
            const buffer = Buffer.isBuffer(fileContent)
                ? fileContent
                : Buffer.from(fileContent, 'base64');

            const htmlResult = await mammoth.convertToHtml({ buffer });
            const textResult = await mammoth.extractRawText({ buffer });

            importedText = textResult.value;
            contentHtml = htmlResult.value || '<p></p>';
            contentJson = contentHtml;
            sizeBytes = buffer.length;
        } else {
            const textStr = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf8');
            importedText = textStr;
            sizeBytes = Buffer.byteLength(textStr, 'utf8');

            const paragraphs = textStr
                .split(/\r?\n/)
                .map(p => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
                .join('');

            contentHtml = paragraphs || '<p></p>';
            contentJson = JSON.stringify({
                type: 'doc',
                content: textStr.split(/\r?\n/).map(line => ({
                    type: 'paragraph',
                    content: line ? [{ type: 'text', text: line }] : []
                }))
            });
        }

        // 3. Create the document
        const documentId = await createDocument(title, ownerId, contentJson, contentHtml);

        // 4. Save metadata in attachments table
        const attachmentId = cryptoNode.randomUUID();
        const now = new Date().toISOString();

        const attachStmt = db.prepare(`
            INSERT INTO attachments (id, document_id, filename, mime_type, size_bytes, imported_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        attachStmt.run(attachmentId, documentId, safeFilename, mimeType || 'text/plain', sizeBytes, importedText, now);

        return { success: true, documentId };
    } catch (error) {
        console.error('Failed to import file:', error);
        return { success: false, error: 'Failed to import file.' };
    }
}

/**
 * Fetches attachments linked to a document.
 */
export async function getDocumentAttachments(documentId: string): Promise<Attachment[]> {
    try {
        const stmt = db.prepare(`
            SELECT id, document_id, filename, mime_type, size_bytes, imported_text, created_at
            FROM attachments
            WHERE document_id = ?
            ORDER BY created_at DESC
        `);
        return stmt.all(documentId) as Attachment[];
    } catch (error) {
        console.error('Error fetching document attachments:', error);
        return [];
    }
}
