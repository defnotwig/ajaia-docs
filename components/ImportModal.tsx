// components/ImportModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (documentId: string) => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const extension = selectedFile.name.split('.').pop()?.toLowerCase();
            
            if (extension !== 'txt' && extension !== 'md' && extension !== 'docx') {
                setError('Unsupported file type. Only .txt, .md, and .docx are supported.');
                setFile(null);
                return;
            }
            
            setError(null);
            setFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            const extension = droppedFile.name.split('.').pop()?.toLowerCase();
            
            if (extension !== 'txt' && extension !== 'md' && extension !== 'docx') {
                setError('Unsupported file type. Only .txt, .md, and .docx are supported.');
                setFile(null);
                return;
            }
            
            setError(null);
            setFile(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to import document');
            }

            onSuccess(data.documentId);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Something went wrong during import');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Import Document</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Drag and Drop Zone */}
                    <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                            file 
                                ? 'border-indigo-500/50 bg-indigo-50/20' 
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".txt,.md,.docx" 
                            className="hidden" 
                        />
                        
                        <div className={`p-3 rounded-full ${file ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                            <Upload className="w-6 h-6" />
                        </div>
                        
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                {file ? file.name : 'Click to upload or drag & drop'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Supported formats: .txt, .md, .docx (Max 2MB)
                            </p>
                        </div>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Import File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
