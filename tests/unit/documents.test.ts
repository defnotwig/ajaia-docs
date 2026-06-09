// tests/unit/documents.test.ts
// Real lib/documents.ts CRUD + cascade behavior against the isolated database.

import { describe, it, expect } from 'vitest';
import {
    createDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    getUserDocuments,
    getSharedDocuments,
} from '@/lib/documents';
import { shareDocument, getDocumentShares } from '@/lib/sharing';
import { addComment, getDocumentComments } from '@/lib/comments';
import { USERS } from '../helpers/fixtures';

describe('documents CRUD', () => {
    it('creates a document owned by the given user', async () => {
        const id = await createDocument('Spec Draft', USERS.owner.id, '{"type":"doc"}', '<p>hi</p>');
        const doc = await getDocument(id);
        expect(doc).toMatchObject({
            id,
            title: 'Spec Draft',
            owner_id: USERS.owner.id,
            content_json: '{"type":"doc"}',
            content_html: '<p>hi</p>',
        });
    });

    it('lists a user\'s owned documents', async () => {
        const id = await createDocument('Owned Listing', USERS.editor.id);
        const docs = await getUserDocuments(USERS.editor.id);
        expect(docs.some((d) => d.id === id)).toBe(true);
    });

    it('updates title and content and advances updated_at', async () => {
        const id = await createDocument('Before', USERS.owner.id, '{}', '<p>old</p>');
        const before = await getDocument(id);

        const ok = await updateDocument(id, 'After', '{"v":2}', '<p>new</p>');
        expect(ok).toBe(true);

        const after = await getDocument(id);
        expect(after?.title).toBe('After');
        expect(after?.content_html).toBe('<p>new</p>');
        expect(after?.content_json).toBe('{"v":2}');
        expect(new Date(after!.updated_at).getTime()).toBeGreaterThanOrEqual(
            new Date(before!.created_at).getTime()
        );
    });

    it('surfaces a shared document under getSharedDocuments with owner details', async () => {
        const id = await createDocument('Shared Listing', USERS.owner.id);
        await shareDocument(id, USERS.viewer.email, 'viewer');

        const shared = await getSharedDocuments(USERS.viewer.id);
        const match = shared.find((d) => d.id === id);
        expect(match).toBeTruthy();
        expect(match?.shared_role).toBe('viewer');
        expect(match?.owner_name).toBe(USERS.owner.name);
    });

    it('cascades deletes to shares and comments', async () => {
        const id = await createDocument('Doomed', USERS.owner.id);
        await shareDocument(id, USERS.editor.email, 'editor');
        await addComment(id, USERS.owner.id, 'first comment');

        expect(await getDocumentShares(id)).toHaveLength(1);
        expect(await getDocumentComments(id)).toHaveLength(1);

        const deleted = await deleteDocument(id);
        expect(deleted).toBe(true);

        expect(await getDocument(id)).toBeNull();
        // ON DELETE CASCADE should have removed dependent rows.
        expect(await getDocumentShares(id)).toHaveLength(0);
        expect(await getDocumentComments(id)).toHaveLength(0);
    });
});
