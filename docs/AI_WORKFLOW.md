# AI Workflow Note

## AI Tools Used

- **ChatGPT Codex** — implementation, debugging, testing, documentation, and deployment support
- **Claude Code** — code review and production-hardening passes
- **Claude Design** — UI critique and visual refinement
- **Gemini Antigravity App** — earlier implementation support
- **ChatGPT Image Gen 2** — logo generation
- **Ollama Cloud** — active AI Assist provider
- **Playwright** — flow verification
- **Vercel** — deployment and hosted validation

## How AI Helped Materially

1. **Implementation speed**
   - accelerating scaffolding and iteration in the Next.js codebase
   - speeding up UI refinement and component cleanup

2. **Product quality**
   - pressure-testing the permission model
   - improving the AI Assist UX and prompt discipline
   - tightening the reviewer flow

3. **Delivery**
   - shaping the architecture and submission notes
   - organizing the walkthrough narrative
   - assisting with deployment verification

## What I Corrected or Rejected

- **Ungrounded AI outputs**: prompts were tightened so AI suggestions stay tied to the active document.
- **Browser-native dialogs**: native confirm dialogs were replaced with in-app confirmation UX.
- **Local-only persistence assumptions**: Vercel deployment was adjusted to bootstrap SQLite in `/tmp` for reviewer use.

## Verification

- `npm run test`
- `npm run build`
- local interaction checks
- hosted deployment checks

## Engineering Standard

AI was used as an accelerator. Final technical decisions, tradeoffs, and validation remained manual.
