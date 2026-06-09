// tests/unit/uploads.test.ts
// Filename sanitization / title derivation (pure) plus the real import pipeline.

import { describe, it, expect, vi } from 'vitest';
import { sanitizeFilename, titleFromFilename } from '@/lib/validation';
import { importFileAsDocument, getDocumentAttachments } from '@/lib/uploads';
import { getDocument } from '@/lib/documents';
import { USERS } from '../helpers/fixtures';
import mammoth from 'mammoth';

describe('sanitizeFilename', () => {
    it('strips directory traversal segments', () => {
        expect(sanitizeFilename('../../secret.md')).toBe('secret.md');
        expect(sanitizeFilename('..\\..\\windows\\system32.txt')).toBe('system32.txt');
    });
    it('keeps a normal filename intact', () => {
        expect(sanitizeFilename('meeting-notes.txt')).toBe('meeting-notes.txt');
    });
});

describe('titleFromFilename', () => {
    it('strips the extension and tidies separators', () => {
        expect(titleFromFilename('meeting_notes-2024.md')).toBe('meeting notes 2024');
    });
    it('derives a clean title even from a traversal path', () => {
        expect(titleFromFilename('../../secret.md')).toBe('secret');
    });
    it('falls back when nothing usable remains', () => {
        expect(titleFromFilename('.md')).toBe('Imported Document');
    });
});

describe('importFileAsDocument (real pipeline)', () => {
    it('imports a .txt file into a new document with a clean title', async () => {
        const result = await importFileAsDocument('My Notes.txt', 'line one\nline two', 'text/plain', USERS.owner.id);
        expect(result.success).toBe(true);
        expect(result.documentId).toBeTruthy();

        const doc = await getDocument(result.documentId!);
        expect(doc?.title).toBe('My Notes');
        expect(doc?.owner_id).toBe(USERS.owner.id);
        expect(doc?.content_html).toContain('line one');
    });

    it('imports a .md file and records sanitized attachment metadata', async () => {
        const result = await importFileAsDocument('../evil/report.md', '# Heading', 'text/markdown', USERS.owner.id);
        expect(result.success).toBe(true);

        const attachments = await getDocumentAttachments(result.documentId!);
        expect(attachments).toHaveLength(1);
        // Path traversal must not be persisted in the stored filename.
        expect(attachments[0].filename).toBe('report.md');
        expect(attachments[0].mime_type).toBe('text/markdown');
        expect(attachments[0].size_bytes).toBeGreaterThan(0);
    });

    it('imports a .docx file and converts rich text content', async () => {
        const convertSpy = vi.spyOn(mammoth, 'convertToHtml').mockResolvedValue({
            value: '<p>Paragraph 1</p>',
            messages: []
        });
        const extractSpy = vi.spyOn(mammoth, 'extractRawText').mockResolvedValue({
            value: 'Paragraph 1',
            messages: []
        });

        const result = await importFileAsDocument('Sample.docx', Buffer.from('fake-docx-binary'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', USERS.owner.id);
        expect(result.success).toBe(true);
        expect(result.documentId).toBeTruthy();

        const doc = await getDocument(result.documentId!);
        expect(doc?.title).toBe('Sample');
        expect(doc?.content_html).toBe('<p>Paragraph 1</p>');
        expect(doc?.content_json).toContain('Paragraph 1');

        expect(convertSpy).toHaveBeenCalled();
        expect(extractSpy).toHaveBeenCalled();
    });

    it('rejects an unsupported extension', async () => {
        const result = await importFileAsDocument('malware.exe', 'data', 'application/octet-stream', USERS.owner.id);
        expect(result.success).toBe(false);
    });
});
