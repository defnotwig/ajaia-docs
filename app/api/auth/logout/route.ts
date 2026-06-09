// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
    try {
        await clearSessionCookie();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout API error:', error);
        return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }
}
