// lib/auth.ts
import { cookies } from 'next/headers';
import db from './db';

// Interface matching the database user schema
export interface User {
    id: string;
    name: string;
    email: string;
    created_at: string;
}

const COOKIE_NAME = 'ajaia_user_session';

/**
 * Retrieves the currently logged-in user from the session cookie.
 * This runs on the server side and queries the SQLite database.
 */
export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = cookies();
    const userId = cookieStore.get(COOKIE_NAME)?.value;

    if (!userId) {
        return null;
    }

    try {
        const stmt = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
        const user = stmt.get(userId) as User | undefined;
        return user || null;
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

/**
 * Sets the session cookie for the given user ID.
 */
export async function setSessionCookie(userId: string): Promise<void> {
    const cookieStore = cookies();
    // Expiration: 7 days
    cookieStore.set(COOKIE_NAME, userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
}

/**
 * Clears the session cookie to log the user out.
 */
export async function clearSessionCookie(): Promise<void> {
    const cookieStore = cookies();
    cookieStore.delete(COOKIE_NAME);
}
