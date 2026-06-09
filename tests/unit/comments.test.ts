// tests/unit/comments.test.ts
// Real lib/comments.ts behavior + the validation/access contract the route enforces.

import { describe, it, expect, beforeAll } from 'vitest';
import { addComment, getDocumentComments } from '@/lib/comments';
import { createDocument } from '@/lib/documents';
import { shareDocument } from '@/lib/sharing';
import { canRead } from '@/lib/access';
import { validateComment } from '@/lib/validation';
import { USERS } from '../helpers/fixtures';

let docId: string;

beforeAll(async () => {
    docId = await createDocument('Commented Doc', USERS.owner.id);
    await shareDocument(docId, USERS.editor.email, 'editor');
    await shareDocument(docId, USERS.viewer.email, 'viewer');
});

describe('comments', () => {
    it('stores a comment with its author name', async () => {
        await addComment(docId, USERS.owner.id, 'Owner comment');
        const comments = await getDocumentComments(docId);
        const mine = comments.find((c) => c.body === 'Owner comment');
        expect(mine).toBeTruthy();
        expect(mine?.user_name).toBe(USERS.owner.name);
    });

    it('trims whitespace from stored comment bodies', async () => {
        await addComment(docId, USERS.editor.id, '   padded comment   ');
        const comments = await getDocumentComments(docId);
        expect(comments.some((c) => c.body === 'padded comment')).toBe(true);
    });

    it('lists comments oldest-first (conversation order)', async () => {
        const id = await createDocument('Ordered Comments', USERS.owner.id);
        await addComment(id, USERS.owner.id, 'one');
        await new Promise((r) => setTimeout(r, 5));
        await addComment(id, USERS.owner.id, 'two');
        const comments = await getDocumentComments(id);
        expect(comments.map((c) => c.body)).toEqual(['one', 'two']);
    });

    it('product rule: any user with read access (incl. viewers) may comment', async () => {
        expect(await canRead(docId, USERS.viewer.id)).toBe(true);
        expect(await canRead(docId, USERS.stranger.id)).toBe(false);
    });

    it('empty comments are rejected by the shared validator the route uses', () => {
        expect(validateComment('   ').isValid).toBe(false);
        expect(validateComment('a real comment').isValid).toBe(true);
    });
});
