/**
 * Neural Network Trainer - Learn from Historical Data
 *
 * Trains neural networks using historical feedback data to improve
 * future predictions and optimize proposal generation.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Logger } from '../core/logger.js';
import type { TrainingData } from '../agents/feedback-loop.js';

export interface NeuralModel {
  id: string;
  type: 'impact_predictor' | 'cost_estimator' | 'agent_selector';
  version: number;
  trainedAt: Date;
  trainingSize: number;
  accuracy: number;
  weights: Record<string, number>;
  metadata: Record<string, any>;
}

export interface TrainingResult {
  modelId: string;
  epochsCompleted: number;
  finalAccuracy: number;
  improvementPercent: number;
  trainingTime: number; // milliseconds
}

export class NeuralTrainer {
  private logger: Logger;
  private modelsDir: string;

  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'NeuralTrainer' }
    );
    this.modelsDir = path.join('.claude-flow', 'neural-models');
  }

  /**
   * Train impact predictor model
   */
  async trainImpactPredictor(
    trainingData: TrainingData[],
    epochs: number = 100
  ): Promise<TrainingResult> {
    this.logger.info(
      `🧠 Training impact predictor with ${trainingData.length} examples...`
    );

    const startTime = Date.now();
    const initialAccuracy = await this.evaluateCurrentModel('impact_predictor');

    // Extract features and labels
    const features = trainingData.map(d => this.extractFeatures(d));
    const labels = trainingData.map(d => d.actualImpact.actualOverallImpact);
    const weights = trainingData.map(d => d.learningWeight);

    // Initialize or load existing weights
    let modelWeights = await this.loadModelWeights('impact_predictor');

    // Training loop (simplified gradient descent)
    const learningRate = 0.01;
    let bestAccuracy = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;

      for (let i = 0; i < features.length; i++) {
        // Forward pass
        const prediction = this.predict(features[i], modelWeights);
        const error = labels[i] - prediction;

        // Backward pass (update weights)
        const adjustmentFactor = learningRate * error * weights[i];
        for (const key in features[i]) {
          modelWeights[key] =
            (modelWeights[key] || 0) + adjustmentFactor * features[i][key];
        }

        totalError += Math.abs(error);
      }

      const accuracy = 100 - (totalError / features.length);
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
      }

      if ((epoch + 1) % 10 === 0) {
        this.logger.debug(`Epoch ${epoch + 1}/${epochs}: Accuracy ${accuracy.toFixed(2)}%`);
      }
    }

    // Save trained model
    const model: NeuralModel = {
      id: `impact-predictor-${Date.now()}`,
      type: 'impact_predictor',
      version: (await this.getLatestModelVersion('impact_predictor')) + 1,
      trainedAt: new Date(),
      trainingSize: trainingData.length,
      accuracy: bestAccuracy,
      weights: modelWeights,
      metadata: {
        epochs,
        learningRate,
        features: Object.keys(modelWeights),
      },
    };

    await this.saveModel(model);

    const trainingTime = Date.now() - startTime;
    const improvement = bestAccuracy - initialAccuracy;

    this.logger.info(
      `✅ Training complete! Accuracy: ${bestAccuracy.toFixed(2)}% (+${improvement.toFixed(2)}%)`
    );

    return {
      modelId: model.id,
      epochsCompleted: epochs,
      finalAccuracy: bestAccuracy,
      improvementPercent: improvement,
      trainingTime,
    };
  }

  /**
   * Train cost estimator model
   */
  async trainCostEstimator(
    trainingData: TrainingData[],
    epochs: number = 100
  ): Promise<TrainingResult> {
    this.logger.info(
      `💰 Training cost estimator with ${trainingData.length} examples...`
    );

    const startTime = Date.now();
    const initialAccuracy = await this.evaluateCurrentModel('cost_estimator');

    // Extract features and labels (actual costs)
    const features = trainingData.map(d => this.extractCostFeatures(d));
    const labels = trainingData.map(d => d.actualImpact.actualCost);
    const weights = trainingData.map(d => d.learningWeight);

    let modelWeights = await this.loadModelWeights('cost_estimator');

    const learningRate = 0.01;
    let bestAccuracy = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;

      for (let i = 0; i < features.length; i++) {
        const prediction = this.predict(features[i], modelWeights);
        const error = labels[i] - prediction;
        const adjustmentFactor = learningRate * error * weights[i];

        for (const key in features[i]) {
          modelWeights[key] =
            (modelWeights[key] || 0) + adjustmentFactor * features[i][key];
        }

        // Cost estimation uses percentage error
        const percentError = Math.abs(error / labels[i]) * 100;
        totalError += percentError;
      }

      const accuracy = 100 - Math.min(100, totalError / features.length);
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
      }
    }

    const model: NeuralModel = {
      id: `cost-estimator-${Date.now()}`,
      type: 'cost_estimator',
      version: (await this.getLatestModelVersion('cost_estimator')) + 1,
      trainedAt: new Date(),
      trainingSize: trainingData.length,
      accuracy: bestAccuracy,
      weights: modelWeights,
      metadata: {
        epochs,
        learningRate,
      },
    };

    await this.saveModel(model);

    const trainingTime = Date.now() - startTime;
    const improvement = bestAccuracy - initialAccuracy;

    this.logger.info(
      `✅ Cost estimator trained! Accuracy: ${bestAccuracy.toFixed(2)}% (+${improvement.toFixed(2)}%)`
    );

    return {
      modelId: model.id,
      epochsCompleted: epochs,
      finalAccuracy: bestAccuracy,
      improvementPercent: improvement,
      trainingTime,
    };
  }

  /**
   * Get latest trained model
   */
  async getLatestModel(type: NeuralModel['type']): Promise<NeuralModel | null> {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      const files = await fs.readdir(this.modelsDir);
      const models: NeuralModel[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.modelsDir, file),
            'utf-8'
          );
          const model = JSON.parse(data);
          if (model.type === type) {
            models.push(model);
          }
        }
      }

      if (models.length === 0) return null;

      // Sort by version (descending)
      models.sort((a, b) => b.version - a.version);

      return models[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract features for training
   */
  private extractFeatures(data: TrainingData): Record<string, number> {
    const { proposal, prediction } = data;

    return {
      // Pain point features
      severity_low: proposal.painPoint.severity === 'low' ? 1 : 0,
      severity_medium: proposal.painPoint.severity === 'medium' ? 1 : 0,
      severity_high: proposal.painPoint.severity === 'high' ? 1 : 0,
      severity_critical: proposal.painPoint.severity === 'critical' ? 1 : 0,

      time_cost: proposal.painPoint.timeCost / 100, // Normalize
      automation_potential: proposal.painPoint.automationPotential,

      // Proposal features
      cost: proposal.cost / 1000, // Normalize
      agent_count: proposal.requiredAgents.length,
      risk_low: proposal.riskLevel === 'low' ? 1 : 0,
      risk_medium: proposal.riskLevel === 'medium' ? 1 : 0,
      risk_high: proposal.riskLevel === 'high' ? 1 : 0,

      // Expected values
      expected_savings: proposal.expectedTimeSavings / 100,
      automation_level: proposal.automationLevel,

      // Prediction features
      predicted_impact: (prediction?.expectedImpact || 0) / 100,
      predicted_roi: (prediction?.expectedROI || 0) / 10,
      confidence: prediction?.confidence || 0.5,
    };
  }

  /**
   * Extract cost-specific features
   */
  private extractCostFeatures(data: TrainingData): Record<string, number> {
    const { proposal } = data;

    return {
      severity_multiplier: {
        low: 1.0,
        medium: 1.5,
        high: 2.0,
        critical: 3.0,
      }[proposal.painPoint.severity],

      complexity: 2.0 - proposal.painPoint.automationPotential,
      time_factor: 1 + proposal.painPoint.timeCost / 300,
      agent_count: proposal.requiredAgents.length,
      risk_factor: {
        low: 1.0,
        medium: 1.2,
        high: 1.5,
      }[proposal.riskLevel],
    };
  }

  /**
   * Make prediction with model weights
   */
  private predict(
    features: Record<string, number>,
    weights: Record<string, number>
  ): number {
    let prediction = 0;

    for (const key in features) {
      prediction += features[key] * (weights[key] || 0);
    }

    // Normalize to 0-100 range
    return Math.max(0, Math.min(100, prediction * 50 + 50));
  }

  /**
   * Load model weights
   */
  private async loadModelWeights(
    type: NeuralModel['type']
  ): Promise<Record<string, number>> {
    const model = await this.getLatestModel(type);
    return model?.weights || {};
  }

  /**
   * Save trained model
   */
  private async saveModel(model: NeuralModel): Promise<void> {
    await fs.mkdir(this.modelsDir, { recursive: true });
    const filename = `${model.type}-v${model.version}.json`;
    const filepath = path.join(this.modelsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(model, null, 2));
    this.logger.info(`💾 Saved model: ${filename}`);
  }

  /**
   * Get latest model version
   */
  private async getLatestModelVersion(type: NeuralModel['type']): Promise<number> {
    const model = await this.getLatestModel(type);
    return model?.version || 0;
  }

  /**
   * Evaluate current model accuracy
   */
  private async evaluateCurrentModel(type: NeuralModel['type']): Promise<number> {
    const model = await this.getLatestModel(type);
    return model?.accuracy || 0;
  }
}
