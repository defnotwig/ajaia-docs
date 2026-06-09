# SUBMISSION.md

Candidate: Gabriel Ludwig Rivera  
Email: ludwigrivera13@gmail.com  
Position: AI-Native Full Stack Developer  
Assignment: Ajaia Collaborative Document Editor

## 0. Submission Links

- **Google Drive Folder**: https://drive.google.com/drive/u/0/folders/1DqpA47PC8CHs1dJruQxh-gv2z2sO12Og
- **Live Product URL**: https://ajaia-docs-chi-puce.vercel.app
- **Walkthrough Video URL**: _TO_BE_FILLED_AFTER_RECORDING_
- **Source Code**: https://github.com/defnotwig/ajaia-docs

## 1. Exactly What Is Included

- source code
- `README.md` with local setup and run instructions
- `docs/ARCHITECTURE.md` architecture note
- `docs/AI_WORKFLOW.md` AI workflow note
- `SUBMISSION.md`
- `WALKTHROUGH_VIDEO_URL.txt`
- `docs/WALKTHROUGH_SCRIPT.md`
- MIT `LICENSE`

## 2. Seeded Review Accounts

No password is required. Reviewers can click into any seeded profile:

1. **Gabriel Rivera** — `gabriel@ajaia.test` (owner)
2. **Maria Santos** — `maria@ajaia.test` (editor)
3. **Alex Cruz** — `alex@ajaia.test` (viewer)

## 3. What Is Working

- seeded profile-based authentication
- document dashboard
- rich-text editing with autosave and manual save
- `.txt` and `.md` import
- server-enforced sharing and ACL logic
- comments
- version snapshots and restore
- collaborative presence indicators
- AI Assist with document-grounded outputs
- Vercel deployment path for reviewer testing

## 4. What Is Incomplete

- **Durable hosted persistence**: the Vercel deployment uses ephemeral SQLite storage in `/tmp` to keep the review environment free and simple. The product works for reviewer testing, but data persistence is not guaranteed across cold starts.

## 5. What I Would Build Next With Another 2-4 Hours

1. Add Playwright end-to-end coverage for multi-user flows
2. Replace ephemeral hosted storage with a managed persistent database
3. Add document search
4. Add PDF export

## 6. Notes for Reviewers

- The project is intentionally scoped.
- The goal was depth in the core document workflow rather than broad feature parity with Google Docs.
- The most important implementation priority was end-to-end product coherence with clear tradeoffs.
