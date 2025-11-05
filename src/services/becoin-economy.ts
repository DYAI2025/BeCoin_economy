import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { nanoid } from 'nanoid';
import { Logger } from '../core/logger.js';
import type { BecoinTreasury } from '../agents/ceo-discovery.js';

export interface TreasuryReservation {
  id: string;
  amount: number;
  reason: string;
  status: 'reserved' | 'committed' | 'cancelled';
  createdAt: string;
  committedAt?: string;
  actualCost?: number;
}

export interface TreasuryTransaction {
  id: string;
  type: 'expense' | 'revenue';
  amount: number;
  description: string;
  createdAt: string;
  reservationId?: string;
}

interface TreasuryFile {
  balance: number;
  startCapital: number;
  metrics: {
    burnRate: number;
    runway: number;
  };
  reservations: TreasuryReservation[];
  transactions: TreasuryTransaction[];
}

interface BecoinEconomyOptions {
  agencyPath?: string;
  fileName?: string;
}

export interface TreasurySnapshot extends BecoinTreasury {
  reserved: number;
  availableBalance: number;
}

export class BecoinEconomy {
  private readonly filePath: string;
  private readonly logger: Logger;

  constructor(options: BecoinEconomyOptions = {}) {
    const agencyPath = options.agencyPath ?? 'agency-agents';
    const fileName = options.fileName ?? 'treasury.json';
    this.filePath = path.join(agencyPath, 'becoin-economy', fileName);

    this.logger = new Logger(
      { level: 'info', destination: 'console', format: 'text' },
      { component: 'BecoinEconomy' }
    );
  }

  async getSnapshot(): Promise<TreasurySnapshot> {
    const data = await this.loadTreasuryFile();
    const reserved = data.reservations
      .filter(r => r.status === 'reserved')
      .reduce((sum, r) => sum + r.amount, 0);

    const availableBalance = Math.max(0, data.balance - reserved);
    const runway = this.calculateRunway(data.balance, data.metrics.burnRate);

    return {
      balance: data.balance,
      startCapital: data.startCapital,
      burnRate: data.metrics.burnRate,
      runway,
      reserved,
      availableBalance,
    };
  }

  async reserveBudget(amount: number, reason: string): Promise<TreasuryReservation> {
    if (amount <= 0) {
      throw new Error('Reservation amount must be greater than zero');
    }

    const data = await this.loadTreasuryFile();
    const reserved = data.reservations
      .filter(r => r.status === 'reserved')
      .reduce((sum, r) => sum + r.amount, 0);
    const available = Math.max(0, data.balance - reserved);

    if (amount > available) {
      throw new Error('Insufficient available balance in Becoin treasury');
    }

    const maxAllocation = available * 0.2;
    if (amount > maxAllocation && available > 0) {
      throw new Error(
        `Requested amount ${amount} exceeds 20% allocation (${maxAllocation.toFixed(2)})`
      );
    }

    const reservation: TreasuryReservation = {
      id: nanoid(12),
      amount,
      reason,
      status: 'reserved',
      createdAt: new Date().toISOString(),
    };

    data.reservations.push(reservation);
    await this.saveTreasuryFile(data);

    this.logger.info(
      `Reserved ${amount} Becoins for ${reason} (reservation ${reservation.id})`
    );

    return reservation;
  }

  async commitReservation(
    reservationId: string,
    actualCost?: number
  ): Promise<TreasurySnapshot> {
    const data = await this.loadTreasuryFile();
    const reservation = data.reservations.find(
      r => r.id === reservationId && r.status === 'reserved'
    );

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found or already processed`);
    }

    const cost = actualCost ?? reservation.amount;
    if (cost > data.balance) {
      throw new Error('Insufficient treasury balance to commit reservation');
    }

    reservation.status = 'committed';
    reservation.committedAt = new Date().toISOString();
    reservation.actualCost = cost;

    data.balance = Math.max(0, data.balance - cost);
    data.metrics.runway = this.calculateRunway(data.balance, data.metrics.burnRate);

    data.transactions.push({
      id: nanoid(12),
      type: 'expense',
      amount: cost,
      description: reservation.reason,
      createdAt: new Date().toISOString(),
      reservationId,
    });

    await this.saveTreasuryFile(data);

    this.logger.info(
      `Committed reservation ${reservationId} for ${cost} Becoins (remaining balance ${data.balance})`
    );

    return this.getSnapshot();
  }

  async cancelReservation(reservationId: string): Promise<TreasurySnapshot> {
    const data = await this.loadTreasuryFile();
    const reservation = data.reservations.find(
      r => r.id === reservationId && r.status === 'reserved'
    );

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found or already processed`);
    }

    reservation.status = 'cancelled';
    reservation.committedAt = new Date().toISOString();
    reservation.actualCost = 0;

    await this.saveTreasuryFile(data);

    this.logger.info(`Cancelled reservation ${reservationId}`);

    return this.getSnapshot();
  }

  async recordRevenue(amount: number, description: string): Promise<TreasurySnapshot> {
    if (amount <= 0) {
      throw new Error('Revenue amount must be greater than zero');
    }

    const data = await this.loadTreasuryFile();

    data.balance += amount;
    data.metrics.runway = this.calculateRunway(data.balance, data.metrics.burnRate);

    data.transactions.push({
      id: nanoid(12),
      type: 'revenue',
      amount,
      description,
      createdAt: new Date().toISOString(),
    });

    await this.saveTreasuryFile(data);

    this.logger.info(`Recorded revenue of ${amount} Becoins (${description})`);

    return this.getSnapshot();
  }

  private async loadTreasuryFile(): Promise<TreasuryFile> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.hydrateTreasury(parsed);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      const defaults: TreasuryFile = {
        balance: 100000,
        startCapital: 100000,
        metrics: {
          burnRate: 250,
          runway: 400,
        },
        reservations: [],
        transactions: [],
      };

      await this.saveTreasuryFile(defaults);
      return defaults;
    }
  }

  private async saveTreasuryFile(data: TreasuryFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  private hydrateTreasury(data: TreasuryFile): TreasuryFile {
    return {
      balance: data.balance ?? 100000,
      startCapital: data.startCapital ?? data.balance ?? 100000,
      metrics: {
        burnRate: data.metrics?.burnRate ?? 250,
        runway: this.calculateRunway(
          data.balance ?? 100000,
          data.metrics?.burnRate ?? 250
        ),
      },
      reservations: Array.isArray(data.reservations) ? data.reservations : [],
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
    };
  }

  private calculateRunway(balance: number, burnRate: number): number {
    if (!burnRate || burnRate <= 0) {
      return Infinity;
    }

    return Math.round((balance / burnRate) * 100) / 100;
  }
}
