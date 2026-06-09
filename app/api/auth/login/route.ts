// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Verify that the user exists in the database
        const userStmt = db.prepare('SELECT id, name, email FROM users WHERE id = ?');
        const user = userStmt.get(userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found in seeded accounts' }, { status: 404 });
        }

        // Set the lightweight session cookie
        await setSessionCookie(userId);

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json({ error: 'Internal server error during login' }, { status: 500 });
    }
}
