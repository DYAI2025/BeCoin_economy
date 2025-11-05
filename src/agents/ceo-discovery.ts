/**
 * CEO Discovery System - Proactive Business Development
 *
 * Analyzes user patterns, identifies pain points, and generates
 * project proposals autonomously using neural pattern recognition.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Logger } from '../core/logger.js';
import { PatternAnalyzer, UserPattern, PainPoint } from '../neural/pattern-analyzer.js';
import { ProposalGenerator, ProjectProposal } from '../neural/proposal-generator.js';
import { ImpactPredictor, ImpactPrediction } from './impact-predictor.js';
import { BecoinEconomy } from '../services/becoin-economy.js';

export interface DiscoveryConfig {
  agencyPath: string;
  analysisWindow: number; // hours
  minConfidence: number;  // 0-1
  budgetRange: { min: number; max: number };
  roiTarget: number;
  autoPropose: boolean;
}

export interface DiscoverySession {
  id: string;
  startTime: Date;
  patterns: UserPattern[];
  painPoints: PainPoint[];
  proposals: ProjectProposal[];
  status: 'analyzing' | 'proposing' | 'negotiating' | 'completed';
}

export interface BecoinTreasury {
  balance: number;
  startCapital: number;
  burnRate: number;
  runway: number;
  reserved: number;
  availableBalance: number;
}

export class CEODiscoverySystem extends EventEmitter {
  private logger: Logger;
  private config: DiscoveryConfig;
  private patternAnalyzer: PatternAnalyzer;
  private proposalGenerator: ProposalGenerator;
  private impactPredictor: ImpactPredictor;
  private treasuryManager: BecoinEconomy;
  private currentSession?: DiscoverySession;

  constructor(config: Partial<DiscoveryConfig> = {}) {
    super();

    this.config = {
      agencyPath: config.agencyPath || 'agency-agents',
      analysisWindow: config.analysisWindow || 168, // 1 week
      minConfidence: config.minConfidence || 0.7,
      budgetRange: config.budgetRange || { min: 100, max: 500 },
      roiTarget: config.roiTarget || 3.0,
      autoPropose: config.autoPropose || false,
    };

    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'CEODiscovery' }
    );

    this.patternAnalyzer = new PatternAnalyzer();
    this.proposalGenerator = new ProposalGenerator();
    this.impactPredictor = new ImpactPredictor();
    this.treasuryManager = new BecoinEconomy({ agencyPath: this.config.agencyPath });
  }

  /**
   * Start proactive discovery session
   */
  async startDiscovery(): Promise<DiscoverySession> {
    this.logger.info('🔍 Starting CEO Discovery Session...');

    const session: DiscoverySession = {
      id: `discovery-${Date.now()}`,
      startTime: new Date(),
      patterns: [],
      painPoints: [],
      proposals: [],
      status: 'analyzing',
    };

    this.currentSession = session;
    this.emit('discovery:started', session);

    try {
      // Phase 1: Analyze user patterns
      session.patterns = await this.analyzeUserPatterns();
      this.logger.info(`📊 Found ${session.patterns.length} patterns`);

      // Phase 2: Identify pain points
      session.painPoints = await this.identifyPainPoints(session.patterns);
      this.logger.info(`💡 Identified ${session.painPoints.length} pain points`);

      // Phase 3: Generate proposals
      session.status = 'proposing';
      session.proposals = await this.generateProposals(session.painPoints);
      this.logger.info(`📋 Generated ${session.proposals.length} proposals`);

      // Phase 4: Predict impact and prioritize
      session.proposals = await this.prioritizeProposals(session.proposals);

      session.status = 'completed';
      this.emit('discovery:completed', session);

      return session;
    } catch (error) {
      this.logger.error('Discovery session failed', error);
      throw error;
    }
  }

  /**
   * Analyze user behavior patterns using neural networks
   */
  private async analyzeUserPatterns(): Promise<UserPattern[]> {
    // Load historical data from memory and logs
    const memoryPath = path.join('.swarm', 'memory.db');
    const logsPath = path.join('.claude-flow', 'logs');

    const patterns = await this.patternAnalyzer.analyze({
      timeWindow: this.config.analysisWindow,
      sources: [memoryPath, logsPath],
      minConfidence: this.config.minConfidence,
    });

    return patterns.filter(p => p.confidence >= this.config.minConfidence);
  }

  /**
   * Identify pain points from patterns
   */
  private async identifyPainPoints(patterns: UserPattern[]): Promise<PainPoint[]> {
    const painPoints: PainPoint[] = [];

    for (const pattern of patterns) {
      // Analyze repetitive tasks
      if (pattern.type === 'repetitive' && pattern.frequency > 5) {
        painPoints.push({
          id: `pain-${Date.now()}-${painPoints.length}`,
          type: 'repetitive_task',
          description: `User repeats "${pattern.action}" ${pattern.frequency}x/week`,
          severity: this.calculateSeverity(pattern),
          timeCost: pattern.timeSpent,
          automationPotential: 0.9,
          relatedPatterns: [pattern.id],
        });
      }

      // Analyze error patterns
      if (pattern.type === 'error' && pattern.frequency > 3) {
        painPoints.push({
          id: `pain-${Date.now()}-${painPoints.length}`,
          type: 'recurring_error',
          description: `Recurring error: ${pattern.action}`,
          severity: 'high',
          timeCost: pattern.timeSpent * 2, // Errors cost more
          automationPotential: 0.85,
          relatedPatterns: [pattern.id],
        });
      }

      // Analyze workflow bottlenecks
      if (pattern.type === 'bottleneck' && pattern.timeSpent > 60) {
        painPoints.push({
          id: `pain-${Date.now()}-${painPoints.length}`,
          type: 'workflow_bottleneck',
          description: `Bottleneck in: ${pattern.action}`,
          severity: 'medium',
          timeCost: pattern.timeSpent,
          automationPotential: 0.75,
          relatedPatterns: [pattern.id],
        });
      }
    }

    return painPoints;
  }

  /**
   * Generate project proposals for pain points
   */
  private async generateProposals(painPoints: PainPoint[]): Promise<ProjectProposal[]> {
    const proposals: ProjectProposal[] = [];
    const treasury = await this.loadTreasury();

    for (const painPoint of painPoints) {
      const proposal = await this.proposalGenerator.generate({
        painPoint,
        budget: this.config.budgetRange,
        targetROI: this.config.roiTarget,
        treasury,
      });

      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * Prioritize proposals using impact prediction
   */
  private async prioritizeProposals(proposals: ProjectProposal[]): Promise<ProjectProposal[]> {
    const predictions: Array<{ proposal: ProjectProposal; prediction: ImpactPrediction }> = [];

    for (const proposal of proposals) {
      const prediction = await this.impactPredictor.predict(proposal);
      predictions.push({ proposal, prediction });
    }

    // Sort by expected ROI
    predictions.sort((a, b) => b.prediction.expectedROI - a.prediction.expectedROI);

    return predictions.map(p => ({
      ...p.proposal,
      predictedImpact: p.prediction,
    }));
  }

  /**
   * Auto-negotiate and present proposals to user
   */
  async presentProposals(session: DiscoverySession): Promise<void> {
    this.logger.info('📢 Presenting proposals to user...');

    const topProposals = session.proposals.slice(0, 3);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 CEO DISCOVERY: Proactive Project Proposals           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    for (let i = 0; i < topProposals.length; i++) {
      const proposal = topProposals[i];
      console.log(`\n📋 Proposal ${i + 1}: ${proposal.title}`);
      console.log(`   ${proposal.description}\n`);
      console.log(`   💰 Investment: ${proposal.cost} Becoins`);
      console.log(`   ⏱️  Timeline: ${proposal.timeline}`);
      console.log(`   📈 Expected ROI: ${proposal.predictedImpact?.expectedROI.toFixed(1)}x`);
      console.log(`   🎯 Impact Score: ${proposal.predictedImpact?.expectedImpact}/100`);
      console.log(`   ⚡ Time Saved: ${proposal.painPoint.timeCost} min/week`);
      console.log(`   🤖 Agent Team: ${proposal.requiredAgents.join(', ')}\n`);
    }

    this.emit('proposals:presented', topProposals);
  }

  /**
   * Load Becoin treasury state
   */
  private async loadTreasury(): Promise<BecoinTreasury> {
    try {
      const snapshot = await this.treasuryManager.getSnapshot();
      return snapshot;
    } catch (error) {
      this.logger.warn('Could not load treasury, using defaults');
      return {
        balance: 100000,
        startCapital: 100000,
        burnRate: 0.25,
        runway: 400000,
        reserved: 0,
        availableBalance: 100000,
      };
    }
  }

  /**
   * Calculate pain point severity
   */
  private calculateSeverity(pattern: UserPattern): 'low' | 'medium' | 'high' | 'critical' {
    const score = pattern.frequency * pattern.timeSpent * pattern.confidence;

    if (score > 1000) return 'critical';
    if (score > 500) return 'high';
    if (score > 200) return 'medium';
    return 'low';
  }

  /**
   * Get current session
   */
  getCurrentSession(): DiscoverySession | undefined {
    return this.currentSession;
  }

  /**
   * Save session to disk
   */
  async saveSession(session: DiscoverySession): Promise<void> {
    const sessionPath = path.join('.claude-flow', 'discovery-sessions', `${session.id}.json`);
    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    this.logger.info(`💾 Session saved: ${sessionPath}`);
  }

  /**
   * Load historical sessions for learning
   */
  async loadHistoricalSessions(): Promise<DiscoverySession[]> {
    const sessionsDir = path.join('.claude-flow', 'discovery-sessions');
    try {
      const files = await fs.readdir(sessionsDir);
      const sessions: DiscoverySession[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(sessionsDir, file), 'utf-8');
          sessions.push(JSON.parse(data));
        }
      }

      return sessions;
    } catch (error) {
      return [];
    }
  }
}
