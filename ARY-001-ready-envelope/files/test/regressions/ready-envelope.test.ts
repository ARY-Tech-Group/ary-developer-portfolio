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
