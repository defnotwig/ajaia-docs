// tests/unit/ai.test.ts
// Real lib/ai.ts graceful-degradation + the route's action/text validation contract.
// Network is mocked so no real provider calls are made.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { isAIConfigured, summarizeDocument } from '@/lib/ai';
import { validateAIAction, validateAIText } from '@/lib/validation';

const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_OLLAMA_KEY = process.env.OLLAMA_API_KEY;
const ORIGINAL_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const ORIGINAL_OLLAMA_MODEL = process.env.OLLAMA_MODEL;

afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
        delete process.env.OPENROUTER_API_KEY;
    } else {
        process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
    }
    if (ORIGINAL_OLLAMA_KEY === undefined) {
        delete process.env.OLLAMA_API_KEY;
    } else {
        process.env.OLLAMA_API_KEY = ORIGINAL_OLLAMA_KEY;
    }
    if (ORIGINAL_OLLAMA_BASE_URL === undefined) {
        delete process.env.OLLAMA_BASE_URL;
    } else {
        process.env.OLLAMA_BASE_URL = ORIGINAL_OLLAMA_BASE_URL;
    }
    if (ORIGINAL_OLLAMA_MODEL === undefined) {
        delete process.env.OLLAMA_MODEL;
    } else {
        process.env.OLLAMA_MODEL = ORIGINAL_OLLAMA_MODEL;
    }
    vi.restoreAllMocks();
});

describe('AI configuration gating', () => {
    it('reports not-configured when no API key is present', () => {
        delete process.env.OPENROUTER_API_KEY;
        delete process.env.OLLAMA_API_KEY;
        expect(isAIConfigured()).toBe(false);
    });

    it('summarize fails gracefully (no throw) when key is missing', async () => {
        delete process.env.OPENROUTER_API_KEY;
        delete process.env.OLLAMA_API_KEY;
        const fetchSpy = vi.spyOn(globalThis, 'fetch' as any);
        const res = await summarizeDocument('Some document text');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/not configured|OPENROUTER_API_KEY|OLLAMA_API_KEY/i);
        // Must not even attempt a network request without a key.
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('AI request validation (route contract)', () => {
    it('rejects an unsupported action', () => {
        expect(validateAIAction('translate').isValid).toBe(false);
    });
    it('rejects empty document text', () => {
        expect(validateAIText('').isValid).toBe(false);
    });
});

describe('AI success path (mocked network, no mutation)', () => {
    beforeEach(() => {
        delete process.env.OLLAMA_API_KEY;
        process.env.OPENROUTER_API_KEY = 'test-key';
    });

    it('returns a suggestion from the provider response', async () => {
        const inputText = 'Original document content that must stay unchanged.';
        vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'A concise summary.' } }],
            }),
        } as Response);

        const res = await summarizeDocument(inputText);
        expect(res.success).toBe(true);
        expect(res.result).toBe('A concise summary.');
        // The helper returns a suggestion only; the caller's input is never mutated.
        expect(inputText).toBe('Original document content that must stay unchanged.');
    });

    it('returns a controlled error on network failure', async () => {
        vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('network down'));
        const res = await summarizeDocument('text');
        expect(res.success).toBe(false);
        expect(res.error).toBeTruthy();
    });

    it('prefers Ollama when an Ollama key is configured', async () => {
        process.env.OLLAMA_API_KEY = 'ollama-key';
        process.env.OLLAMA_BASE_URL = 'https://ollama.com';
        process.env.OLLAMA_MODEL = 'gpt-oss:20b';

        const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Ollama summary.' } }],
            }),
        } as Response);

        const res = await summarizeDocument('Provider routing test.');
        expect(res.success).toBe(true);
        expect(res.result).toBe('Ollama summary.');
        expect(fetchSpy).toHaveBeenCalledWith(
            'https://ollama.com/v1/chat/completions',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer ollama-key',
                }),
            })
        );
    });
});
