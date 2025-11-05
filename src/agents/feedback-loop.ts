/**
 * Feedback Loop System - Learning from Actual Impact
 *
 * Collects real impact scores from completed projects and trains
 * the neural networks to improve future predictions.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'events';
import { Logger } from '../core/logger.js';
import type { ProjectProposal } from '../neural/proposal-generator.js';
import type { ImpactPrediction } from './impact-predictor.js';

export interface ActualImpact {
  proposalId: string;
  projectId: string;
  completedAt: Date;

  // Actual scores (0-100)
  actualTimeSavings: number;
  actualProblemSolution: number;
  actualUsability: number;
  actualSustainability: number;
  actualOverallImpact: number;

  // Comparison with predictions
  predictedImpact?: number;
  predictionAccuracy?: number;

  // User feedback
  userSatisfaction: number; // 0-100
  userComments?: string;
  wouldRecommend: boolean;

  // Financial metrics
  actualCost: number;
  actualTimeline: string;
  actualROI: number;
}

export interface LearningMetrics {
  totalProjects: number;
  averagePredictionAccuracy: number;
  averageUserSatisfaction: number;
  averageROI: number;
  improvementTrend: number; // -1 to 1
  confidenceLevel: number; // 0-1
}

export interface TrainingData {
  proposal: ProjectProposal;
  prediction: ImpactPrediction;
  actualImpact: ActualImpact;
  learningWeight: number; // How much to learn from this example
}

export class FeedbackLoop extends EventEmitter {
  private logger: Logger;
  private feedbackDir: string;
  private trainingDir: string;

  constructor() {
    super();
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'FeedbackLoop' }
    );
    this.feedbackDir = path.join('.claude-flow', 'feedback');
    this.trainingDir = path.join('.claude-flow', 'training-data');
  }

  /**
   * Collect feedback for completed project
   */
  async collectFeedback(
    proposalId: string,
    projectId: string,
    feedback: {
      timeSavings: number;
      problemSolution: number;
      usability: number;
      sustainability: number;
      userSatisfaction: number;
      userComments?: string;
      wouldRecommend: boolean;
      actualCost: number;
      actualTimeline: string;
    }
  ): Promise<ActualImpact> {
    this.logger.info(`📝 Collecting feedback for proposal ${proposalId}`);

    // Calculate overall impact
    const actualOverallImpact = Math.round(
      (feedback.timeSavings +
        feedback.problemSolution +
        feedback.usability +
        feedback.sustainability) /
        4
    );

    // Load original proposal and prediction
    const proposal = await this.loadProposal(proposalId);
    const prediction = proposal?.predictedImpact;

    // Calculate prediction accuracy
    let predictionAccuracy = 0;
    if (prediction) {
      const difference = Math.abs(prediction.expectedImpact - actualOverallImpact);
      predictionAccuracy = Math.max(0, 100 - difference);
    }

    // Calculate actual ROI
    const actualROI = this.calculateActualROI(
      feedback.timeSavings,
      feedback.actualCost
    );

    const actualImpact: ActualImpact = {
      proposalId,
      projectId,
      completedAt: new Date(),
      actualTimeSavings: feedback.timeSavings,
      actualProblemSolution: feedback.problemSolution,
      actualUsability: feedback.usability,
      actualSustainability: feedback.sustainability,
      actualOverallImpact,
      predictedImpact: prediction?.expectedImpact,
      predictionAccuracy,
      userSatisfaction: feedback.userSatisfaction,
      userComments: feedback.userComments,
      wouldRecommend: feedback.wouldRecommend,
      actualCost: feedback.actualCost,
      actualTimeline: feedback.actualTimeline,
      actualROI,
    };

    // Save feedback
    await this.saveFeedback(actualImpact);

    // Create training data if we have prediction
    if (proposal && prediction) {
      await this.createTrainingData(proposal, prediction, actualImpact);
    }

    this.emit('feedback:collected', actualImpact);

    return actualImpact;
  }

  /**
   * Get learning metrics
   */
  async getLearningMetrics(): Promise<LearningMetrics> {
    const feedbacks = await this.loadAllFeedback();

    if (feedbacks.length === 0) {
      return {
        totalProjects: 0,
        averagePredictionAccuracy: 0,
        averageUserSatisfaction: 0,
        averageROI: 0,
        improvementTrend: 0,
        confidenceLevel: 0,
      };
    }

    // Calculate averages
    const totalProjects = feedbacks.length;
    const avgAccuracy =
      feedbacks.reduce((sum, f) => sum + (f.predictionAccuracy || 0), 0) /
      totalProjects;
    const avgSatisfaction =
      feedbacks.reduce((sum, f) => sum + f.userSatisfaction, 0) / totalProjects;
    const avgROI =
      feedbacks.reduce((sum, f) => sum + f.actualROI, 0) / totalProjects;

    // Calculate improvement trend (comparing recent vs older)
    const trend = this.calculateImprovementTrend(feedbacks);

    // Calculate confidence based on data volume and accuracy
    const confidence = Math.min(
      1.0,
      (totalProjects / 20) * (avgAccuracy / 100)
    );

    return {
      totalProjects,
      averagePredictionAccuracy: avgAccuracy,
      averageUserSatisfaction: avgSatisfaction,
      averageROI: avgROI,
      improvementTrend: trend,
      confidenceLevel: confidence,
    };
  }

  /**
   * Get training data for neural network
   */
  async getTrainingData(): Promise<TrainingData[]> {
    try {
      await fs.mkdir(this.trainingDir, { recursive: true });
      const files = await fs.readdir(this.trainingDir);
      const trainingData: TrainingData[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.trainingDir, file),
            'utf-8'
          );
          trainingData.push(JSON.parse(data));
        }
      }

      return trainingData;
    } catch (error) {
      return [];
    }
  }

  /**
   * Identify underperforming patterns
   */
  async identifyUnderperformingPatterns(): Promise<{
    patterns: string[];
    recommendations: string[];
  }> {
    const feedbacks = await this.loadAllFeedback();
    const proposals = await Promise.all(
      feedbacks.map(f => this.loadProposal(f.proposalId))
    );

    // Analyze patterns with low satisfaction
    const underperforming = feedbacks.filter(
      f => f.userSatisfaction < 60 || f.actualOverallImpact < 60
    );

    const patterns: Set<string> = new Set();
    const recommendations: string[] = [];

    for (let i = 0; i < underperforming.length; i++) {
      const feedback = underperforming[i];
      const proposal = proposals[i];

      if (proposal) {
        patterns.add(proposal.painPoint.type);

        // Generate recommendations
        if (feedback.actualUsability < 60) {
          recommendations.push(
            `Improve usability for ${proposal.painPoint.type} projects`
          );
        }
        if (feedback.actualTimeSavings < 60) {
          recommendations.push(
            `Better time estimation for ${proposal.painPoint.type}`
          );
        }
        if (feedback.actualROI < feedback.actualOverallImpact / 30) {
          recommendations.push(
            `Reduce costs or increase value for ${proposal.painPoint.type}`
          );
        }
      }
    }

    return {
      patterns: Array.from(patterns),
      recommendations: [...new Set(recommendations)],
    };
  }

  /**
   * Get success stories (high-performing projects)
   */
  async getSuccessStories(limit: number = 5): Promise<ActualImpact[]> {
    const feedbacks = await this.loadAllFeedback();

    // Sort by overall impact and satisfaction
    feedbacks.sort((a, b) => {
      const scoreA = a.actualOverallImpact + a.userSatisfaction;
      const scoreB = b.actualOverallImpact + b.userSatisfaction;
      return scoreB - scoreA;
    });

    return feedbacks.slice(0, limit);
  }

  /**
   * Calculate actual ROI from time savings
   */
  private calculateActualROI(timeSavingsScore: number, actualCost: number): number {
    // Convert score to actual minutes (assuming 0-100 maps to 0-300 min/week)
    const weeklyMinutes = (timeSavingsScore / 100) * 300;
    const monthlyValue = (weeklyMinutes * 4.33) / 60 * 100; // 100 Becoins per hour
    const sixMonthValue = monthlyValue * 6;

    return sixMonthValue / actualCost;
  }

  /**
   * Save feedback to disk
   */
  private async saveFeedback(feedback: ActualImpact): Promise<void> {
    await fs.mkdir(this.feedbackDir, { recursive: true });
    const filename = `feedback-${feedback.proposalId}.json`;
    const filepath = path.join(this.feedbackDir, filename);
    await fs.writeFile(filepath, JSON.stringify(feedback, null, 2));
  }

  /**
   * Load all feedback
   */
  private async loadAllFeedback(): Promise<ActualImpact[]> {
    try {
      await fs.mkdir(this.feedbackDir, { recursive: true });
      const files = await fs.readdir(this.feedbackDir);
      const feedbacks: ActualImpact[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.feedbackDir, file),
            'utf-8'
          );
          const feedback = JSON.parse(data);
          // Convert date strings back to Date objects
          feedback.completedAt = new Date(feedback.completedAt);
          feedbacks.push(feedback);
        }
      }

      return feedbacks;
    } catch (error) {
      return [];
    }
  }

  /**
   * Load original proposal
   */
  private async loadProposal(proposalId: string): Promise<ProjectProposal | null> {
    try {
      const sessionsDir = path.join('.claude-flow', 'discovery-sessions');
      const files = await fs.readdir(sessionsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(sessionsDir, file),
            'utf-8'
          );
          const session = JSON.parse(data);

          const proposal = session.proposals?.find(
            (p: ProjectProposal) => p.id === proposalId
          );
          if (proposal) return proposal;
        }
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }

  /**
   * Create training data for neural network
   */
  private async createTrainingData(
    proposal: ProjectProposal,
    prediction: ImpactPrediction,
    actualImpact: ActualImpact
  ): Promise<void> {
    await fs.mkdir(this.trainingDir, { recursive: true });

    // Calculate learning weight (higher for surprising results)
    const predictionError = Math.abs(
      prediction.expectedImpact - actualImpact.actualOverallImpact
    );
    const learningWeight = Math.min(1.0, predictionError / 50);

    const trainingData: TrainingData = {
      proposal,
      prediction,
      actualImpact,
      learningWeight,
    };

    const filename = `training-${proposal.id}.json`;
    const filepath = path.join(this.trainingDir, filename);
    await fs.writeFile(filepath, JSON.stringify(trainingData, null, 2));

    this.logger.info(
      `💾 Created training data: ${filename} (weight: ${learningWeight.toFixed(2)})`
    );
  }

  /**
   * Calculate improvement trend
   */
  private calculateImprovementTrend(feedbacks: ActualImpact[]): number {
    if (feedbacks.length < 5) return 0;

    // Sort by completion date
    feedbacks.sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Split into old and recent halves
    const midpoint = Math.floor(feedbacks.length / 2);
    const oldFeedbacks = feedbacks.slice(0, midpoint);
    const recentFeedbacks = feedbacks.slice(midpoint);

    // Calculate average accuracy for each half
    const oldAvg =
      oldFeedbacks.reduce((sum, f) => sum + (f.predictionAccuracy || 0), 0) /
      oldFeedbacks.length;
    const recentAvg =
      recentFeedbacks.reduce((sum, f) => sum + (f.predictionAccuracy || 0), 0) /
      recentFeedbacks.length;

    // Return normalized trend (-1 to 1)
    return Math.max(-1, Math.min(1, (recentAvg - oldAvg) / 100));
  }
}
