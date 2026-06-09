// tests/unit/versions.test.ts
// Real lib/versions.ts behavior + access rules for creating snapshots.

import { describe, it, expect, beforeAll } from 'vitest';
import { createDocumentVersion, getDocumentVersions } from '@/lib/versions';
import { createDocument } from '@/lib/documents';
import { shareDocument } from '@/lib/sharing';
import { canEdit } from '@/lib/access';
import { USERS } from '../helpers/fixtures';

let docId: string;

beforeAll(async () => {
    docId = await createDocument('Versioned Doc', USERS.owner.id, '{"v":1}', '<p>v1</p>');
    await shareDocument(docId, USERS.editor.email, 'editor');
    await shareDocument(docId, USERS.viewer.email, 'viewer');
});

describe('document versions', () => {
    it('stores a snapshot with title, content and author', async () => {
        const ok = await createDocumentVersion(docId, 'Versioned Doc', '{"v":1}', '<p>v1</p>', USERS.owner.id);
        expect(ok).toBe(true);

        const versions = await getDocumentVersions(docId, USERS.owner.id);
        expect(versions.length).toBeGreaterThanOrEqual(1);
        const latest = versions[0];
        expect(latest).toMatchObject({
            title: 'Versioned Doc',
            content_json: '{"v":1}',
            content_html: '<p>v1</p>',
            created_by: USERS.owner.id,
        });
        expect(latest.creator_name).toBe(USERS.owner.name);
    });

    it('lists versions newest-first', async () => {
        await createDocumentVersion(docId, 'Snapshot A', '{}', '', USERS.owner.id);
        await new Promise((r) => setTimeout(r, 5));
        await createDocumentVersion(docId, 'Snapshot B', '{}', '', USERS.editor.id);

        const versions = await getDocumentVersions(docId, USERS.owner.id);
        const times = versions.map((v) => new Date(v.created_at).getTime());
        const sorted = [...times].sort((a, b) => b - a);
        expect(times).toEqual(sorted);
    });

    it('access policy: owner and editor can snapshot, viewer cannot', async () => {
        // The route gates snapshot creation on canEdit — assert that contract.
        expect(await canEdit(docId, USERS.owner.id)).toBe(true);
        expect(await canEdit(docId, USERS.editor.id)).toBe(true);
        expect(await canEdit(docId, USERS.viewer.id)).toBe(false);
    });

    it('scopes versions: everyone see everyone, personal is private', async () => {
        // Create an 'everyone' snapshot by editor
        await createDocumentVersion(docId, 'Public Snapshot', '{}', '', USERS.editor.id, 'everyone');
        // Create a 'personal' snapshot by editor
        await createDocumentVersion(docId, 'Private Snapshot', '{}', '', USERS.editor.id, 'personal');

        // Owner queries versions
        const ownerVersions = await getDocumentVersions(docId, USERS.owner.id);
        expect(ownerVersions.some(v => v.title === 'Public Snapshot')).toBe(true);
        expect(ownerVersions.some(v => v.title === 'Private Snapshot')).toBe(false);

        // Editor queries versions
        const editorVersions = await getDocumentVersions(docId, USERS.editor.id);
        expect(editorVersions.some(v => v.title === 'Public Snapshot')).toBe(true);
        expect(editorVersions.some(v => v.title === 'Private Snapshot')).toBe(true);
    });
});
