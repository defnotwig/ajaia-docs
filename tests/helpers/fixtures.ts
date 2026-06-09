// tests/helpers/fixtures.ts
// Canonical users seeded into every isolated test database. Shared between the
// vitest setup file (which inserts them) and the test files (which reference
// them), so the IDs/emails never drift apart.

export const USERS = {
    owner: { id: 'u-owner', name: 'Owner User', email: 'owner@test.local' },
    editor: { id: 'u-editor', name: 'Editor User', email: 'editor@test.local' },
    viewer: { id: 'u-viewer', name: 'Viewer User', email: 'viewer@test.local' },
    stranger: { id: 'u-stranger', name: 'Stranger User', email: 'stranger@test.local' },
} as const;

export const SEED_USERS = Object.values(USERS);
