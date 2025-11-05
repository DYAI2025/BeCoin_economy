/**
 * CEO Discovery Daemon - Autonomous Background Service
 *
 * Runs CEO Discovery cycles automatically at scheduled intervals,
 * monitors performance, and coordinates with the dashboard UI.
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logger.js';
import { CEODiscoverySystem } from './ceo-discovery.js';
import { ContinuousImprovement } from './continuous-improvement.js';
import { PerformanceAnalytics } from './performance-analytics.js';
import { FeedbackLoop } from './feedback-loop.js';
import type { DiscoverySession } from './ceo-discovery.js';
import type { PerformanceReport } from './performance-analytics.js';

export interface DaemonConfig {
  discoveryInterval: number; // hours between discovery cycles
  optimizationInterval: number; // hours between optimization cycles
  autoStart: boolean;
  autoPropose: boolean;
  budgetRange: { min: number; max: number };
  roiTarget: number;
  minConfidence: number;
  analysisWindow: number;
}

export interface DaemonStatus {
  isRunning: boolean;
  startedAt?: Date;
  lastDiscovery?: Date;
  nextDiscovery?: Date;
  lastOptimization?: Date;
  nextOptimization?: Date;
  totalCycles: number;
  successfulProposals: number;
  averageROI: number;
  currentSession?: DiscoverySession;
}

export class CEODaemon extends EventEmitter {
  private logger: Logger;
  private config: DaemonConfig;
  private isRunning: boolean = false;
  private discoveryTimer?: NodeJS.Timeout;
  private optimizationTimer?: NodeJS.Timeout;
  private ceoSystem: CEODiscoverySystem;
  private continuousImprovement: ContinuousImprovement;
  private performanceAnalytics: PerformanceAnalytics;
  private feedbackLoop: FeedbackLoop;
  private stats: {
    startedAt?: Date;
    lastDiscovery?: Date;
    lastOptimization?: Date;
    totalCycles: number;
    successfulProposals: number;
  };

  constructor(config: Partial<DaemonConfig> = {}) {
    super();

    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'CEODaemon' }
    );

    this.config = {
      discoveryInterval: config.discoveryInterval || 24, // Daily
      optimizationInterval: config.optimizationInterval || 168, // Weekly
      autoStart: config.autoStart ?? true,
      autoPropose: config.autoPropose ?? true,
      budgetRange: config.budgetRange || { min: 100, max: 500 },
      roiTarget: config.roiTarget || 3.0,
      minConfidence: config.minConfidence || 0.7,
      analysisWindow: config.analysisWindow || 168,
    };

    this.ceoSystem = new CEODiscoverySystem({
      budgetRange: this.config.budgetRange,
      roiTarget: this.config.roiTarget,
      minConfidence: this.config.minConfidence,
      analysisWindow: this.config.analysisWindow,
      autoPropose: this.config.autoPropose,
    });

    this.continuousImprovement = new ContinuousImprovement();
    this.performanceAnalytics = new PerformanceAnalytics();
    this.feedbackLoop = new FeedbackLoop();

    this.stats = {
      totalCycles: 0,
      successfulProposals: 0,
    };

    // Forward events to daemon listeners
    this.setupEventForwarding();
  }

  /**
   * Start the autonomous daemon
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('⚠️ Daemon is already running');
      return;
    }

    this.logger.info('🚀 Starting CEO Discovery Daemon...');
    this.isRunning = true;
    this.stats.startedAt = new Date();

    // Emit started event
    this.emit('daemon:started', { startedAt: this.stats.startedAt });

    // Run initial discovery if autoStart is enabled
    if (this.config.autoStart) {
      this.logger.info('🔍 Running initial discovery cycle...');
      await this.runDiscoveryCycle();
    }

    // Schedule recurring discovery cycles
    this.scheduleDiscoveryCycles();

    // Schedule recurring optimization cycles
    this.scheduleOptimizationCycles();

    this.logger.info('✅ CEO Discovery Daemon is now running autonomously');
    this.logger.info(
      `📅 Discovery cycles every ${this.config.discoveryInterval}h`
    );
    this.logger.info(
      `🔧 Optimization cycles every ${this.config.optimizationInterval}h`
    );
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('⚠️ Daemon is not running');
      return;
    }

    this.logger.info('🛑 Stopping CEO Discovery Daemon...');

    // Clear timers
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = undefined;
    }

    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = undefined;
    }

    this.isRunning = false;
    this.emit('daemon:stopped', { stoppedAt: new Date() });

    this.logger.info('✅ CEO Discovery Daemon stopped');
  }

  /**
   * Get daemon status
   */
  async getStatus(): Promise<DaemonStatus> {
    const metrics = await this.feedbackLoop.getLearningMetrics();
    const currentSession = this.ceoSystem.getCurrentSession();

    const nextDiscovery = this.stats.lastDiscovery
      ? new Date(
          this.stats.lastDiscovery.getTime() +
            this.config.discoveryInterval * 60 * 60 * 1000
        )
      : undefined;

    const nextOptimization = this.stats.lastOptimization
      ? new Date(
          this.stats.lastOptimization.getTime() +
            this.config.optimizationInterval * 60 * 60 * 1000
        )
      : undefined;

    return {
      isRunning: this.isRunning,
      startedAt: this.stats.startedAt,
      lastDiscovery: this.stats.lastDiscovery,
      nextDiscovery,
      lastOptimization: this.stats.lastOptimization,
      nextOptimization,
      totalCycles: this.stats.totalCycles,
      successfulProposals: this.stats.successfulProposals,
      averageROI: metrics.averageROI,
      currentSession,
    };
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(): Promise<{
    status: DaemonStatus;
    report: PerformanceReport;
    optimizationStatus: any;
  }> {
    const status = await this.getStatus();
    const report = await this.performanceAnalytics.generateReport(30);
    const optimizationStatus =
      await this.continuousImprovement.getOptimizationStatus();

    return {
      status,
      report,
      optimizationStatus,
    };
  }

  /**
   * Run discovery cycle manually
   */
  async runDiscoveryCycle(): Promise<DiscoverySession> {
    this.logger.info('🔍 Starting discovery cycle...');
    this.emit('cycle:started', { type: 'discovery' });

    try {
      const session = await this.ceoSystem.startDiscovery();

      this.stats.lastDiscovery = new Date();
      this.stats.totalCycles++;
      this.stats.successfulProposals += session.proposals.length;

      this.logger.info(
        `✅ Discovery cycle complete: ${session.proposals.length} proposals generated`
      );

      this.emit('cycle:completed', {
        type: 'discovery',
        session,
        timestamp: this.stats.lastDiscovery,
      });

      return session;
    } catch (error) {
      this.logger.error(
        `❌ Discovery cycle failed: ${error instanceof Error ? error.message : String(error)}`
      );
      this.emit('cycle:failed', {
        type: 'discovery',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Run optimization cycle manually
   */
  async runOptimizationCycle(): Promise<void> {
    this.logger.info('🔧 Starting optimization cycle...');
    this.emit('cycle:started', { type: 'optimization' });

    try {
      const result = await this.continuousImprovement.runOptimizationCycle();

      this.stats.lastOptimization = new Date();

      this.logger.info(
        `✅ Optimization cycle complete: ${result.actionsExecuted} actions, ${result.overallImprovement.toFixed(2)}% improvement`
      );

      this.emit('cycle:completed', {
        type: 'optimization',
        result,
        timestamp: this.stats.lastOptimization,
      });
    } catch (error) {
      this.logger.error(
        `❌ Optimization cycle failed: ${error instanceof Error ? error.message : String(error)}`
      );
      this.emit('cycle:failed', {
        type: 'optimization',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Schedule recurring discovery cycles
   */
  private scheduleDiscoveryCycles(): void {
    const intervalMs = this.config.discoveryInterval * 60 * 60 * 1000;

    this.discoveryTimer = setInterval(async () => {
      try {
        await this.runDiscoveryCycle();
      } catch (error) {
        this.logger.error(
          `❌ Scheduled discovery cycle failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, intervalMs);

    this.logger.info(
      `📅 Discovery cycles scheduled every ${this.config.discoveryInterval}h`
    );
  }

  /**
   * Schedule recurring optimization cycles
   */
  private scheduleOptimizationCycles(): void {
    const intervalMs = this.config.optimizationInterval * 60 * 60 * 1000;

    this.optimizationTimer = setInterval(async () => {
      try {
        await this.runOptimizationCycle();
      } catch (error) {
        this.logger.error(
          `❌ Scheduled optimization cycle failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, intervalMs);

    this.logger.info(
      `🔧 Optimization cycles scheduled every ${this.config.optimizationInterval}h`
    );
  }

  /**
   * Setup event forwarding
   */
  private setupEventForwarding(): void {
    // Forward CEO system events
    this.ceoSystem.on('discovery:started', data =>
      this.emit('discovery:started', data)
    );
    this.ceoSystem.on('discovery:completed', data =>
      this.emit('discovery:completed', data)
    );
    this.ceoSystem.on('proposal:generated', data =>
      this.emit('proposal:generated', data)
    );

    // Forward continuous improvement events
    this.continuousImprovement.on('improvement:executed', data =>
      this.emit('improvement:executed', data)
    );

    // Forward feedback loop events
    this.feedbackLoop.on('feedback:collected', data =>
      this.emit('feedback:collected', data)
    );
    this.feedbackLoop.on('training:completed', data =>
      this.emit('training:completed', data)
    );
  }
}
