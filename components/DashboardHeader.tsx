// components/DashboardHeader.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
}

interface DashboardHeaderProps {
    user: User;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) {
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/dashboard')}>
                <Image src="/logo.png" alt="AJAIA Docs" width={140} height={32} className="h-8 w-auto object-contain" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-l border-slate-200 pl-3.5 py-1 mt-0.5">Editor Suite</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-semibold text-slate-700 leading-tight">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
