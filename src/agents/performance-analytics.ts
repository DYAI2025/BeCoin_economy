/**
 * Performance Analytics - Track Record & Insights
 *
 * Provides comprehensive analytics about CEO Discovery performance,
 * success rates, trends, and ROI across all projects.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Logger } from '../core/logger.js';
import { FeedbackLoop, type ActualImpact } from './feedback-loop.js';

export interface PerformanceReport {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalProjects: number;
    successRate: number; // % with impact > 70
    averageROI: number;
    totalTimeSaved: number; // minutes per week
    averageSatisfaction: number;
  };
  trends: {
    impactTrend: TrendData[];
    roiTrend: TrendData[];
    satisfactionTrend: TrendData[];
  };
  topPerformers: ActualImpact[];
  underperformers: ActualImpact[];
  insights: string[];
}

export interface TrendData {
  date: string;
  value: number;
}

export interface CategoryPerformance {
  category: string;
  projectCount: number;
  averageImpact: number;
  averageROI: number;
  successRate: number;
}

export class PerformanceAnalytics {
  private logger: Logger;
  private feedbackLoop: FeedbackLoop;

  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'PerformanceAnalytics' }
    );
    this.feedbackLoop = new FeedbackLoop();
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(periodDays: number = 30): Promise<PerformanceReport> {
    this.logger.info(`📊 Generating ${periodDays}-day performance report...`);

    const to = new Date();
    const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const metrics = await this.feedbackLoop.getLearningMetrics();
    const successStories = await this.feedbackLoop.getSuccessStories(10);
    const allFeedback = await this.loadAllFeedbackInPeriod(from, to);

    // Calculate summary
    const totalProjects = allFeedback.length;
    const successfulProjects = allFeedback.filter(
      f => f.actualOverallImpact >= 70
    );
    const successRate =
      totalProjects > 0 ? (successfulProjects.length / totalProjects) * 100 : 0;

    const totalTimeSaved = allFeedback.reduce(
      (sum, f) => sum + (f.actualTimeSavings / 100) * 300, // Convert score to minutes
      0
    );

    // Generate trends
    const trends = {
      impactTrend: this.generateTrendData(allFeedback, 'actualOverallImpact'),
      roiTrend: this.generateTrendData(allFeedback, 'actualROI'),
      satisfactionTrend: this.generateTrendData(allFeedback, 'userSatisfaction'),
    };

    // Find underperformers
    const underperformers = allFeedback
      .filter(
        f => f.actualOverallImpact < 60 || f.userSatisfaction < 60
      )
      .slice(0, 5);

    // Generate insights
    const insights = this.generateInsights(allFeedback, metrics);

    return {
      period: { from, to },
      summary: {
        totalProjects,
        successRate,
        averageROI: metrics.averageROI,
        totalTimeSaved,
        averageSatisfaction: metrics.averageUserSatisfaction,
      },
      trends,
      topPerformers: successStories.slice(0, 5),
      underperformers,
      insights,
    };
  }

  /**
   * Get performance by category
   */
  async getPerformanceByCategory(): Promise<CategoryPerformance[]> {
    const allFeedback = await this.loadAllFeedbackInPeriod(
      new Date(0),
      new Date()
    );

    // Group by pain point type
    const categories = new Map<string, ActualImpact[]>();

    for (const feedback of allFeedback) {
      const proposal = await this.loadProposal(feedback.proposalId);
      if (proposal) {
        const category = proposal.painPoint.type;
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(feedback);
      }
    }

    // Calculate performance for each category
    const performance: CategoryPerformance[] = [];

    for (const [category, feedbacks] of categories.entries()) {
      const avgImpact =
        feedbacks.reduce((sum, f) => sum + f.actualOverallImpact, 0) /
        feedbacks.length;

      const avgROI =
        feedbacks.reduce((sum, f) => sum + f.actualROI, 0) / feedbacks.length;

      const successful = feedbacks.filter(f => f.actualOverallImpact >= 70);
      const successRate = (successful.length / feedbacks.length) * 100;

      performance.push({
        category,
        projectCount: feedbacks.length,
        averageImpact: avgImpact,
        averageROI: avgROI,
        successRate,
      });
    }

    // Sort by success rate
    performance.sort((a, b) => b.successRate - a.successRate);

    return performance;
  }

  /**
   * Get ROI analysis
   */
  async getROIAnalysis(): Promise<{
    totalInvestment: number;
    totalReturn: number;
    netProfit: number;
    overallROI: number;
    byCategory: Record<string, { investment: number; return: number; roi: number }>;
  }> {
    const allFeedback = await this.loadAllFeedbackInPeriod(
      new Date(0),
      new Date()
    );

    let totalInvestment = 0;
    let totalReturn = 0;
    const byCategory: Record<
      string,
      { investment: number; return: number; roi: number }
    > = {};

    for (const feedback of allFeedback) {
      const proposal = await this.loadProposal(feedback.proposalId);
      if (proposal) {
        const investment = feedback.actualCost;
        const returnValue = investment * feedback.actualROI;

        totalInvestment += investment;
        totalReturn += returnValue;

        const category = proposal.painPoint.type;
        if (!byCategory[category]) {
          byCategory[category] = { investment: 0, return: 0, roi: 0 };
        }

        byCategory[category].investment += investment;
        byCategory[category].return += returnValue;
      }
    }

    // Calculate ROI for each category
    for (const category in byCategory) {
      byCategory[category].roi =
        byCategory[category].return / byCategory[category].investment;
    }

    return {
      totalInvestment,
      totalReturn,
      netProfit: totalReturn - totalInvestment,
      overallROI: totalInvestment > 0 ? totalReturn / totalInvestment : 0,
      byCategory,
    };
  }

  /**
   * Get prediction accuracy over time
   */
  async getPredictionAccuracyOverTime(): Promise<TrendData[]> {
    const allFeedback = await this.loadAllFeedbackInPeriod(
      new Date(0),
      new Date()
    );

    const feedbackWithAccuracy = allFeedback.filter(
      f => f.predictionAccuracy !== undefined
    );

    return this.generateTrendData(feedbackWithAccuracy, 'predictionAccuracy');
  }

  /**
   * Generate trend data from feedback
   */
  private generateTrendData(
    feedback: ActualImpact[],
    field: keyof ActualImpact
  ): TrendData[] {
    if (feedback.length === 0) return [];

    // Sort by completion date
    const sorted = [...feedback].sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Group by week
    const weeklyData = new Map<string, number[]>();

    for (const f of sorted) {
      const date = new Date(f.completedAt);
      const weekKey = this.getWeekKey(date);

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }

      weeklyData.get(weekKey)!.push(f[field] as number);
    }

    // Calculate averages
    const trendData: TrendData[] = [];

    for (const [weekKey, values] of weeklyData.entries()) {
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      trendData.push({
        date: weekKey,
        value: average,
      });
    }

    return trendData;
  }

  /**
   * Generate insights from data
   */
  private generateInsights(
    feedback: ActualImpact[],
    metrics: any
  ): string[] {
    const insights: string[] = [];

    if (feedback.length === 0) {
      insights.push('No data available yet. Start using CEO Discovery to generate insights.');
      return insights;
    }

    // Accuracy insights
    if (metrics.averagePredictionAccuracy >= 80) {
      insights.push(
        `🎯 Excellent prediction accuracy at ${metrics.averagePredictionAccuracy.toFixed(1)}%`
      );
    } else if (metrics.averagePredictionAccuracy < 60) {
      insights.push(
        `⚠️ Prediction accuracy needs improvement (${metrics.averagePredictionAccuracy.toFixed(1)}%)`
      );
    }

    // Satisfaction insights
    if (metrics.averageUserSatisfaction >= 85) {
      insights.push(
        `😊 High user satisfaction at ${metrics.averageUserSatisfaction.toFixed(1)}%`
      );
    } else if (metrics.averageUserSatisfaction < 70) {
      insights.push(
        `😐 User satisfaction could be better (${metrics.averageUserSatisfaction.toFixed(1)}%)`
      );
    }

    // Trend insights
    if (metrics.improvementTrend > 0.2) {
      insights.push('📈 Strong improvement trend - system is learning effectively');
    } else if (metrics.improvementTrend < -0.2) {
      insights.push('📉 Declining trend - system needs retraining');
    }

    // ROI insights
    if (metrics.averageROI >= 3.0) {
      insights.push(
        `💰 Excellent ROI at ${metrics.averageROI.toFixed(1)}x return on investment`
      );
    }

    return insights;
  }

  /**
   * Get week key for grouping
   */
  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Load all feedback in period
   */
  private async loadAllFeedbackInPeriod(
    from: Date,
    to: Date
  ): Promise<ActualImpact[]> {
    try {
      const feedbackDir = path.join('.claude-flow', 'feedback');
      await fs.mkdir(feedbackDir, { recursive: true });
      const files = await fs.readdir(feedbackDir);
      const feedbacks: ActualImpact[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(feedbackDir, file),
            'utf-8'
          );
          const feedback = JSON.parse(data);
          feedback.completedAt = new Date(feedback.completedAt);

          if (
            feedback.completedAt >= from &&
            feedback.completedAt <= to
          ) {
            feedbacks.push(feedback);
          }
        }
      }

      return feedbacks;
    } catch (error) {
      return [];
    }
  }

  /**
   * Load proposal by ID
   */
  private async loadProposal(proposalId: string): Promise<any> {
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
            (p: any) => p.id === proposalId
          );
          if (proposal) return proposal;
        }
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }
}
