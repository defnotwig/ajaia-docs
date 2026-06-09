// components/ShareModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, User, Trash2, Shield, Loader2, AlertCircle } from 'lucide-react';

interface ShareDetail {
    user_id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor';
}

interface ShareModalProps {
    isOpen: boolean;
    documentId: string;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ShareModal({ isOpen, documentId, onClose, onToast }: ShareModalProps) {
    const [shares, setShares] = useState<ShareDetail[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
    const [loadingList, setLoadingList] = useState(false);
    const [loadingShare, setLoadingShare] = useState(false);
    const [loadingRevokeId, setLoadingRevokeId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // List of pre-seeded accounts to help reviewers select
    const seededAccounts = [
        { name: 'Gabriel Rivera', email: 'gabriel@ajaia.test' },
        { name: 'Maria Santos', email: 'maria@ajaia.test' },
        { name: 'Alex Cruz', email: 'alex@ajaia.test' }
    ];

    useEffect(() => {
        if (isOpen && documentId) {
            fetchShares();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, documentId]);

    const fetchShares = async () => {
        setLoadingList(true);
        setError(null);
        try {
            const res = await fetch(`/api/sharing?documentId=${documentId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load sharing list');
            setShares(data.shares || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingList(false);
        }
    };

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoadingShare(true);
        setError(null);

        try {
            const res = await fetch('/api/sharing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, email: email.trim(), role }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to share document');
            }

            onToast(`Successfully shared with ${email}`, 'success');
            setEmail('');
            fetchShares();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingShare(false);
        }
    };

    const handleRevoke = async (targetUserId: string, targetEmail: string) => {
        setLoadingRevokeId(targetUserId);
        setError(null);

        try {
            const res = await fetch(`/api/sharing?documentId=${documentId}&userId=${targetUserId}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to revoke access');
            }

            onToast(`Access revoked for ${targetEmail}`, 'success');
            fetchShares();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingRevokeId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Share Document</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Manage permissions and collaborator access</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Share Form */}
                    <form onSubmit={handleShare} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter collaborator email..."
                                    required
                                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-700 bg-slate-50/50"
                                />
                                {/* Quick Selections for Demo reviewers */}
                                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] text-slate-400 mr-1">Demo Accounts:</span>
                                    {seededAccounts.map((acct) => (
                                        <button
                                            key={acct.email}
                                            type="button"
                                            onClick={() => setEmail(acct.email)}
                                            className="text-[10px] px-2 py-0.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-md transition-colors font-medium"
                                        >
                                            {acct.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-700 bg-white"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={loadingShare || !email}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10"
                                >
                                    {loadingShare ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Share
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Error display */}
                    {error && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Collaborator List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">People with Access</h3>
                        
                        {loadingList ? (
                            <div className="flex justify-center items-center py-6">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        ) : shares.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                                This document is not shared with anyone yet.
                            </p>
                        ) : (
                            <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden max-h-[220px] overflow-y-auto">
                                {shares.map((share) => (
                                    <div key={share.user_id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 leading-tight">{share.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{share.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                share.role === 'editor' 
                                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-500'
                                            }`}>
                                                <Shield className="w-3 h-3" />
                                                {share.role}
                                            </span>
                                            
                                            <button
                                                onClick={() => handleRevoke(share.user_id, share.email)}
                                                disabled={loadingRevokeId !== null}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                            >
                                                {loadingRevokeId === share.user_id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
