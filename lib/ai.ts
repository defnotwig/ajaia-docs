// lib/ai.ts

export interface AIResponse {
    success: boolean;
    result?: string;
    error?: string;
}

interface AIRequestSpec {
    task: string;
    outputRules: string[];
    maxTokens?: number;
    temperature?: number;
}

type AIProviderConfig =
    | {
          provider: 'ollama';
          apiKey: string;
          baseUrl: string;
          model: string;
      }
    | {
          provider: 'openrouter';
          apiKey: string;
          baseUrl: string;
          model: string;
          appUrl?: string;
      };

function getAIProviderConfig(): AIProviderConfig | null {
    const ollamaApiKey = process.env.OLLAMA_API_KEY?.trim();
    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (ollamaApiKey) {
        return {
            provider: 'ollama',
            apiKey: ollamaApiKey,
            baseUrl: (process.env.OLLAMA_BASE_URL?.trim() || 'https://ollama.com').replace(/\/$/, ''),
            model: process.env.OLLAMA_MODEL?.trim() || 'gpt-oss:20b',
        };
    }

    if (openRouterApiKey) {
        return {
            provider: 'openrouter',
            apiKey: openRouterApiKey,
            baseUrl: 'https://openrouter.ai',
            model: process.env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash:free',
            appUrl: process.env.APP_URL?.trim(),
        };
    }

    return null;
}

/**
 * Validates if an AI provider is configured.
 */
export function isAIConfigured(): boolean {
    return getAIProviderConfig() !== null;
}

/**
 * Request completion from the configured AI provider.
 */
async function callAI(spec: AIRequestSpec, textContent: string): Promise<AIResponse> {
    const provider = getAIProviderConfig();

    if (!provider) {
        return {
            success: false,
            error: 'AI assistance is not configured. Add OLLAMA_API_KEY or OPENROUTER_API_KEY to the .env file.'
        };
    }

    const systemInstruction = [
        'You are AJAIA Docs AI Assist, an expert document editor.',
        'Use only the document text provided by the user.',
        'Do not invent troubleshooting, assumptions, requirements, or facts that are not explicitly supported by the document.',
        'If the source text is missing information required by the task, say so plainly.',
        'Be concise and useful.',
    ].join(' ');

    const userPrompt = [
        `Task: ${spec.task}`,
        'Rules:',
        ...spec.outputRules.map((rule, index) => `${index + 1}. ${rule}`),
        '',
        '<document>',
        textContent,
        '</document>',
    ].join('\n');

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
        };

        if (provider.provider === 'openrouter') {
            headers['X-Title'] = 'Ajaia Docs';
            if (provider.appUrl) {
                headers['HTTP-Referer'] = provider.appUrl;
            }
        }

        const response = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    {
                        role: 'system',
                        content: systemInstruction,
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: spec.temperature ?? 0.2,
                max_tokens: spec.maxTokens ?? 700
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errData.error?.message || `${provider.provider === 'ollama' ? 'Ollama' : 'OpenRouter'} API returned status ${response.status}`
            };
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content?.trim();

        if (!result) {
            return { success: false, error: `Empty response received from ${provider.provider === 'ollama' ? 'Ollama' : 'OpenRouter'}.` };
        }

        return { success: true, result };
    } catch (error) {
        console.error(`Error calling ${provider.provider} API:`, error);
        return { success: false, error: `Failed to communicate with the ${provider.provider === 'ollama' ? 'Ollama' : 'OpenRouter'} AI provider.` };
    }
}

/**
 * Summarizes document text.
 */
export async function summarizeDocument(text: string): Promise<AIResponse> {
    return callAI(
        {
            task: 'Summarize the document.',
            outputRules: [
                'Return a short summary followed by 3 to 6 bullet points.',
                'Only mention points that are explicitly stated in the document.',
                'Do not copy the document verbatim unless a short phrase is necessary.',
            ],
        },
        text
    );
}

/**
 * Rewrites text to be professional.
 */
export async function rewriteText(text: string): Promise<AIResponse> {
    return callAI(
        {
            task: 'Rewrite the document to sound more professional while preserving meaning.',
            outputRules: [
                'Preserve the original facts, intent, and overall structure.',
                'Do not add new requirements, examples, or content that is not present in the source.',
                'Return only the rewritten document text.',
            ],
            maxTokens: 1000,
            temperature: 0.15,
        },
        text
    );
}

/**
 * Generates action items from the document text.
 */
export async function generateActionItems(text: string): Promise<AIResponse> {
    return callAI(
        {
            task: 'Extract action items from the document.',
            outputRules: [
                'Return a markdown checklist.',
                'Include only actions that are explicitly requested or directly implied by the document text.',
                'Do not invent troubleshooting steps, risks, or recommendations.',
                'If there are no clear action items, return exactly: No explicit action items found.',
            ],
        },
        text
    );
}

/**
 * Continues writing the next section or paragraph of the document.
 */
export async function continueWriting(text: string): Promise<AIResponse> {
    return callAI(
        {
            task: 'Write the next logical paragraph or section for this document.',
            outputRules: [
                'Match the source tone and formatting.',
                'Continue naturally from the existing content without repeating earlier lines.',
                'Do not introduce unrelated topics or unsupported facts.',
                'Return only the continuation text.',
            ],
            maxTokens: 500,
            temperature: 0.3,
        },
        text
    );
}
