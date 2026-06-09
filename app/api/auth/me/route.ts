// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getCurrentUser();
        return NextResponse.json({ user });
    } catch (error) {
        console.error('Session retrieval error:', error);
        return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
