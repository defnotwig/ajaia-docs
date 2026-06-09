// tests/unit/access-control.test.ts
//
// Exercises the REAL access-control helpers from lib/access.ts against an
// isolated database. Documents and shares are created through the real
// lib/documents.ts and lib/sharing.ts functions so the whole path is covered.

import { describe, it, expect, beforeAll } from 'vitest';
import { getDocumentAccess, canRead, canEdit, canManage } from '@/lib/access';
import { createDocument } from '@/lib/documents';
import { shareDocument, removeShare } from '@/lib/sharing';
import { USERS } from '../helpers/fixtures';

let docId: string;

beforeAll(async () => {
    docId = await createDocument('ACL Fixture', USERS.owner.id, '{}', '');
    await shareDocument(docId, USERS.editor.email, 'editor');
    await shareDocument(docId, USERS.viewer.email, 'viewer');
});

describe('access control — role resolution', () => {
    it('resolves the owner role for the document creator', async () => {
        const access = await getDocumentAccess(docId, USERS.owner.id);
        expect(access).toEqual({ hasAccess: true, role: 'owner' });
    });

    it('resolves the editor role for a shared editor', async () => {
        const access = await getDocumentAccess(docId, USERS.editor.id);
        expect(access).toEqual({ hasAccess: true, role: 'editor' });
    });

    it('resolves the viewer role for a shared viewer', async () => {
        const access = await getDocumentAccess(docId, USERS.viewer.id);
        expect(access).toEqual({ hasAccess: true, role: 'viewer' });
    });

    it('returns no access for an unshared user', async () => {
        const access = await getDocumentAccess(docId, USERS.stranger.id);
        expect(access).toEqual({ hasAccess: false, role: null });
    });

    it('returns no access for a non-existent document', async () => {
        const access = await getDocumentAccess('does-not-exist', USERS.owner.id);
        expect(access).toEqual({ hasAccess: false, role: null });
    });
});

describe('access control — permission matrix', () => {
    it('owner can read, edit and manage', async () => {
        expect(await canRead(docId, USERS.owner.id)).toBe(true);
        expect(await canEdit(docId, USERS.owner.id)).toBe(true);
        expect(await canManage(docId, USERS.owner.id)).toBe(true);
    });

    it('editor can read and edit but not manage', async () => {
        expect(await canRead(docId, USERS.editor.id)).toBe(true);
        expect(await canEdit(docId, USERS.editor.id)).toBe(true);
        expect(await canManage(docId, USERS.editor.id)).toBe(false);
    });

    it('viewer can read but not edit or manage', async () => {
        expect(await canRead(docId, USERS.viewer.id)).toBe(true);
        expect(await canEdit(docId, USERS.viewer.id)).toBe(false);
        expect(await canManage(docId, USERS.viewer.id)).toBe(false);
    });

    it('unshared user can do nothing', async () => {
        expect(await canRead(docId, USERS.stranger.id)).toBe(false);
        expect(await canEdit(docId, USERS.stranger.id)).toBe(false);
        expect(await canManage(docId, USERS.stranger.id)).toBe(false);
    });
});

describe('access control — revocation', () => {
    it('a removed collaborator loses all access', async () => {
        const id = await createDocument('Revoke Fixture', USERS.owner.id, '{}', '');
        await shareDocument(id, USERS.editor.email, 'editor');
        expect(await canEdit(id, USERS.editor.id)).toBe(true);

        const removed = await removeShare(id, USERS.editor.id);
        expect(removed).toBe(true);
        expect(await canRead(id, USERS.editor.id)).toBe(false);
        expect(await canEdit(id, USERS.editor.id)).toBe(false);
    });
});
