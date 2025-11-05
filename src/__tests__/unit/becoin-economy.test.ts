import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { jest } from '@jest/globals';

const originalEnv = process.env.CLAUDE_FLOW_ENV;
type BecoinEconomyCtor = typeof import('../../services/becoin-economy.js').BecoinEconomy;
let BecoinEconomy: BecoinEconomyCtor;

const createTempAgency = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'becoin-economy-'));
  return dir;
};

describe('BecoinEconomy', () => {
  let agencyPath: string;

  beforeAll(async () => {
    process.env.CLAUDE_FLOW_ENV = 'development';
    ({ BecoinEconomy } = await import('../../services/becoin-economy.js'));
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_FLOW_ENV;
    } else {
      process.env.CLAUDE_FLOW_ENV = originalEnv;
    }
  });

  beforeEach(async () => {
    agencyPath = await createTempAgency();
  });

  afterEach(async () => {
    await fs.rm(agencyPath, { recursive: true, force: true });
  });

  it('initializes treasury file with defaults when missing', async () => {
    const manager = new BecoinEconomy({ agencyPath });
    const snapshot = await manager.getSnapshot();

    expect(snapshot.balance).toBe(100000);
    expect(snapshot.startCapital).toBe(100000);
    expect(snapshot.reserved).toBe(0);
    expect(snapshot.availableBalance).toBe(100000);

    const treasuryPath = path.join(agencyPath, 'becoin-economy', 'treasury.json');
    const stored = JSON.parse(await fs.readFile(treasuryPath, 'utf-8'));
    expect(stored.balance).toBe(100000);
  });

  it('reserves budget without exceeding allocation limits', async () => {
    const manager = new BecoinEconomy({ agencyPath });
    const reservation = await manager.reserveBudget(1000, 'automation sprint');

    expect(reservation.amount).toBe(1000);

    const snapshot = await manager.getSnapshot();
    expect(snapshot.reserved).toBe(1000);
    expect(snapshot.availableBalance).toBe(99000);
  });

  it('prevents overspending when reservations saturate funds', async () => {
    const manager = new BecoinEconomy({ agencyPath });

    await manager.reserveBudget(20000, 'initial deployment wave');

    await expect(
      manager.reserveBudget(20000, 'second wave without release')
    ).rejects.toThrow(/exceeds 20% allocation/i);
  });

  it('commits reservation and records expense transaction', async () => {
    const manager = new BecoinEconomy({ agencyPath });
    const reservation = await manager.reserveBudget(2500, 'delivery team onboarding');

    const snapshot = await manager.commitReservation(reservation.id, 2000);
    expect(snapshot.balance).toBe(98000);
    expect(snapshot.reserved).toBe(0);

    const treasuryPath = path.join(agencyPath, 'becoin-economy', 'treasury.json');
    const stored = JSON.parse(await fs.readFile(treasuryPath, 'utf-8'));
    expect(stored.transactions).toHaveLength(1);
    expect(stored.transactions[0].amount).toBe(2000);
  });

  it('records revenue and improves runway', async () => {
    const manager = new BecoinEconomy({ agencyPath });
    await manager.reserveBudget(2000, 'initial investment');
    const before = await manager.getSnapshot();

    const updated = await manager.recordRevenue(5000, 'client retainer');
    expect(updated.balance).toBe(before.balance + 5000);
    expect(updated.availableBalance).toBe(updated.balance - updated.reserved);
  });
});
