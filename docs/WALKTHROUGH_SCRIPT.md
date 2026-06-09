# Walkthrough Script

Target duration: **5 minutes**

## 0:00 - 0:30 Intro

Hi, I’m Gabriel Ludwig Rivera, and this is **AJAIA Docs**, a focused collaborative document editor built as a take-home product slice.

The goal was not to clone Google Docs. The goal was to deliver a coherent, testable experience with strong end-to-end flows: login, document creation, import, editing, sharing, versioning, comments, and AI assist.

## 0:30 - 1:00 Login and Dashboard

On the login screen, reviewers can sign in instantly using seeded demo profiles.

I’ll log in as **Gabriel Rivera**, the owner user.

That takes us to the dashboard, which separates **My Documents** and **Shared With Me** so ownership and collaboration are immediately clear.

## 1:00 - 1:50 Main User Flow

The main flow is:

1. create or import a document
2. edit it
3. share it
4. collaborate on it
5. use AI assist where helpful

I’ll open a document and show the editor.

Inside the editor:

- rich-text formatting works
- autosave works
- manual save works
- title editing works

When I stop typing, the status returns to **All changes saved**.

## 1:50 - 2:30 What Works End to End

What works end to end:

- seeded authentication
- document CRUD
- import for `.txt` and `.md`
- sharing with ACL enforcement
- comments
- version snapshots and restore
- collaborative presence indicators
- AI Assist actions

The key point is that access control is enforced on the server, not just hidden in the UI.

## 2:30 - 3:15 Sharing and Permissions

As the owner, I can add Maria as an editor.

If I switch to a user without access, the server blocks the document.

If I switch to Maria, the document appears under **Shared With Me**, and Maria can edit and comment because she has editor permissions.

That owner/editor/viewer separation was one of the main product decisions in the project.

## 3:15 - 3:55 AI Assist

On the right side is **AI Assist**.

It supports:

- summarizing the document
- generating action items
- rewriting professionally
- suggesting the next paragraph

One issue I corrected was making sure the AI stays grounded in the actual document. The prompts now explicitly prevent unrelated invented content.

AI output is suggestion-only. It never writes into the document automatically. The user can review it first and then click **Insert at Cursor**.

## 3:55 - 4:25 What I Intentionally Deprioritized

I intentionally deprioritized:

- CRDT-based simultaneous text merging
- PDF export
- full-text search
- paid real-time infrastructure

Instead, I went deeper on the core reviewer journey and permission correctness.

## 4:25 - 4:50 Key Implementation Decisions

A few important implementation decisions:

- **Next.js App Router** for the full-stack surface
- **TipTap** for the editing experience
- **SQLite** for zero-friction local review
- **server-side ACL checks** on every sensitive route
- **Vercel-safe SQLite bootstrap** using `/tmp` plus automatic schema and seed setup

## 4:50 - 5:00 How AI Supported the Workflow

The main AI tools I used were:

- ChatGPT Codex
- Claude Code
- Claude Design
- Gemini Antigravity App
- ChatGPT Image Gen 2 for the logo
- Ollama Cloud for the AI provider
- Playwright for testing
- Vercel for deployment and hosted validation

That’s **AJAIA Docs**.
