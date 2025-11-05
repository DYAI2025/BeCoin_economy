import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { jest } from '@jest/globals';
import type { ProjectProposal } from '../../neural/proposal-generator.js';

const originalEnv = process.env.CLAUDE_FLOW_ENV;
type FeedbackLoopCtor = typeof import('../../agents/feedback-loop.js').FeedbackLoop;
let FeedbackLoop: FeedbackLoopCtor;

describe('FeedbackLoop', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(async () => {
    process.env.CLAUDE_FLOW_ENV = 'development';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feedback-loop-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_FLOW_ENV;
    } else {
      process.env.CLAUDE_FLOW_ENV = originalEnv;
    }
  });

  it('creates training data when collecting feedback', async () => {
    if (!FeedbackLoop) {
      ({ FeedbackLoop } = await import('../../agents/feedback-loop.js'));
    }

    const loop = new FeedbackLoop();

    const proposal: ProjectProposal = {
      id: 'proposal-test',
      title: 'Automation System',
      description: 'Automate manual workflow',
      painPoint: {
        id: 'pain-1',
        type: 'repetitive_task',
        description: 'Manual operations',
        severity: 'high',
        timeCost: 180,
        automationPotential: 0.9,
        relatedPatterns: [],
      },
      cost: 300,
      timeline: '2 weeks',
      requiredAgents: ['Backend-Architect'],
      deliverables: ['Automation script'],
      successMetrics: ['80% time reduction'],
      expectedTimeSavings: 180,
      automationLevel: 0.9,
      riskLevel: 'low',
      predictedImpact: {
        expectedImpact: 85,
        expectedROI: 3.4,
        confidence: 0.8,
      },
    };

    jest
      .spyOn(loop as any, 'loadProposal')
      .mockResolvedValue(proposal);

    const impact = await loop.collectFeedback('proposal-test', 'project-123', {
      timeSavings: 80,
      problemSolution: 90,
      usability: 75,
      sustainability: 70,
      userSatisfaction: 85,
      userComments: 'Great result',
      wouldRecommend: true,
      actualCost: 280,
      actualTimeline: '2 weeks',
    });

    expect(impact.actualROI).toBeGreaterThan(0);
    expect(impact.predictionAccuracy).toBeGreaterThan(0);

    const trainingPath = path.join(
      '.claude-flow',
      'training-data',
      'training-proposal-test.json'
    );
    const stored = JSON.parse(await fs.readFile(trainingPath, 'utf-8'));
    expect(stored.proposal.id).toBe('proposal-test');
    expect(stored.actualImpact.actualOverallImpact).toBeDefined();
  });
});
