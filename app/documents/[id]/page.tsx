// app/documents/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Toast, { ToastMessage } from '../../../components/Toast';
import ConfirmModal from '../../../components/ConfirmModal';

const Editor = dynamic(() => import('../../../components/Editor'), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col flex-1 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm animate-pulse min-h-[500px] items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-400 mt-2">Loading document editor...</p>
        </div>
    )
});

import { 
    ArrowLeft, Users, History, MessageSquare, Sparkles, 
    Share2, Shield, Calendar, Send, Trash2, Plus, Sparkle,
    Loader2, AlertTriangle, Play, HelpCircle, Check, RefreshCw
} from 'lucide-react';

interface Document {
    id: string;
    title: string;
    content_json: string;
    content_html: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

interface ShareDetail {
    user_id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor';
}

interface Version {
    id: string;
    title: string;
    content_json: string;
    content_html: string;
    created_by: string;
    scope: 'personal' | 'everyone';
    created_at: string;
    creator_name?: string;
}

interface Comment {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
    user_name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

interface PresenceUser {
    user_id: string;
    name: string;
    cursor_anchor: number;
    cursor_head: number;
}

type TabType = 'share' | 'versions' | 'comments' | 'ai';

export default function DocumentPage() {
    const router = useRouter();
    const params = useParams();
    const documentId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [doc, setDoc] = useState<Document | null>(null);
    const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
    
    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('share');
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // Sidebar: Collaborators / Share
    const [shares, setShares] = useState<ShareDetail[]>([]);
    const [ownerDetail, setOwnerDetail] = useState<{ id: string; name: string; email: string } | null>(null);
    const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
    const [sharingLoading, setSharingLoading] = useState(false);

    // Sidebar: Versions
    const [versions, setVersions] = useState<Version[]>([]);
    const [savingVersion, setSavingVersion] = useState(false);
    const [versionScope, setVersionScope] = useState<'personal' | 'everyone'>('everyone');
    const [pendingRestoreVersion, setPendingRestoreVersion] = useState<Version | null>(null);

    // Sidebar: Comments
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Sidebar: AI
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // TipTap Editor reference for inserts
    const [editorInstance, setEditorInstance] = useState<any | null>(null);

    useEffect(() => {
        checkSessionAndFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId]);

    // Set up real-time polling intervals for comments, versions, and collaborators
    useEffect(() => {
        if (!user) return;

        const commentsInterval = setInterval(fetchComments, 2000);
        const versionsInterval = setInterval(fetchVersions, 5000);
        const sharesInterval = setInterval(fetchShares, 5000);

        return () => {
            clearInterval(commentsInterval);
            clearInterval(versionsInterval);
            clearInterval(sharesInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, documentId]);

    const checkSessionAndFetch = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                setUser(data.user);
                fetchDocumentDetails(data.user.id);
            } else {
                router.push('/login');
            }
        } catch (err) {
            router.push('/login');
        }
    };

    const fetchDocumentDetails = async (userId: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/documents/${documentId}`);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    setError('Access Denied: You do not have permission to open this document.');
                } else {
                    setError(data.error || 'Failed to open document.');
                }
                return;
            }

            setDoc(data.document);
            setRole(data.role);

            // Initial fetches
            fetchComments();
            fetchVersions();
            fetchShares();
        } catch (err) {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // Sidebar CRUD - Shares
    const fetchShares = async () => {
        try {
            const res = await fetch(`/api/sharing?documentId=${documentId}`);
            if (res.ok) {
                const data = await res.json();
                setShares(data.shares || []);
                if (data.owner) {
                    setOwnerDetail({
                        id: data.owner.user_id,
                        name: data.owner.name,
                        email: data.owner.email
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching shares:', err);
        }
    };

    const handleAddShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareEmail.trim()) return;

        setSharingLoading(true);
        try {
            const res = await fetch('/api/sharing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, email: shareEmail.trim(), role: shareRole })
            });
            const data = await res.json();

            if (res.ok) {
                showToast(`Shared with ${shareEmail}`, 'success');
                setShareEmail('');
                fetchShares();
            } else {
                showToast(data.error || 'Failed to share', 'error');
            }
        } catch (err) {
            showToast('Error sharing document', 'error');
        } finally {
            setSharingLoading(false);
        }
    };

    const handleRemoveShare = async (targetUserId: string, targetEmail: string) => {
        try {
            const res = await fetch(`/api/sharing?documentId=${documentId}&userId=${targetUserId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast(`Revoked access for ${targetEmail}`, 'success');
                fetchShares();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to revoke access', 'error');
            }
        } catch (err) {
            showToast('Error removing collaborator', 'error');
        }
    };

    // Sidebar CRUD - Versions
    const fetchVersions = async () => {
        try {
            const res = await fetch(`/api/documents/${documentId}/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data.versions || []);
            }
        } catch (err) {
            console.error('Error fetching versions:', err);
        }
    };

    const handleSaveVersion = async () => {
        setSavingVersion(true);
        try {
            const res = await fetch(`/api/documents/${documentId}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope: role === 'viewer' ? 'personal' : versionScope })
            });
            if (res.ok) {
                showToast('Version snapshot saved!', 'success');
                fetchVersions();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to save version', 'error');
            }
        } catch (err) {
            showToast('Error saving version snapshot', 'error');
        } finally {
            setSavingVersion(false);
        }
    };

    const handleRestoreVersion = async (version: Version) => {
        if (role === 'viewer') {
            showToast('Forbidden: Viewers cannot restore versions', 'error');
            return;
        }
        setPendingRestoreVersion(version);
    };

    const confirmRestoreVersion = async () => {
        if (!pendingRestoreVersion) return;

        try {
            const res = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: pendingRestoreVersion.title,
                    contentJson: pendingRestoreVersion.content_json,
                    contentHtml: pendingRestoreVersion.content_html
                })
            });

            if (res.ok) {
                showToast('Version loaded successfully! Refreshing...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to load version', 'error');
            }
        } catch (err) {
            showToast('Error loading version', 'error');
        } finally {
            setPendingRestoreVersion(null);
        }
    };

    // Sidebar CRUD - Comments
    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/documents/${documentId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        }
    };

    const submitComment = async () => {
        if (!newComment.trim() || postingComment) return;

        setPostingComment(true);
        try {
            const res = await fetch(`/api/documents/${documentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentBody: newComment.trim() })
            });

            if (res.ok) {
                setNewComment('');
                fetchComments();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to post comment', 'error');
            }
        } catch (err) {
            showToast('Error posting comment', 'error');
        } finally {
            setPostingComment(false);
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        void submitComment();
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submitComment();
        }
    };

    // Sidebar CRUD - AI
    const handleAICall = async (action: 'summarize' | 'rewrite' | 'action-items' | 'continue') => {
        if (!doc) return;
        setAiLoading(true);
        setAiResult(null);

        // Get document content, preferring editor state if loaded, falling back to doc state
        let textContent = '';
        if (editorInstance) {
            textContent = editorInstance.getText() || 'Empty document content';
        } else {
            textContent = doc.content_html.replace(/<[^>]*>/g, '\n').trim() || 'Empty document content';
        }

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, text: textContent })
            });
            const data = await res.json();

            if (res.ok) {
                setAiResult(data.result);
            } else {
                showToast(data.error || 'AI assistance failed.', 'error');
            }
        } catch (err) {
            showToast('Failed to communicate with AI endpoint.', 'error');
        } finally {
            setAiLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ id: Date.now().toString(), message, type });
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const isUserOnline = (userId: string) => {
        if (userId === user?.id) return true;
        return presenceUsers.some(p => p.user_id === userId);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-semibold text-slate-500">Opening document workspace...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-5">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-full text-rose-500 w-16 h-16 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-800">Workspace Authorization Error</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-all w-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </main>
        );
    }

    if (!doc || !role || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col h-screen overflow-hidden">
            {/* Top Workspace Header */}
            <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/dashboard"
                        className="p-2 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-700 bg-slate-50/50 transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-4.5 h-4.5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{doc.title}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                role === 'owner' 
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                    : role === 'editor' 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                        : 'bg-slate-50 border-slate-100 text-slate-500'
                             }`}>
                                {role} access
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Last saved {formatTime(doc.updated_at)}</p>
                    </div>
                </div>

                {/* Presence indicator avatars next to header */}
                <div className="hidden md:flex items-center gap-1.5 mr-auto ml-6">
                    {presenceUsers.map(p => (
                        <div 
                            key={p.user_id} 
                            className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-white ring-2 ring-indigo-500/20 truncate px-1"
                            title={`${p.name} is currently editing`}
                        >
                            {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                    ))}
                </div>

                {/* Tab select bar */}
                <div className="flex bg-slate-100/80 border border-slate-200/40 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'share' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Collaborators</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('versions')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'versions' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Versions</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'comments' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Comments</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'ai' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI Assist</span>
                    </button>
                </div>
            </header>

            {/* Split Screen Panel */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Area: TipTap Rich Text Editor */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto h-full flex flex-col">
                        <Editor
                            initialTitle={doc.title}
                            initialContentJson={doc.content_json}
                            initialUpdatedAt={doc.updated_at}
                            documentId={doc.id}
                            userRole={role}
                            currentUserId={user.id}
                            currentUserName={user.name}
                            onTitleChange={(newTitle) => {
                                setDoc(prev => prev ? { ...prev, title: newTitle } : null);
                            }}
                            onEditorReady={(editor) => {
                                setEditorInstance(editor);
                            }}
                            onPresenceChange={(others) => {
                                setPresenceUsers(others);
                            }}
                        />
                    </div>
                </div>

                {/* Right Area: Dynamic Sidebar Tabs */}
                <aside className="w-80 border-l border-slate-200/80 bg-white flex flex-col flex-shrink-0 h-full overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-6">
                        {/* TAB 1: Collaborators & Sharing */}
                        {activeTab === 'share' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Sharing</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">Review and manage collaborator access</p>
                                </div>

                                {/* Owner Section (Isolated card for UX clarity) */}
                                {ownerDetail && (
                                    <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl space-y-2 text-left">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Document Owner</p>
                                        <div className="flex items-center justify-between">
                                            <div className="truncate max-w-[70%]">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{ownerDetail.name}</p>
                                                    {isUserOnline(ownerDetail.id) && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ownerDetail.email}</p>
                                            </div>
                                            <span className="text-[9px] font-bold border border-indigo-200 bg-indigo-50/50 px-2 py-0.5 rounded-full text-indigo-600 uppercase tracking-wide">
                                                Owner
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {role === 'owner' && (
                                    <form onSubmit={handleAddShare} className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Invite User</p>
                                        <input
                                            type="email"
                                            value={shareEmail}
                                            onChange={(e) => setShareEmail(e.target.value)}
                                            placeholder="e.g. maria@ajaia.test"
                                            required
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500 text-slate-700"
                                        />
                                        {/* Seed options shortcuts */}
                                        <div className="flex gap-1 flex-wrap">
                                            {['gabriel@ajaia.test', 'maria@ajaia.test', 'alex@ajaia.test']
                                                .filter(em => em !== user?.email && em !== ownerDetail?.email && !shares.some(s => s.email === em))
                                                .map(em => (
                                                    <button 
                                                        key={em} 
                                                        type="button"
                                                        onClick={() => setShareEmail(em)}
                                                        className="text-[9px] border border-slate-200 hover:bg-slate-100 px-1.5 py-0.5 rounded text-slate-500"
                                                    >
                                                        {em.split('@')[0]}
                                                    </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <select
                                                value={shareRole}
                                                onChange={(e) => setShareRole(e.target.value as 'viewer' | 'editor')}
                                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                            </select>
                                            <button
                                                type="submit"
                                                disabled={sharingLoading}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                            >
                                                {sharingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                Add
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-2.5 text-left">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Collaborators ({shares.length})</p>
                                    {shares.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic bg-slate-50/50 p-4 rounded-xl text-center border border-slate-100/60">
                                            Not shared with anyone else yet.
                                        </p>
                                    ) : (
                                        <div className="divide-y divide-slate-100 border border-slate-200/50 rounded-2xl overflow-hidden bg-white shadow-sm">
                                            {shares.map(sh => {
                                                const isOnline = isUserOnline(sh.user_id);
                                                return (
                                                    <div key={sh.user_id} className="flex items-center justify-between p-3 hover:bg-slate-50/60 transition-colors">
                                                        <div className="truncate max-w-[65%]">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-xs font-bold text-slate-700 leading-tight truncate">{sh.name}</p>
                                                                {isOnline && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online" />
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{sh.email}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                                sh.role === 'editor' 
                                                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                                    : 'bg-slate-50 border-slate-100 text-slate-500'
                                                            }`}>
                                                                {sh.role}
                                                            </span>
                                                            {role === 'owner' && (
                                                                <button
                                                                    onClick={() => handleRemoveShare(sh.user_id, sh.email)}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                                    title="Revoke access"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Version History */}
                        {activeTab === 'versions' && (
                            <div className="space-y-5">
                                <div className="text-left">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Version History</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">Snapshot document checkpoints</p>
                                </div>

                                {/* Save Snapshot controls with Scoping option */}
                                <div className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                                    {role !== 'viewer' ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sharing Scope</span>
                                                <select
                                                    value={versionScope}
                                                    onChange={(e) => setVersionScope(e.target.value as 'personal' | 'everyone')}
                                                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                                                >
                                                    <option value="everyone">Everyone (Public)</option>
                                                    <option value="personal">Only Me (Private)</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleSaveVersion}
                                                disabled={savingVersion}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                            >
                                                {savingVersion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                Snapshot Version
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSaveVersion}
                                            disabled={savingVersion}
                                            className="w-full py-2 bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            {savingVersion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                            Snapshot (Private Only)
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {versions.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">No version snapshots saved yet.</p>
                                    ) : (
                                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                                            {versions.map(v => (
                                                <div 
                                                    key={v.id} 
                                                    onClick={() => handleRestoreVersion(v)}
                                                    className={`p-3 border rounded-xl transition-all cursor-pointer text-left ${
                                                        role === 'viewer' 
                                                            ? 'border-slate-100 bg-slate-50/20 hover:bg-slate-50' 
                                                            : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/10 bg-white shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700 leading-snug truncate max-w-[80%]">{v.title}</span>
                                                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                                            v.scope === 'everyone'
                                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                                : 'bg-amber-50 border-amber-100 text-amber-600'
                                                        }`}>
                                                            {v.scope}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-1">
                                                        Created by <span className="font-semibold text-slate-500">{v.creator_name}</span>
                                                    </p>
                                                    <p className="text-[9px] text-indigo-500 font-semibold mt-1.5">{formatTime(v.created_at)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Comments */}
                        {activeTab === 'comments' && (
                            <div className="space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="text-left">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Comments</h3>
                                        <p className="text-[11px] text-slate-400 mt-1">Side panel discussions</p>
                                    </div>

                                    {/* List comments */}
                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                        {comments.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">No comments yet. Start the conversation!</p>
                                        ) : (
                                            comments.map(c => (
                                                <div key={c.id} className="p-3 bg-slate-50 border border-slate-100/50 rounded-xl space-y-1 text-left">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                        <span className="font-bold text-indigo-600">{c.user_name}</span>
                                                        <span>{formatTime(c.created_at).split(' - ')[0]}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap">{c.body}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Comment inputs */}
                                <form onSubmit={handleAddComment} className="border-t border-slate-100 pt-4 mt-auto">
                                    <div className="relative">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={handleCommentKeyDown}
                                            placeholder="Write a comment... (Enter to submit, Shift+Enter for newline)"
                                            required
                                            rows={2}
                                            className="w-full p-2.5 pr-12 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 resize-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={postingComment || !newComment.trim()}
                                            className="absolute bottom-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg transition-colors shadow-sm"
                                        >
                                            {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* TAB 4: AI Assist */}
                        {activeTab === 'ai' && (
                            <div className="space-y-5">
                                <div className="text-left">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Assist Panel</h3>
                                    <p className="text-[11px] text-slate-400 mt-1">AI-powered document tools</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleAICall('summarize')}
                                        disabled={aiLoading}
                                        className="w-full py-2 px-3 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                                    >
                                        <span>Summarize Document</span>
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                    </button>
                                    <button
                                        onClick={() => handleAICall('action-items')}
                                        disabled={aiLoading}
                                        className="w-full py-2 px-3 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                                    >
                                        <span>Generate Action Items</span>
                                        <Sparkle className="w-4 h-4 text-indigo-500" />
                                    </button>
                                    <button
                                        onClick={() => handleAICall('rewrite')}
                                        disabled={aiLoading}
                                        className="w-full py-2 px-3 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                                    >
                                        <span>Rewrite Professionally</span>
                                        <Sparkle className="w-4 h-4 text-indigo-500" />
                                    </button>
                                    <button
                                        onClick={() => handleAICall('continue')}
                                        disabled={aiLoading}
                                        className="w-full py-2 px-3 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                                    >
                                        <span>Suggest Next Paragraph</span>
                                        <Sparkle className="w-4 h-4 text-indigo-500 animate-pulse" />
                                    </button>
                                </div>

                                {/* Results display */}
                                {aiLoading && (
                                    <div className="flex flex-col items-center justify-center py-8 gap-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                        <p className="text-[11px] text-slate-400 font-semibold">Generating AI suggestions...</p>
                                    </div>
                                )}

                                {aiResult && (
                                    <div className="space-y-2 text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Suggestion</p>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
                                            {aiResult}
                                        </div>
                                        {editorInstance && role !== 'viewer' && (
                                            <button
                                                onClick={() => {
                                                    editorInstance.chain().focus().insertContent(aiResult).run();
                                                    showToast('Inserted AI suggestion at cursor!', 'success');
                                                }}
                                                className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Insert at Cursor
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={pendingRestoreVersion !== null}
                title="Restore Version?"
                message={
                    pendingRestoreVersion
                        ? `Are you sure you want to load version "${pendingRestoreVersion.title}"? Unsaved current changes will be overwritten.`
                        : ''
                }
                confirmLabel="Restore"
                cancelLabel="Cancel"
                tone="warning"
                onCancel={() => setPendingRestoreVersion(null)}
                onConfirm={confirmRestoreVersion}
            />
        </div>
    );
}
