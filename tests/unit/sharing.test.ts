// tests/unit/sharing.test.ts
// Real lib/sharing.ts against the isolated database.

import { describe, it, expect, beforeEach } from 'vitest';
import { shareDocument, removeShare, getDocumentShares } from '@/lib/sharing';
import { createDocument } from '@/lib/documents';
import { canEdit, getDocumentAccess } from '@/lib/access';
import { USERS } from '../helpers/fixtures';

let docId: string;

beforeEach(async () => {
    docId = await createDocument('Sharing Fixture', USERS.owner.id, '{}', '');
});

describe('shareDocument', () => {
    it('adds a viewer share', async () => {
        const res = await shareDocument(docId, USERS.viewer.email, 'viewer');
        expect(res.success).toBe(true);
        const shares = await getDocumentShares(docId);
        expect(shares).toHaveLength(1);
        expect(shares[0]).toMatchObject({ email: USERS.viewer.email, role: 'viewer' });
    });

    it('adds an editor share that grants edit access', async () => {
        await shareDocument(docId, USERS.editor.email, 'editor');
        expect(await canEdit(docId, USERS.editor.id)).toBe(true);
    });

    it('upgrades the role on a duplicate share instead of crashing', async () => {
        await shareDocument(docId, USERS.viewer.email, 'viewer');
        const upgrade = await shareDocument(docId, USERS.viewer.email, 'editor');
        expect(upgrade.success).toBe(true);

        const access = await getDocumentAccess(docId, USERS.viewer.id);
        expect(access.role).toBe('editor');
        // Still a single share row — no duplicate inserted.
        expect(await getDocumentShares(docId)).toHaveLength(1);
    });

    it('rejects sharing a document with its own owner', async () => {
        const res = await shareDocument(docId, USERS.owner.email, 'editor');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/owner/i);
    });

    it('rejects sharing with a non-existent user', async () => {
        const res = await shareDocument(docId, 'ghost@nowhere.test', 'viewer');
        expect(res.success).toBe(false);
    });
});

describe('removeShare', () => {
    it('revokes access for a collaborator', async () => {
        await shareDocument(docId, USERS.editor.email, 'editor');
        const removed = await removeShare(docId, USERS.editor.id);
        expect(removed).toBe(true);
        expect(await getDocumentShares(docId)).toHaveLength(0);
    });

    it('reports false when removing a share that does not exist', async () => {
        const removed = await removeShare(docId, USERS.stranger.id);
        expect(removed).toBe(false);
    });
});
