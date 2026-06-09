// components/Editor.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import {
    Bold, Italic, Underline, Heading1, Heading2, Pilcrow,
    List, ListOrdered, Undo, Redo, Save, AlertCircle, CloudCheck, CloudLightning, Loader2
} from 'lucide-react';
import { RemoteCursors, remoteCursorsKey, colorForUser, type RemoteCursorData } from './RemoteCursors';

interface PresenceUser {
    user_id: string;
    name: string;
    cursor_anchor: number;
    cursor_head: number;
}

interface EditorProps {
    initialTitle: string;
    initialContentJson: string;
    initialUpdatedAt: string;
    documentId: string;
    userRole: 'owner' | 'editor' | 'viewer';
    currentUserId: string;
    currentUserName: string;
    onTitleChange: (newTitle: string) => void;
    onEditorReady?: (editor: TiptapEditor | null) => void;
    onPresenceChange?: (others: PresenceUser[]) => void;
}

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

const PRESENCE_INTERVAL_MS = 1200;
const CONTENT_POLL_MS = 2500;

export default function Editor({
    initialTitle,
    initialContentJson,
    initialUpdatedAt,
    documentId,
    userRole,
    currentUserId,
    currentUserName,
    onTitleChange,
    onEditorReady,
    onPresenceChange,
}: EditorProps) {
    const isReadOnly = userRole === 'viewer';
    const [title, setTitle] = useState(initialTitle);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Refs mirror latest values for event handlers / async loops.
    const titleRef = useRef(title);
    titleRef.current = title;
    const saveStatusRef = useRef<SaveStatus>(saveStatus);
    saveStatusRef.current = saveStatus;

    // Monotonic counter to ignore stale save responses.
    const saveSeqRef = useRef(0);
    // Latest server version we have reconciled with (so live-sync doesn't re-apply
    // our own saves as if they were incoming remote changes).
    const remoteUpdatedAtRef = useRef(initialUpdatedAt);
    // Set while we programmatically apply a remote update so onUpdate doesn't
    // mark the document dirty.
    const applyingRemoteRef = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2] },
            }),
            UnderlineExtension,
            RemoteCursors,
        ],
        content: (() => {
            try {
                const trimmed = initialContentJson.trim();
                if (trimmed.startsWith('<')) {
                    return trimmed;
                }
                return JSON.parse(trimmed);
            } catch {
                return initialContentJson || '';
            }
        })(),
        editable: !isReadOnly,
        immediatelyRender: false,
        onUpdate: () => {
            if (applyingRemoteRef.current) return;
            if (!isReadOnly) {
                setSaveStatus('unsaved');
            }
        },
        onBlur: () => {
            if (!isReadOnly && saveStatusRef.current === 'unsaved') {
                void performSave();
            }
        },
    });

    // Persist the document. Guards against stale responses via a sequence number.
    const performSave = async () => {
        if (isReadOnly || !editor) return;

        const seq = ++saveSeqRef.current;
        setSaveStatus('saving');
        setErrorMsg(null);

        try {
            const jsonContent = JSON.stringify(editor.getJSON());
            const htmlContent = editor.getHTML();

            const res = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: titleRef.current.trim() || 'Untitled Document',
                    contentJson: jsonContent,
                    contentHtml: htmlContent,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save changes');
            }

            // Record the canonical version so live-sync won't treat this as remote.
            if (data.updatedAt) {
                remoteUpdatedAtRef.current = data.updatedAt;
            }

            if (seq === saveSeqRef.current) {
                setSaveStatus('saved');
            }
        } catch (err: any) {
            if (seq === saveSeqRef.current) {
                setSaveStatus('error');
                setErrorMsg(err.message || 'Auto-save failed.');
            }
        }
    };

    // Expose the editor instance to the parent (used for AI "insert into document").
    useEffect(() => {
        onEditorReady?.(editor ?? null);
        return () => onEditorReady?.(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    // Auto-save debounce.
    useEffect(() => {
        if (!editor || isReadOnly || saveStatus !== 'unsaved') return;
        const t = setTimeout(() => void performSave(), 1500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveStatus, title, editor, documentId, isReadOnly]);

    // Warn before leaving with unsaved/in-flight changes.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'saving') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // ---- Live presence: heartbeat our cursor, render other collaborators' ----
    useEffect(() => {
        if (!editor) return;

        let cancelled = false;

        const beat = async () => {
            try {
                const sel = editor.state.selection;
                const res = await fetch(`/api/documents/${documentId}/presence`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ anchor: sel.anchor, head: sel.head }),
                });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const others: PresenceUser[] = data.others || [];

                onPresenceChange?.(others);

                // Push remote carets into the editor decorations.
                const cursors: RemoteCursorData[] = others.map((o) => ({
                    userId: o.user_id,
                    name: o.name,
                    color: colorForUser(o.user_id),
                    anchor: o.cursor_anchor,
                    head: o.cursor_head,
                }));
                if (!cancelled && editor.view) {
                    editor.view.dispatch(editor.state.tr.setMeta(remoteCursorsKey, cursors));
                }
            } catch {
                /* network blip — ignore, next tick retries */
            }
        };

        void beat();
        const interval = setInterval(beat, PRESENCE_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
            // Best-effort: drop our presence row when leaving.
            navigator.sendBeacon?.(`/api/documents/${documentId}/presence`);
            void fetch(`/api/documents/${documentId}/presence`, { method: 'DELETE' }).catch(() => {});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, documentId]);

    // ---- Live content sync: pull in others' edits without a manual refresh ----
    useEffect(() => {
        if (!editor) return;
        let cancelled = false;

        const poll = async () => {
            try {
                const res = await fetch(`/api/documents/${documentId}`);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const doc = data.document;
                if (!doc || doc.updated_at === remoteUpdatedAtRef.current) return;

                // Only adopt remote content when we have nothing local at risk:
                // editor is idle (saved). Otherwise keep ours;
                // our pending save will reconcile on the server.
                const safeToApply = saveStatusRef.current === 'saved';
                if (!safeToApply) return;

                applyingRemoteRef.current = true;
                try {
                    const { from, to } = editor.state.selection;
                    editor.commands.setContent(JSON.parse(doc.content_json));
                    const max = editor.state.doc.content.size;
                    editor.commands.setTextSelection({
                        from: Math.min(from, max),
                        to: Math.min(to, max)
                    });
                } catch {
                    /* malformed content — skip */
                } finally {
                    applyingRemoteRef.current = false;
                }

                if (doc.title !== titleRef.current) {
                    setTitle(doc.title);
                    onTitleChange(doc.title);
                }
                remoteUpdatedAtRef.current = doc.updated_at;
            } catch {
                /* ignore */
            }
        };

        const interval = setInterval(poll, CONTENT_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, documentId]);

    const handleManualSave = () => void performSave();

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTitle(val);
        onTitleChange(val || 'Untitled Document');
        if (!isReadOnly) setSaveStatus('unsaved');
    };

    if (!editor) return null;

    return (
        <div className="flex flex-col flex-1 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {/* Header / Title bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    disabled={isReadOnly}
                    placeholder="Untitled Document"
                    aria-label="Document title"
                    className="text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors py-0.5 px-1 max-w-[50%]"
                />

                <div className="flex items-center gap-2">
                    {isReadOnly && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                            Read-only
                        </span>
                    )}
                    {saveStatus === 'saved' && !isReadOnly && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100/50">
                            <CloudCheck className="w-4 h-4" />
                            All changes saved
                        </span>
                    )}
                    {saveStatus === 'unsaved' && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold px-3 py-1 bg-amber-50 rounded-full border border-amber-100/50">
                            <CloudLightning className="w-4 h-4" />
                            Unsaved changes
                        </span>
                    )}
                    {saveStatus === 'saving' && (
                        <span className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100/50">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span
                            title={errorMsg || ''}
                            className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold px-3 py-1 bg-rose-50 rounded-full border border-rose-100/50 cursor-help"
                        >
                            <AlertCircle className="w-4 h-4" />
                            Error saving
                        </span>
                    )}

                    {!isReadOnly && (
                        <button
                            onClick={handleManualSave}
                            disabled={saveStatus === 'saving'}
                            className="p-1.5 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Save now"
                            aria-label="Save now"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Formatting Toolbar */}
            {!isReadOnly && (
                <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-100 bg-white select-none">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Bold (Ctrl+B)"
                        aria-label="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Italic (Ctrl+I)"
                        aria-label="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Underline (Ctrl+U)"
                        aria-label="Underline"
                    >
                        <Underline className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Heading 1"
                        aria-label="Heading 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Heading 2"
                        aria-label="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('paragraph') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Normal Paragraph"
                        aria-label="Normal paragraph"
                    >
                        <Pilcrow className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Bulleted List"
                        aria-label="Bulleted list"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500'}`}
                        title="Numbered List"
                        aria-label="Numbered list"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2" />

                    <button
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Undo"
                        aria-label="Undo"
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Redo"
                        aria-label="Redo"
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Editor Text Area */}
            <div className={`flex-1 p-8 overflow-y-auto min-h-[400px] outline-none ${isReadOnly ? 'bg-slate-50/20' : 'bg-white'}`}>
                <div className="prose prose-slate max-w-none prose-indigo tiptap-editor">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
