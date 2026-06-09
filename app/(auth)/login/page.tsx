// app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const seededUsers = [
        {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Gabriel Rivera',
            email: 'gabriel@ajaia.test',
            roleDescription: 'Product Owner'
        },
        {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Maria Santos',
            email: 'maria@ajaia.test',
            roleDescription: 'Senior Editor'
        },
        {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Alex Cruz',
            email: 'alex@ajaia.test',
            roleDescription: 'Staff Reviewer'
        }
    ];

    const handleLogin = async (userId: string) => {
        setLoadingUserId(userId);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to authenticate');
            }

            // Redirect and refresh to update session state
            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
            setLoadingUserId(null);
        }
    };

    return (
        <main className="min-h-screen bg-[#070913] flex flex-col justify-between p-6 relative overflow-hidden select-none">
            {/* Background Liquid Glass Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-gradient-to-tr from-indigo-600/30 to-violet-600/35 blur-[100px] rounded-full animate-liquid-1 pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-600/20 to-indigo-600/25 blur-[120px] rounded-full animate-liquid-2 pointer-events-none mix-blend-screen"></div>
            <div className="absolute top-[35%] right-[10%] w-[350px] h-[350px] bg-gradient-to-bl from-cyan-600/15 to-purple-600/20 blur-[100px] rounded-full animate-liquid-3 pointer-events-none mix-blend-screen"></div>

            {/* Top spacing */}
            <div className="hidden sm:block"></div>

            {/* Login Card Container (Matte Glassmorphism) */}
            <div className="w-full max-w-md mx-auto my-auto bg-white/[0.025] border border-white/10 backdrop-blur-[35px] rounded-[2.5rem] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.6)] shadow-black/50 relative overflow-hidden ring-1 ring-white/10">
                {/* Gloss reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.005] to-white/[0.06] pointer-events-none rounded-[2.5rem]"></div>

                <div className="flex flex-col items-center text-center mb-8 relative z-10">
                    <div className="mb-3">
                        <Image
                            src="/logo.png"
                            alt="Ajaia Docs"
                            width={220}
                            height={72}
                            priority
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 max-w-xs leading-relaxed">
                        A lightweight AI-native collaborative document editor for creating, importing, editing, sharing, and managing team documents.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center relative z-10">
                        {error}
                    </div>
                )}

                <div className="space-y-4 relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2">Select a Demo Profile</p>
                    
                    {seededUsers.map((user) => (
                        <button
                            key={user.id}
                            disabled={loadingUserId !== null}
                            onClick={() => handleLogin(user.id)}
                            className="w-full flex items-center justify-between p-4 bg-white/[0.015] hover:bg-white/[0.06] border border-white/[0.03] hover:border-white/15 rounded-2xl text-left transition-all duration-300 group disabled:opacity-50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-indigo-300 border border-white/10 flex items-center justify-center font-bold text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors">{user.name}</p>
                                    <p className="text-[10.5px] text-slate-400 mt-0.5">{user.email} {'\u2022'} <span className="text-slate-500">{user.roleDescription}</span></p>
                                </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-white/[0.05] border border-white/5 group-hover:bg-indigo-600/90 group-hover:border-indigo-500 text-slate-400 group-hover:text-white transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                {loadingUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer candidate branding */}
            <div className="text-center text-xs text-slate-500 py-4 space-y-1 relative z-10">
                <p className="font-semibold text-slate-400">Ajaia Docs</p>
                <p className="text-[10px] text-slate-600">Developed by Gabriel Ludwig Rivera</p>
            </div>
        </main>
    );
}
