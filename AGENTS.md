# Agent Instructions

## Project context

GarduCilik is an educational browser game for teaching children about household electricity, energy use, and electrical safety. The frontend is Next.js/TypeScript with a local TypeScript simulation engine and PWA support. A Go/Fiber/PostgreSQL API supports classroom accounts, scenarios, session submissions, and leaderboards. No C++/WebAssembly source is currently present; keep docs accurate to the checked-in implementation.

## Working rules

- Read `readme.md` and `TODO.md` before starting a task. Check the actual repository state instead of assuming the README's planned files exist.
- Keep changes focused on the active TODO task. Update `TODO.md` when a task is completed or its scope changes.
- Explain electrical behavior as an educational simulation. Do not present simplified calculations as instructions for real-world wiring or electrical safety decisions.
- Preserve Indonesian as the primary language for user-facing project documentation unless a task asks otherwise.
- Do not add dependencies, generated binaries, or unrelated refactors without a clear need for the active task.

## Required task workflow

For every task:

1. Inspect the working tree and identify the files that belong to the task.
2. Implement the task and review the resulting diff.
3. Run relevant checks that already exist in the project. If no checks are configured or runnable, state that clearly; do not invent a passing result.
4. Update `TODO.md` to record completion and the next actionable task.
5. Create a Git commit for the completed task, then push that commit to the configured upstream branch.
6. Immediately continue with the next unchecked task in `TODO.md` and repeat this workflow. Do not stop after one task while unchecked tasks remain, unless blocked by missing prerequisites, credentials, a failed push, or a destructive/irreversible action requiring user input.

Commit and push requirements:

- Make one focused commit per completed task, with a concise message describing the change.
- Before committing, confirm the diff contains only intended task changes; never include unrelated user changes.
- Push only to the repository's configured upstream. Do not force-push, rewrite published history, or change remotes/branches to bypass a failure.
- If this directory is not a Git repository, no upstream is configured, authentication is unavailable, or push fails, do not claim the task was pushed. Finish safe local work, report the exact blocker, and continue with independent local tasks where possible.
- Never commit secrets, local environment files, credentials, or generated artifacts unless explicitly required.

## Completion reporting

At the end of a run, summarize completed tasks, commits and push status, checks performed, and any remaining blocker. Keep `TODO.md` as the source of truth for unfinished work.
