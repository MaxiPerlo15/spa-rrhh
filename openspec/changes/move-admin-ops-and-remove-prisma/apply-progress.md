# Apply Progress: Move Admin Operations and Remove Prisma — PR1b Typed Next BFF Session States

## Delivery

- Strategy: feature-branch-chain.
- Work unit: PR1b — typed Spring-session-aware Next BFF/proxy states.
- Boundary: `PR1a-fix → PR1b`; Spring security bridge, Flyway/reconciliation, admin operations, retention, policy, and Prisma are excluded.
- Review budget: 120–180 changed lines. The tracked candidate is 231 additions + deletions including this local progress artifact, remaining below the 400-line limit.
- Rollback: revert this typed BFF/proxy child only.

## Completed Tasks

- [x] PR1a 1.1 RED: session/authorization cases (previous batch)
- [x] PR1a 1.2a GREEN→REFACTOR: permission-authoritative session bridge (previous batch)
- [x] PR1a-fix 1.2b RED→GREEN: configured cookie clearing and logout response propagation (previous batch)
- [x] PR1b 1.3 RED→GREEN→REFACTOR: typed `authorized|anonymous|forbidden|unavailable` Spring BFF/proxy states.

## Corrective Coverage

- The browser-gate test now awaits `proxy()` with an `authorized` session and proves `NextResponse.next`, forwarded `SESSIONID`, generated nonce, and CSP header behavior.
- A generic Spring 502 response now proves the existing non-401/403 failure mapping to `unavailable`.
- No production behavior changed and no later slice was started.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Unit | ✅ 23/23 focused tests before corrective coverage | ✅ Original task RED was recorded in prior apply-progress; corrective tests cover already-green production behavior, so they passed immediately without production edits | ✅ 25/25 focused tests; 433/433 full suite | ✅ Authorized browser pass-through and 502 unavailable add distinct paths to the existing anonymous/403/unavailable coverage | ➖ None needed — test-only corrective retry |

## Verification

- Focused: `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 25/25 passed.
- Full: `npm run test:unit` — 77 files, 433 tests passed.
- Quality: `npm run lint` and `npm run typecheck` — passed.
- `git diff --check` — passed.

## Status

PR1b remains complete: 1/1 assigned task complete. The next child is PR1c and must target PR1b.
