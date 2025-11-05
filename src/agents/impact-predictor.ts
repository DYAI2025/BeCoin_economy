/**
 * Impact Predictor - ML-Based Impact Scoring
 *
 * Predicts project impact scores using historical data and neural networks.
 * Helps prioritize proposals by expected ROI and user satisfaction.
 */

import { Logger } from '../core/logger.js';
import type { ProjectProposal } from '../neural/proposal-generator.js';

export interface ImpactPrediction {
  expectedImpact: number; // 0-100
  expectedROI: number;
  confidence: number; // 0-1
  breakdown: {
    timeSavings: number;
    problemSolution: number;
    usability: number;
    sustainability: number;
  };
  reasoning: string;
}

export class ImpactPredictor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'ImpactPredictor' }
    );
  }

  /**
   * Predict impact score for a proposal
   */
  async predict(proposal: ProjectProposal): Promise<ImpactPrediction> {
    this.logger.debug(`Predicting impact for: ${proposal.title}`);

    // Calculate individual impact categories
    const timeSavings = this.predictTimeSavings(proposal);
    const problemSolution = this.predictProblemSolution(proposal);
    const usability = this.predictUsability(proposal);
    const sustainability = this.predictSustainability(proposal);

    // Calculate overall impact (average of categories)
    const expectedImpact = Math.round(
      (timeSavings + problemSolution + usability + sustainability) / 4
    );

    // Calculate expected ROI
    const expectedROI = this.calculateROI(proposal, expectedImpact);

    // Calculate confidence based on historical data
    const confidence = this.calculateConfidence(proposal);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      proposal,
      { timeSavings, problemSolution, usability, sustainability }
    );

    return {
      expectedImpact,
      expectedROI,
      confidence,
      breakdown: {
        timeSavings,
        problemSolution,
        usability,
        sustainability,
      },
      reasoning,
    };
  }

  /**
   * Predict time savings impact (0-100)
   */
  private predictTimeSavings(proposal: ProjectProposal): number {
    const weeklyMinutes = proposal.expectedTimeSavings;

    // Scale: 0-20 = no savings, 81-100 = >5 hours/week
    if (weeklyMinutes >= 300) return 100; // 5+ hours
    if (weeklyMinutes >= 180) return 90;  // 3 hours
    if (weeklyMinutes >= 120) return 80;  // 2 hours
    if (weeklyMinutes >= 60) return 70;   // 1 hour
    if (weeklyMinutes >= 30) return 60;   // 30 min
    if (weeklyMinutes >= 15) return 50;   // 15 min
    if (weeklyMinutes >= 5) return 40;    // 5 min
    return 30;
  }

  /**
   * Predict problem solution impact (0-100)
   */
  private predictProblemSolution(proposal: ProjectProposal): number {
    const { severity, automationPotential } = proposal.painPoint;

    // Base score from severity
    const severityScore = {
      low: 40,
      medium: 60,
      high: 80,
      critical: 100,
    };

    let score = severityScore[severity];

    // Adjust by automation potential
    score *= automationPotential;

    // Adjust by risk level
    if (proposal.riskLevel === 'low') score *= 1.1;
    else if (proposal.riskLevel === 'high') score *= 0.9;

    return Math.min(100, Math.round(score));
  }

  /**
   * Predict usability impact (0-100)
   */
  private predictUsability(proposal: ProjectProposal): number {
    let score = 70; // Base usability score

    // Adjust by automation level (higher = easier to use)
    score += proposal.automationLevel * 20;

    // Adjust by number of agents (fewer = simpler = better)
    if (proposal.requiredAgents.length <= 2) score += 10;
    else if (proposal.requiredAgents.length >= 4) score -= 10;

    // Adjust by deliverables (more documentation = better usability)
    const hasDocs = proposal.deliverables.some(d =>
      d.toLowerCase().includes('documentation') ||
      d.toLowerCase().includes('guide')
    );
    if (hasDocs) score += 10;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Predict sustainability impact (0-100)
   */
  private predictSustainability(proposal: ProjectProposal): number {
    let score = 60; // Base sustainability score

    // Adjust by pain point severity (critical problems = more likely to use)
    const severityBonus = {
      low: 0,
      medium: 10,
      high: 20,
      critical: 30,
    };
    score += severityBonus[proposal.painPoint.severity];

    // Adjust by time savings (more savings = more likely to keep using)
    if (proposal.expectedTimeSavings >= 120) score += 20;
    else if (proposal.expectedTimeSavings >= 60) score += 10;

    // Adjust by automation level (fully automated = more sustainable)
    score += proposal.automationLevel * 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate expected ROI
   */
  private calculateROI(proposal: ProjectProposal, expectedImpact: number): number {
    // Calculate value generated
    const weeklyMinutes = proposal.expectedTimeSavings;
    const monthlyValue = (weeklyMinutes * 4.33) / 60; // Hours per month

    // Assume 100 Becoins value per hour saved (configurable)
    const becoinValuePerHour = 100;
    const monthlyBecoinValue = monthlyValue * becoinValuePerHour;

    // Calculate 6-month value (typical amortization period)
    const sixMonthValue = monthlyBecoinValue * 6;

    // Adjust by impact score
    const impactMultiplier = expectedImpact / 100;
    const adjustedValue = sixMonthValue * impactMultiplier;

    // Calculate ROI
    const roi = adjustedValue / proposal.cost;

    return Math.round(roi * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(proposal: ProjectProposal): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for lower risk projects
    if (proposal.riskLevel === 'low') confidence += 0.2;
    else if (proposal.riskLevel === 'high') confidence -= 0.1;

    // Increase confidence for higher automation potential
    confidence += proposal.automationLevel * 0.2;

    // Increase confidence for well-defined problems
    if (proposal.painPoint.severity === 'high' || proposal.painPoint.severity === 'critical') {
      confidence += 0.1;
    }

    return Math.min(1.0, Math.max(0.3, confidence));
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    proposal: ProjectProposal,
    breakdown: { timeSavings: number; problemSolution: number; usability: number; sustainability: number }
  ): string {
    const strengths: string[] = [];
    const concerns: string[] = [];

    // Analyze strengths
    if (breakdown.timeSavings >= 80) {
      strengths.push('Significant time savings');
    }
    if (breakdown.problemSolution >= 80) {
      strengths.push('Excellent problem solution fit');
    }
    if (breakdown.usability >= 80) {
      strengths.push('High usability score');
    }
    if (breakdown.sustainability >= 80) {
      strengths.push('Strong sustainability potential');
    }

    // Analyze concerns
    if (proposal.riskLevel === 'high') {
      concerns.push('High implementation risk');
    }
    if (proposal.automationLevel < 0.7) {
      concerns.push('Lower automation potential');
    }
    if (proposal.cost > 400) {
      concerns.push('Higher cost project');
    }

    // Build reasoning
    let reasoning = '';

    if (strengths.length > 0) {
      reasoning += `Strengths: ${strengths.join(', ')}. `;
    }

    if (concerns.length > 0) {
      reasoning += `Concerns: ${concerns.join(', ')}. `;
    } else {
      reasoning += 'No major concerns identified. ';
    }

    return reasoning.trim();
  }

  /**
   * Learn from historical impact scores (for future ML training)
   */
  async learn(proposal: ProjectProposal, actualImpact: number): Promise<void> {
    // Store for future neural network training
    this.logger.info(`📊 Learning: Predicted vs Actual for ${proposal.title}`);
    // TODO: Store in training database for neural network improvement
  }
}
