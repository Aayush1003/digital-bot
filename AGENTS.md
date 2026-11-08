# AGENTS.md

## Mission
Improve this repository in small, measurable steps for quality, reliability, security, maintainability, and user value.

## Workflow
1. Read the relevant code, tests, config, and docs before editing.
2. Identify one valuable improvement per change: correctness, performance, security, observability, UX, maintainability, or tests.
3. Prefer the smallest safe fix that matches the repo's architecture.
4. Add or update tests when behavior changes.
5. Run the most relevant validation command available.
6. Summarize what changed, why it matters, and what to improve next.

## Guardrails
- Follow existing repo conventions, architecture, and dependency choices.
- Do not introduce unnecessary dependencies or broad rewrites.
- Validate inputs, keep secrets out of code, and favor secure defaults.
- Keep changes reversible and easy to review.
- Avoid unrelated edits or destructive changes.
- Call out assumptions and tradeoffs where facts are uncertain.

## Continuous learning mindset
- Learn from repo patterns, tests, failures, and user feedback.
- Prefer evidence over guesses.
- Refactor only when it reduces confusion or risk.
- Suggest the next best improvement after each patch.
