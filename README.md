# Lipid Clinical Companion
Next.js 14 (App Router, TypeScript) clinical decision-support app for lipid disorders. Deploy: push to GitHub, import in Vercel. `npm install && npm test && npm run build`.
Optional `ANTHROPIC_API_KEY` (server-side only, `/api/ask`). Without it, search and cited retrieval still work; calculators, FH score, planner and report need no AI.
Privacy: no patient data is sent to a server by the UI; follow-up data lives in browser localStorage with explicit save/delete. Nothing is logged. Do not enter identifiers. The textbook PDF is NOT bundled or exposed; only original-wording summaries with page refs (src/data/knowledge.json).
Layout: `src/lib` deterministic rules (units, ldl, fh, targets, flags, treatment, search) · `src/data` versioned evidence (sources, knowledge, trials, pathways, brands) · `tests`.
Evidence-update workflow: edit data/rules in a PR, bump `RULES_VERSION` and `EVIDENCE_CHECKED` in `src/lib/targets.ts`, require clinician reviewer sign-off, record in git history. No automatic update service exists.
## Deploy
Vercel: framework Next.js, no build overrides; set ANTHROPIC_API_KEY (optional) as an encrypted env var.
