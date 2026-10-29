# ARY-001 · Readiness probe returns `success: true` together with HTTP 503

| | |
| --- | --- |
| **GitHub title** | Readiness probe returns `success: true` together with HTTP 503 |
| **Category** | Problem |
| **Tier** | Trivial · 100 pts |
| **Issue form** | Wave task · Trivial (100 pts) |
| **Labels** | `complexity: trivial`, `bug`, `good first issue` |
| **Publish in** | Wave 1 |

Each `###` heading below is a field of the issue form. Paste each block into the field with the same name.

### What

When the database or Soroban RPC is down, `GET /api/v1/health/ready` must return an **error envelope** (`success: false`) with HTTP 503, consistent with every other non-2xx response.

### Why

Clients and monitors that branch on `success` treat a degraded service as healthy. Every other failure in the API uses the error envelope, so this one response breaks the contract documented in `API_DOCUMENTATION.md`.

**How this was confirmed:** Probed the compiled app with RPC down: `GET /api/v1/health/ready` → `503 {"success":true,"data":{"status":"degraded",…}}`.

### Current state

`src/modules/health/health.controller.ts:48` sets `res.status(503)` but still returns the report, so `EnvelopeInterceptor` wraps it as `{ success: true, data }`.

**Implementation pointers**
1. Add `SERVICE_UNAVAILABLE` to `ErrorCode` and an `AppError.unavailable(message, details)` factory in `src/common/errors.ts` (status 503).
2. In `HealthController.ready`, when degraded, `throw AppError.unavailable('Service degraded', report)` instead of setting the status. Drop the `@Res` parameter.
3. Keep the healthy path unchanged (`200` + report).
4. Add `test/regressions/ready-envelope.test.ts` from this package; it must pass.
5. Update the readiness example and the error-code table in `API_DOCUMENTATION.md`.

### Acceptance criteria

- [ ] Degraded readiness returns HTTP 503 with `success: false`, `error.code = "SERVICE_UNAVAILABLE"` and the report in `error.details`
- [ ] Healthy readiness is unchanged
- [ ] `test/regressions/ready-envelope.test.ts` passes
- [ ] `API_DOCUMENTATION.md` shows the new 503 body
- [ ] `npm run verify` passes

### How to verify

Add this test as `test/regressions/ready-envelope.test.ts`. It **fails on `main` today** and must pass after your fix. Change it only if a maintainer agrees in this issue.

```ts
// Regression test for ARY-001: fails on main @ v0.1.0, must pass after the fix.
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../../src/modules/health/health.controller';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakeRpc } from '../helpers/fakes';

describe('regression: ready-envelope', () => {
  it('a degraded readiness check is an error envelope (success: false), not success: true', async () => {
    const rpc = new FakeRpc();
    rpc.getHealth = () => Promise.reject(new Error('down'));
    const ctrl = new HealthController({ ping: async () => true } as unknown as PrismaService, rpc);
    const res = { status: vi.fn() };
    await expect(ctrl.ready(res as never)).rejects.toMatchObject({ status: 503 });
  });
});
```

```bash
npx vitest run test/regressions/ready-envelope.test.ts
npm run verify
```

### Files likely touched

- `src/common/errors.ts`
- `src/modules/health/health.controller.ts`
- `API_DOCUMENTATION.md`

### Out of scope

Adding new health checks.

---

## Repository impact

`+` new file · `✎` existing file changed

```text
ary-tech-stellar-core/
├── .github/     (unchanged)
├── docs/        (unchanged)
├── prisma/      (unchanged)
├── scripts/     (unchanged)
├── src/
│   ✎ src/common/errors.ts
│   ✎ src/modules/health/health.controller.ts
├── test/
│   + test/regressions/ready-envelope.test.ts
├── root files
│   ✎ API_DOCUMENTATION.md
```
