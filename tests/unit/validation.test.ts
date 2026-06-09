// tests/unit/validation.test.ts
// Pure-function validation tests against the real lib/validation.ts helpers.

import { describe, it, expect } from 'vitest';
import {
    validateTitle,
    validateEmail,
    validateShareRole,
    validateComment,
    validateUpload,
    validateAIAction,
    validateAIText,
    TITLE_MAX_LENGTH,
    COMMENT_MAX_LENGTH,
} from '@/lib/validation';

describe('validateTitle', () => {
    it('accepts a normal title', () => {
        expect(validateTitle('Quarterly Report').isValid).toBe(true);
    });

    it('rejects a blank/whitespace title', () => {
        expect(validateTitle('   ').isValid).toBe(false);
        expect(validateTitle('').isValid).toBe(false);
    });

    it('rejects a non-string title', () => {
        expect(validateTitle(undefined).isValid).toBe(false);
        expect(validateTitle(null).isValid).toBe(false);
    });

    it('rejects an overly long title', () => {
        expect(validateTitle('x'.repeat(TITLE_MAX_LENGTH + 1)).isValid).toBe(false);
    });

    it('accepts a title at exactly the max length', () => {
        expect(validateTitle('x'.repeat(TITLE_MAX_LENGTH)).isValid).toBe(true);
    });
});

describe('validateEmail', () => {
    it('accepts a valid email', () => {
        expect(validateEmail('maria@ajaia.test').isValid).toBe(true);
    });
    it('rejects malformed emails', () => {
        expect(validateEmail('not-an-email').isValid).toBe(false);
        expect(validateEmail('').isValid).toBe(false);
    });
});

describe('validateShareRole', () => {
    it('accepts viewer and editor', () => {
        expect(validateShareRole('viewer').isValid).toBe(true);
        expect(validateShareRole('editor').isValid).toBe(true);
    });
    it('rejects owner and arbitrary roles', () => {
        expect(validateShareRole('owner').isValid).toBe(false);
        expect(validateShareRole('admin').isValid).toBe(false);
        expect(validateShareRole(undefined).isValid).toBe(false);
    });
});

describe('validateComment', () => {
    it('accepts a normal comment', () => {
        expect(validateComment('Looks good to me!').isValid).toBe(true);
    });
    it('rejects an empty comment', () => {
        expect(validateComment('   ').isValid).toBe(false);
        expect(validateComment('').isValid).toBe(false);
    });
    it('rejects an over-long comment', () => {
        expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1)).isValid).toBe(false);
    });
});

describe('validateUpload', () => {
    it('accepts a .txt file', () => {
        expect(validateUpload('notes.txt', 'hello world').isValid).toBe(true);
    });
    it('accepts a .md file', () => {
        expect(validateUpload('readme.md', '# Title').isValid).toBe(true);
    });
    it('rejects an empty file', () => {
        expect(validateUpload('empty.txt', '   ').isValid).toBe(false);
    });
    it('rejects an unsupported extension', () => {
        expect(validateUpload('malware.exe', 'data').isValid).toBe(false);
        expect(validateUpload('doc.pdf', 'data').isValid).toBe(false);
    });
    it('rejects a missing filename', () => {
        expect(validateUpload('', 'data').isValid).toBe(false);
    });
});

describe('validateAIAction / validateAIText', () => {
    it('accepts supported actions', () => {
        expect(validateAIAction('summarize').isValid).toBe(true);
        expect(validateAIAction('rewrite').isValid).toBe(true);
        expect(validateAIAction('action-items').isValid).toBe(true);
    });
    it('rejects an unsupported action', () => {
        expect(validateAIAction('translate').isValid).toBe(false);
        expect(validateAIAction(undefined).isValid).toBe(false);
    });
    it('rejects empty document text', () => {
        expect(validateAIText('   ').isValid).toBe(false);
        expect(validateAIText(undefined).isValid).toBe(false);
    });
    it('accepts non-empty document text', () => {
        expect(validateAIText('Some content').isValid).toBe(true);
    });
});
