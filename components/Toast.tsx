// components/Toast.tsx
'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error';
}

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className={`flex min-w-[320px] max-w-[min(92vw,480px)] items-center gap-3 px-5 py-4 rounded-2xl shadow-[0_18px_40px_rgba(15,23,42,0.12)] border backdrop-blur-md ${
                type === 'success' 
                    ? 'bg-emerald-50/95 border-emerald-200 text-emerald-600' 
                    : 'bg-rose-50/95 border-rose-200 text-rose-600'
            }`}>
                {type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium pr-2">{message}</span>
                <button 
                    onClick={onClose}
                    className={`p-1 rounded-lg transition-colors ${
                        type === 'success' ? 'hover:bg-emerald-100' : 'hover:bg-rose-100'
                    }`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
