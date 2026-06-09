// app/api/ai/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAIConfigured, summarizeDocument, rewriteText, generateActionItems, continueWriting } from '@/lib/ai';
import { validateAIAction, validateAIText } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        const body = await request.json();
        const { action, text } = body;

        // Validate the action and document text before doing any work so that
        // malformed requests fail fast with a 400 regardless of AI config.
        const actionValidation = validateAIAction(action);
        if (!actionValidation.isValid) {
            return NextResponse.json({ error: actionValidation.error }, { status: 400 });
        }

        const textValidation = validateAIText(text);
        if (!textValidation.isValid) {
            return NextResponse.json({ error: textValidation.error }, { status: 400 });
        }

        if (!isAIConfigured()) {
            return NextResponse.json({
                code: 'AI_DISABLED',
                error: 'AI assistant features are not configured. Add a valid OLLAMA_API_KEY or OPENROUTER_API_KEY in the environment settings (.env file).'
            }, { status: 503 }); // Service Unavailable, but explained
        }

        let result;
        switch (action) {
            case 'summarize':
                result = await summarizeDocument(text);
                break;
            case 'rewrite':
                result = await rewriteText(text);
                break;
            case 'action-items':
                result = await generateActionItems(text);
                break;
            case 'continue':
                result = await continueWriting(text);
                break;
            default:
                return NextResponse.json({ error: 'Invalid AI action. Must be summarize, rewrite, action-items, or continue' }, { status: 400 });
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'AI assistance failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, result: result.result });
    } catch (error) {
        console.error('AI API Route Error:', error);
        return NextResponse.json({ error: 'Internal server error during AI generation' }, { status: 500 });
    }
}
