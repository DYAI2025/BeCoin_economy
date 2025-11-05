/**
 * Proposal Generator - AI-Powered Project Proposals
 *
 * Generates detailed project proposals based on identified pain points,
 * complete with cost estimates, timelines, and agent team composition.
 */

import { Logger } from '../core/logger.js';
import type { PainPoint } from './pattern-analyzer.js';
import type { BecoinTreasury } from '../agents/ceo-discovery.js';

export interface ProjectProposal {
  id: string;
  title: string;
  description: string;
  painPoint: PainPoint;
  cost: number; // Becoins
  timeline: string;
  requiredAgents: string[];
  deliverables: string[];
  successMetrics: string[];
  expectedTimeSavings: number; // minutes per week
  automationLevel: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  predictedImpact?: {
    expectedImpact: number;
    expectedROI: number;
    confidence: number;
  };
}

export interface ProposalConfig {
  painPoint: PainPoint;
  budget: { min: number; max: number };
  targetROI: number;
  treasury: BecoinTreasury;
}

export class ProposalGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'ProposalGenerator' }
    );
  }

  /**
   * Generate project proposal for a pain point
   */
  async generate(config: ProposalConfig): Promise<ProjectProposal | null> {
    const { painPoint, budget, targetROI, treasury } = config;

    // Calculate project cost
    const estimatedCost = this.estimateCost(painPoint);

    // Check if within budget and treasury constraints
    if (estimatedCost < budget.min || estimatedCost > budget.max) {
      this.logger.debug(`Cost ${estimatedCost} outside budget range`);
      return null;
    }

    if (estimatedCost > treasury.balance * 0.2) {
      this.logger.debug('Cost exceeds 20% of treasury balance');
      return null;
    }

    // Select optimal agent team
    const agents = this.selectAgents(painPoint);

    // Generate proposal
    const proposal: ProjectProposal = {
      id: `proposal-${Date.now()}`,
      title: this.generateTitle(painPoint),
      description: this.generateDescription(painPoint),
      painPoint,
      cost: estimatedCost,
      timeline: this.estimateTimeline(painPoint),
      requiredAgents: agents,
      deliverables: this.generateDeliverables(painPoint),
      successMetrics: this.generateSuccessMetrics(painPoint),
      expectedTimeSavings: painPoint.timeCost,
      automationLevel: painPoint.automationPotential,
      riskLevel: this.assessRisk(painPoint, estimatedCost),
    };

    this.logger.info(`📋 Generated proposal: ${proposal.title}`);

    return proposal;
  }

  /**
   * Estimate project cost in Becoins
   */
  private estimateCost(painPoint: PainPoint): number {
    // Base cost factors
    let baseCost = 100; // Minimum project cost

    // Factor in pain point severity
    const severityMultiplier = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0,
    };
    baseCost *= severityMultiplier[painPoint.severity];

    // Factor in automation complexity
    const complexityMultiplier = 2.0 - painPoint.automationPotential;
    baseCost *= complexityMultiplier;

    // Factor in time cost (higher time cost = higher value project)
    baseCost *= 1 + painPoint.timeCost / 300;

    // Add token costs estimate
    const tokenCostEstimate = baseCost * 0.5; // ~50% of cost is tokens

    // Add risk buffer
    const riskBuffer = baseCost * 0.3; // 30% buffer

    // Add profit margin
    const profitMargin = baseCost * 0.4; // 40% margin

    return Math.round(baseCost + tokenCostEstimate + riskBuffer + profitMargin);
  }

  /**
   * Estimate project timeline
   */
  private estimateTimeline(painPoint: PainPoint): string {
    const complexity = 1 / painPoint.automationPotential;

    if (complexity < 1.3) return '3-5 days';
    if (complexity < 1.6) return '1-2 weeks';
    if (complexity < 2.0) return '2-3 weeks';
    return '3-4 weeks';
  }

  /**
   * Select optimal agent team for the project
   */
  private selectAgents(painPoint: PainPoint): string[] {
    const agents: string[] = [];

    // Map pain point types to agent specializations
    const agentMapping: Record<string, string[]> = {
      repetitive_task: [
        'Backend-Architect',
        'DevOps-Automator',
        'Rapid-Prototyper',
      ],
      recurring_error: [
        'Senior-Developer',
        'Reality-Checker',
        'Performance-Benchmarker',
      ],
      workflow_bottleneck: [
        'Workflow-Optimizer',
        'Senior-Project-Manager',
        'Performance-Benchmarker',
      ],
      manual_process: [
        'Backend-Architect',
        'DevOps-Automator',
        'Workflow-Optimizer',
      ],
    };

    const baseAgents = agentMapping[painPoint.type] || ['Rapid-Prototyper'];
    agents.push(...baseAgents.slice(0, 2)); // Max 2 primary agents

    // Add support agents based on severity
    if (painPoint.severity === 'high' || painPoint.severity === 'critical') {
      agents.push('Reality-Checker'); // QA for high-stakes projects
    }

    return agents;
  }

  /**
   * Generate proposal title
   */
  private generateTitle(painPoint: PainPoint): string {
    const titles: Record<string, string> = {
      repetitive_task: 'Task Automation System',
      recurring_error: 'Error Prevention & Recovery System',
      workflow_bottleneck: 'Workflow Optimization Suite',
      manual_process: 'Process Automation Framework',
    };

    return titles[painPoint.type] || 'Custom Solution';
  }

  /**
   * Generate proposal description
   */
  private generateDescription(painPoint: PainPoint): string {
    const descriptions: Record<string, string> = {
      repetitive_task: `Automate the repetitive task identified in your workflow. This solution will handle the task automatically, saving you ${painPoint.timeCost} minutes per week and eliminating manual effort.`,
      recurring_error: `Implement robust error prevention and automatic recovery mechanisms. This will eliminate the recurring errors you're experiencing and provide fail-safe fallbacks.`,
      workflow_bottleneck: `Optimize the workflow bottleneck that's slowing you down. We'll streamline the process, reduce friction, and accelerate your throughput significantly.`,
      manual_process: `Transform your manual process into an automated workflow. This will free up your time, reduce errors, and ensure consistent execution.`,
    };

    return descriptions[painPoint.type] || 'Custom solution tailored to your specific needs.';
  }

  /**
   * Generate deliverables list
   */
  private generateDeliverables(painPoint: PainPoint): string[] {
    const baseDeliverables = [
      'Fully functional implementation',
      'Comprehensive documentation',
      'Testing and validation',
      'Integration guide',
    ];

    // Add specific deliverables based on pain point type
    const specificDeliverables: Record<string, string[]> = {
      repetitive_task: [
        'Automated script/tool',
        'Scheduling configuration',
        'Error handling system',
      ],
      recurring_error: [
        'Error detection system',
        'Automatic recovery mechanisms',
        'Monitoring dashboard',
      ],
      workflow_bottleneck: [
        'Optimized workflow implementation',
        'Performance metrics dashboard',
        'Bottleneck elimination report',
      ],
      manual_process: [
        'Automation framework',
        'Process documentation',
        'Training materials',
      ],
    };

    return [
      ...baseDeliverables,
      ...(specificDeliverables[painPoint.type] || []),
    ];
  }

  /**
   * Generate success metrics
   */
  private generateSuccessMetrics(painPoint: PainPoint): string[] {
    const baseMetrics = [
      `Time savings: ${painPoint.timeCost} min/week`,
      `Automation level: ${Math.round(painPoint.automationPotential * 100)}%`,
    ];

    // Add specific metrics based on pain point type
    const specificMetrics: Record<string, string[]> = {
      repetitive_task: [
        '100% task completion rate',
        'Zero manual intervention required',
        'Error rate < 1%',
      ],
      recurring_error: [
        '90% reduction in errors',
        'Automatic recovery in < 5 seconds',
        'Zero downtime',
      ],
      workflow_bottleneck: [
        '3x throughput improvement',
        '50% reduction in processing time',
        'User satisfaction > 85%',
      ],
      manual_process: [
        '95% time reduction',
        'Consistent results every time',
        'Easy to use interface',
      ],
    };

    return [
      ...baseMetrics,
      ...(specificMetrics[painPoint.type] || []),
    ];
  }

  /**
   * Assess project risk level
   */
  private assessRisk(painPoint: PainPoint, cost: number): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Factor in automation potential (lower = higher risk)
    if (painPoint.automationPotential < 0.6) riskScore += 2;
    else if (painPoint.automationPotential < 0.8) riskScore += 1;

    // Factor in cost (higher = higher risk)
    if (cost > 400) riskScore += 2;
    else if (cost > 250) riskScore += 1;

    // Factor in severity (critical = higher risk if it fails)
    if (painPoint.severity === 'critical') riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }
}
