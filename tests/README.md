# Tests — Crush and Confo

## Run

```bash
npm test            # Vitest unit tests (from the repo root)
npx vitest run --config tests/vitest.config.ts
```

Playwright smoke test (needs the web dev server running first):

```bash
npm run dev   # in another terminal — starts Vite (Agent A)
PLAYWRIGHT_RUN_SMOKE=1 npx playwright test --config tests/playwright.config.ts
```

The smoke test is skipped unless `PLAYWRIGHT_RUN_SMOKE=1` is set, so CI never
fails just because the dev server is not running. Install the browser once with
`npx playwright install chromium`.

## What is tested — against the REAL modules

- `matching.test.ts` imports `computeMatchScore`, `ageFromDob` and `SCORE_NOTE`
  from `apps/worker/src/matching/score.ts` (Agent B). Weights: shared interests
  10 pts each (max 40), same city 25 / same country 12, age proximity 20 / 15 /
  8 / 0 by band (≤2y / ≤5y / ≤10y / more), same intention 15; total max 100.
  The score is labelled "not scientifically validated" in the UI and in
  `docs/API.md`.
- `validation.test.ts` imports the real Zod schemas from
  `packages/validation/src/index.ts` (Agent B): registration (valid email,
  username rules, password ≥ 8 chars, 18+ from DOB including the birthday edge
  case), confession (1–2000 chars), post (1–2000 chars), comment (1–1000),
  like types. Self-like prevention is enforced in the worker route, not in a
  schema — see the note at the end of `validation.test.ts`.

## History note

When these tests were first written, `packages/shared/src/` and
`packages/validation/src/` were empty, so Agent C wrote small dependency-free
copies of the rules in `tests/matching.ts` / `tests/validation.ts` to get the
suite running. Once Agent B landed the real modules (2026-11-27), the tests
were re-pointed at the real code and the local copies were deleted. Two real
differences from the first draft are recorded in `validation.test.ts`: the real
password rule is length ≥ 8 only (no letter+number requirement), and the real
confession limit is 2000 chars, not 1000.
