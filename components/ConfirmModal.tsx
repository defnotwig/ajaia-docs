'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'danger' | 'warning';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    tone = 'danger',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const accentClasses =
        tone === 'danger'
            ? 'bg-rose-50 border-rose-100 text-rose-500'
            : 'bg-amber-50 border-amber-100 text-amber-500';
    const confirmClasses =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-amber-500 hover:bg-amber-600';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${accentClasses}`}>
                    <AlertTriangle className="h-7 w-7" />
                </div>

                <div className="space-y-2 text-center">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{message}</p>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmClasses}`}
                    >
                        {loading ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
