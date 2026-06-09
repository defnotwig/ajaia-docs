// components/RemoteCursors.ts
//
// A TipTap/ProseMirror extension that renders other collaborators' carets and
// selections as decorations. The component feeds it the latest remote cursor
// list (from presence polling) via a transaction meta; the plugin remaps the
// decorations across local edits so they stay anchored to the right positions.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface RemoteCursorData {
    userId: string;
    name: string;
    color: string;
    anchor: number;
    head: number;
}

export const remoteCursorsKey = new PluginKey<DecorationSet>('remoteCursors');

// Stable, pleasant color per user id (deterministic so avatars + carets match).
const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
export function colorForUser(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
}

function hexToRgba(hex: string, alpha: number): string {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(pos: number, max: number): number {
    if (Number.isNaN(pos)) return 0;
    return Math.max(0, Math.min(pos, max));
}

function buildCaret(name: string, color: string): HTMLElement {
    const caret = document.createElement('span');
    caret.className = 'remote-cursor';
    caret.style.borderColor = color;

    const label = document.createElement('span');
    label.className = 'remote-cursor-label';
    label.style.backgroundColor = color;
    label.textContent = name;
    caret.appendChild(label);
    return caret;
}

function buildDecorations(doc: PMNode, cursors: RemoteCursorData[]): DecorationSet {
    const max = doc.content.size;
    const decorations: Decoration[] = [];

    for (const c of cursors) {
        const anchor = clamp(c.anchor, max);
        const head = clamp(c.head, max);
        const from = Math.min(anchor, head);
        const to = Math.max(anchor, head);

        if (to > from) {
            decorations.push(
                Decoration.inline(from, to, {
                    class: 'remote-selection',
                    style: `background-color: ${hexToRgba(c.color, 0.18)};`,
                })
            );
        }

        decorations.push(
            Decoration.widget(head, () => buildCaret(c.name, c.color), {
                side: 1,
                key: `remote-cursor-${c.userId}`,
            })
        );
    }

    return DecorationSet.create(doc, decorations);
}

export const RemoteCursors = Extension.create({
    name: 'remoteCursors',

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: remoteCursorsKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply(tr, old) {
                        const meta = tr.getMeta(remoteCursorsKey) as RemoteCursorData[] | undefined;
                        if (meta) {
                            return buildDecorations(tr.doc, meta);
                        }
                        // Keep existing remote cursors anchored across local edits.
                        return old.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return remoteCursorsKey.getState(state);
                    },
                },
            }),
        ];
    },
});
