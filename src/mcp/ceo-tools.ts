/**
 * CEO Discovery MCP Tools
 *
 * MCP tools for proactive business development and autonomous project discovery.
 */

import { CEODiscoverySystem } from '../agents/ceo-discovery.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get MCP tools for CEO Discovery
 */
export function getCEODiscoveryTools(): Tool[] {
  return [
    {
      name: 'ceo_discovery_start',
      description:
        'Start proactive CEO discovery session to analyze user patterns and generate project proposals',
      inputSchema: {
        type: 'object',
        properties: {
          analysisWindow: {
            type: 'number',
            description: 'Analysis time window in hours (default: 168 = 1 week)',
            default: 168,
          },
          minConfidence: {
            type: 'number',
            description: 'Minimum pattern confidence threshold (0-1)',
            default: 0.7,
          },
          budgetMin: {
            type: 'number',
            description: 'Minimum project budget in Becoins',
            default: 100,
          },
          budgetMax: {
            type: 'number',
            description: 'Maximum project budget in Becoins',
            default: 500,
          },
          roiTarget: {
            type: 'number',
            description: 'Target ROI multiplier (e.g., 3.0 = 3x return)',
            default: 3.0,
          },
          autoPropose: {
            type: 'boolean',
            description: 'Automatically present proposals without confirmation',
            default: false,
          },
        },
      },
      handler: async (args: any) => {
        const ceoSystem = new CEODiscoverySystem({
          analysisWindow: args.analysisWindow || 168,
          minConfidence: args.minConfidence || 0.7,
          budgetRange: {
            min: args.budgetMin || 100,
            max: args.budgetMax || 500,
          },
          roiTarget: args.roiTarget || 3.0,
          autoPropose: args.autoPropose || false,
        });

        const session = await ceoSystem.startDiscovery();

        // Present proposals if enabled
        if (args.autoPropose) {
          await ceoSystem.presentProposals(session);
        }

        // Save session
        await ceoSystem.saveSession(session);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId: session.id,
                  status: session.status,
                  patternsFound: session.patterns.length,
                  painPointsIdentified: session.painPoints.length,
                  proposalsGenerated: session.proposals.length,
                  topProposals: session.proposals.slice(0, 3).map(p => ({
                    title: p.title,
                    cost: p.cost,
                    roi: p.predictedImpact?.expectedROI,
                    impact: p.predictedImpact?.expectedImpact,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_discovery_status',
      description: 'Get current CEO discovery session status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const ceoSystem = new CEODiscoverySystem();
        const session = ceoSystem.getCurrentSession();

        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ status: 'no_active_session' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId: session.id,
                  status: session.status,
                  startTime: session.startTime,
                  patterns: session.patterns.length,
                  painPoints: session.painPoints.length,
                  proposals: session.proposals.length,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_discovery_proposals',
      description: 'Get detailed proposals from CEO discovery session',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of proposals to return',
            default: 3,
          },
          minROI: {
            type: 'number',
            description: 'Minimum ROI threshold',
            default: 2.0,
          },
        },
      },
      handler: async (args: any) => {
        const ceoSystem = new CEODiscoverySystem();
        const session = ceoSystem.getCurrentSession();

        if (!session || session.proposals.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ proposals: [] }, null, 2),
              },
            ],
          };
        }

        // Filter by minimum ROI
        const filteredProposals = session.proposals.filter(
          p => (p.predictedImpact?.expectedROI || 0) >= (args.minROI || 2.0)
        );

        // Limit results
        const limit = args.limit || 3;
        const proposals = filteredProposals.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ proposals }, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_discovery_patterns',
      description: 'Get identified user patterns from CEO discovery',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by pattern type (repetitive, error, bottleneck, workflow)',
            enum: ['repetitive', 'error', 'bottleneck', 'workflow', 'all'],
            default: 'all',
          },
        },
      },
      handler: async (args: any) => {
        const ceoSystem = new CEODiscoverySystem();
        const session = ceoSystem.getCurrentSession();

        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ patterns: [] }, null, 2),
              },
            ],
          };
        }

        let patterns = session.patterns;

        // Filter by type if specified
        if (args.type && args.type !== 'all') {
          patterns = patterns.filter(p => p.type === args.type);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ patterns }, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_discovery_history',
      description: 'Get historical CEO discovery sessions for learning',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of sessions to return',
            default: 10,
          },
        },
      },
      handler: async (args: any) => {
        const ceoSystem = new CEODiscoverySystem();
        const sessions = await ceoSystem.loadHistoricalSessions();

        // Sort by date (most recent first)
        sessions.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        // Limit results
        const limit = args.limit || 10;
        const limitedSessions = sessions.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalSessions: sessions.length,
                  sessions: limitedSessions.map(s => ({
                    id: s.id,
                    startTime: s.startTime,
                    status: s.status,
                    proposalsGenerated: s.proposals.length,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_auto_negotiate',
      description: 'Auto-negotiate project with user based on proposal',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: {
            type: 'string',
            description: 'Proposal ID to negotiate',
          },
          userFeedback: {
            type: 'string',
            description: 'User feedback or constraints',
          },
        },
        required: ['proposalId'],
      },
      handler: async (args: any) => {
        const ceoSystem = new CEODiscoverySystem();
        const session = ceoSystem.getCurrentSession();

        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'No active session' }, null, 2),
              },
            ],
          };
        }

        const proposal = session.proposals.find(p => p.id === args.proposalId);

        if (!proposal) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Proposal not found' }, null, 2),
              },
            ],
          };
        }

        // Negotiation logic (simplified)
        const negotiation = {
          proposalId: proposal.id,
          originalCost: proposal.cost,
          adjustedCost: proposal.cost,
          adjustedTimeline: proposal.timeline,
          userFeedback: args.userFeedback || 'none',
          status: 'accepted',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(negotiation, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_collect_feedback',
      description: 'Collect actual impact feedback for completed project',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: {
            type: 'string',
            description: 'Proposal ID',
          },
          projectId: {
            type: 'string',
            description: 'Completed project ID',
          },
          timeSavings: {
            type: 'number',
            description: 'Actual time savings score 0-100',
          },
          problemSolution: {
            type: 'number',
            description: 'How well it solved the problem 0-100',
          },
          usability: {
            type: 'number',
            description: 'Usability score 0-100',
          },
          sustainability: {
            type: 'number',
            description: 'Long-term value score 0-100',
          },
          userSatisfaction: {
            type: 'number',
            description: 'Overall satisfaction 0-100',
          },
          userComments: {
            type: 'string',
            description: 'User feedback comments',
          },
          wouldRecommend: {
            type: 'boolean',
            description: 'Would recommend to others',
          },
          actualCost: {
            type: 'number',
            description: 'Actual cost in Becoins',
          },
          actualTimeline: {
            type: 'string',
            description: 'Actual timeline (e.g., "2 weeks")',
          },
        },
        required: [
          'proposalId',
          'projectId',
          'timeSavings',
          'problemSolution',
          'usability',
          'sustainability',
          'userSatisfaction',
          'wouldRecommend',
          'actualCost',
          'actualTimeline',
        ],
      },
      handler: async (args: any) => {
        const { FeedbackLoop } = await import('../agents/feedback-loop.js');
        const feedbackLoop = new FeedbackLoop();

        const actualImpact = await feedbackLoop.collectFeedback(
          args.proposalId,
          args.projectId,
          {
            timeSavings: args.timeSavings,
            problemSolution: args.problemSolution,
            usability: args.usability,
            sustainability: args.sustainability,
            userSatisfaction: args.userSatisfaction,
            userComments: args.userComments,
            wouldRecommend: args.wouldRecommend,
            actualCost: args.actualCost,
            actualTimeline: args.actualTimeline,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  actualOverallImpact: actualImpact.actualOverallImpact,
                  actualROI: actualImpact.actualROI,
                  predictionAccuracy: actualImpact.predictionAccuracy,
                  message: 'Feedback collected successfully. Training data created.',
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_learning_metrics',
      description: 'Get learning metrics and system improvement statistics',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const { FeedbackLoop } = await import('../agents/feedback-loop.js');
        const feedbackLoop = new FeedbackLoop();

        const metrics = await feedbackLoop.getLearningMetrics();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_train_neural_network',
      description: 'Train neural networks from collected feedback data',
      inputSchema: {
        type: 'object',
        properties: {
          modelType: {
            type: 'string',
            description: 'Model type to train',
            enum: ['impact_predictor', 'cost_estimator', 'both'],
            default: 'both',
          },
          epochs: {
            type: 'number',
            description: 'Training epochs',
            default: 100,
          },
        },
      },
      handler: async (args: any) => {
        const { FeedbackLoop } = await import('../agents/feedback-loop.js');
        const { NeuralTrainer } = await import('../neural/neural-trainer.js');

        const feedbackLoop = new FeedbackLoop();
        const trainer = new NeuralTrainer();

        const trainingData = await feedbackLoop.getTrainingData();

        if (trainingData.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: 'No training data available' },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const results: any = {};

        if (
          args.modelType === 'impact_predictor' ||
          args.modelType === 'both'
        ) {
          results.impactPredictor = await trainer.trainImpactPredictor(
            trainingData,
            args.epochs || 100
          );
        }

        if (args.modelType === 'cost_estimator' || args.modelType === 'both') {
          results.costEstimator = await trainer.trainCostEstimator(
            trainingData,
            args.epochs || 100
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_run_optimization',
      description: 'Run continuous improvement optimization cycle',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const { ContinuousImprovement } = await import(
          '../agents/continuous-improvement.js'
        );
        const ci = new ContinuousImprovement();

        const result = await ci.runOptimizationCycle();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_performance_report',
      description: 'Generate comprehensive performance analytics report',
      inputSchema: {
        type: 'object',
        properties: {
          periodDays: {
            type: 'number',
            description: 'Report period in days',
            default: 30,
          },
        },
      },
      handler: async (args: any) => {
        const { PerformanceAnalytics } = await import(
          '../agents/performance-analytics.js'
        );
        const analytics = new PerformanceAnalytics();

        const report = await analytics.generateReport(args.periodDays || 30);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      },
    },

    {
      name: 'ceo_optimization_status',
      description: 'Get current optimization status and pending improvements',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const { ContinuousImprovement } = await import(
          '../agents/continuous-improvement.js'
        );
        const ci = new ContinuousImprovement();

        const status = await ci.getOptimizationStatus();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      },
    },
  ];
}
