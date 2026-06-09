// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../../components/DashboardHeader';
import ImportModal from '../../components/ImportModal';
import Toast, { ToastMessage } from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import { 
    Plus, FileText, Share2, Shield, Calendar, Trash2, 
    UploadCloud, Loader2, FileUp, ShieldAlert, ArrowRight, UserCheck
} from 'lucide-react';

interface Document {
    id: string;
    title: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

interface SharedDocument extends Document {
    shared_role: 'viewer' | 'editor';
    owner_name: string;
    owner_email: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [myDocs, setMyDocs] = useState<Document[]>([]);
    const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    useEffect(() => {
        checkSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkSession = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                setUser(data.user);
                fetchDocuments();
            } else {
                router.push('/login');
            }
        } catch (err) {
            router.push('/login');
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            if (res.ok) {
                setMyDocs(data.myDocuments || []);
                setSharedDocs(data.sharedDocuments || []);
            } else {
                showToast(data.error || 'Failed to fetch documents', 'error');
            }
        } catch (err) {
            showToast('Failed to connect to server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDocument = async () => {
        setCreating(true);
        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Untitled Document' })
            });
            const data = await res.json();
            
            if (res.ok && data.documentId) {
                router.push(`/documents/${data.documentId}`);
            } else {
                showToast(data.error || 'Failed to create document', 'error');
            }
        } catch (err) {
            showToast('Error creating document', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation(); // Prevent card navigation click
        setPendingDeleteId(docId);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;

        setDeletingId(pendingDeleteId);
        try {
            const res = await fetch(`/api/documents/${pendingDeleteId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Document deleted successfully', 'success');
                fetchDocuments();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to delete document', 'error');
            }
        } catch (err) {
            showToast('Error deleting document', 'error');
        } finally {
            setDeletingId(null);
            setPendingDeleteId(null);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ id: Date.now().toString(), message, type });
    };

    const handleImportSuccess = (documentId: string) => {
        showToast('Document imported successfully!', 'success');
        setTimeout(() => {
            router.push(`/documents/${documentId}`);
        }, 800);
    };

    // Format date utility
    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    if (loading && !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-semibold text-slate-500">Checking credentials...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            <DashboardHeader user={user} />

            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
                {/* Actions banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl shadow-indigo-950/10 relative overflow-hidden">
                    {/* Visual glowing decorators */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="space-y-1 z-10">
                        <h2 className="text-xl font-bold tracking-tight">Your Document workspace</h2>
                        <p className="text-indigo-200/80 text-xs font-medium">Create a blank document, or import an existing file to start editing.</p>
                    </div>

                    <div className="flex gap-2.5 w-full sm:w-auto z-10">
                        <button
                            onClick={() => setIsImportOpen(true)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm font-semibold transition-all"
                        >
                            <FileUp className="w-4.5 h-4.5" />
                            Import File
                        </button>
                        <button
                            onClick={handleCreateDocument}
                            disabled={creating}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all"
                        >
                            {creating ? (
                                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            ) : (
                                <Plus className="w-4.5 h-4.5" />
                            )}
                            New Document
                        </button>
                    </div>
                </div>

                {/* Dashboard Lists */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-slate-400 font-medium">Loading documents...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Section: My Documents */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Documents ({myDocs.length})</h3>
                            </div>

                            {myDocs.length === 0 ? (
                                <div className="border border-dashed border-slate-200 bg-white rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-500">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="max-w-xs">
                                        <p className="text-sm font-bold text-slate-700">No documents yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Create a new document or import one from your computer to get started.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myDocs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => router.push(`/documents/${doc.id}`)}
                                            className="group border border-slate-200/80 hover:border-indigo-200/80 bg-white hover:bg-indigo-50/[0.05] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-40"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div className="p-2 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-xl text-indigo-600 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDelete(e, doc.id)}
                                                        disabled={deletingId === doc.id}
                                                        className="p-1.5 rounded-lg border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete Document"
                                                    >
                                                        {deletingId === doc.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-800 mt-3 truncate group-hover:text-indigo-600 transition-colors">
                                                    {doc.title}
                                                </h4>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
                                                <span className="flex items-center gap-1">
                                                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                                    Owner
                                                </span>
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(doc.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section: Shared With Me */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Shared With Me ({sharedDocs.length})</h3>
                            </div>

                            {sharedDocs.length === 0 ? (
                                <div className="border border-dashed border-slate-200 bg-white rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 bg-slate-50 rounded-full text-slate-400 border border-slate-100">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <div className="max-w-xs">
                                        <p className="text-sm font-bold text-slate-700">Nothing shared yet</p>
                                        <p className="text-xs text-slate-400 mt-1">When others share documents with you, they will appear here with editing permissions.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sharedDocs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => router.push(`/documents/${doc.id}`)}
                                            className="group border border-slate-200/80 hover:border-indigo-200/80 bg-white hover:bg-indigo-50/[0.05] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-42"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div className="p-2 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-xl text-indigo-600 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    
                                                    {/* Access Role Pill */}
                                                    <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                                        doc.shared_role === 'editor' 
                                                            ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                                            : 'bg-slate-50 border-slate-100 text-slate-500'
                                                    }`}>
                                                        <Shield className="w-3 h-3" />
                                                        {doc.shared_role}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-800 mt-3 truncate group-hover:text-indigo-600 transition-colors">
                                                    {doc.title}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Owned by <span className="font-semibold text-slate-500">{doc.owner_name}</span>
                                                </p>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
                                                <span className="flex items-center gap-1 truncate max-w-[50%]">
                                                    <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                                                    Shared
                                                </span>
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(doc.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals & Toasts */}
            <ImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={handleImportSuccess}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={pendingDeleteId !== null}
                title="Delete Document?"
                message="Are you sure you want to delete this document? This cannot be undone."
                confirmLabel="Delete"
                tone="danger"
                loading={deletingId !== null}
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
