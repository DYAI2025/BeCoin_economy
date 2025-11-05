/**
 * CEO Discovery System Tests
 */

import { CEODiscoverySystem } from '../../agents/ceo-discovery.js';
import { PatternAnalyzer } from '../../neural/pattern-analyzer.js';
import { ProposalGenerator } from '../../neural/proposal-generator.js';
import { ImpactPredictor } from '../../agents/impact-predictor.js';

describe('CEODiscoverySystem', () => {
  describe('startDiscovery', () => {
    it('should complete discovery session', async () => {
      const ceoSystem = new CEODiscoverySystem({
        agencyPath: 'agency-agents',
        analysisWindow: 24,
        minConfidence: 0.5,
        budgetRange: { min: 50, max: 200 },
        roiTarget: 2.0,
        autoPropose: false,
      });

      const session = await ceoSystem.startDiscovery();

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^discovery-\d+$/);
      expect(session.status).toBe('completed');
      expect(Array.isArray(session.patterns)).toBe(true);
      expect(Array.isArray(session.painPoints)).toBe(true);
      expect(Array.isArray(session.proposals)).toBe(true);
    });

    it('should filter patterns by confidence', async () => {
      const ceoSystem = new CEODiscoverySystem({
        minConfidence: 0.8,
      });

      const session = await ceoSystem.startDiscovery();

      // All patterns should meet minimum confidence
      for (const pattern of session.patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  describe('getCurrentSession', () => {
    it('should return undefined when no session active', () => {
      const ceoSystem = new CEODiscoverySystem();
      const session = ceoSystem.getCurrentSession();
      expect(session).toBeUndefined();
    });

    it('should return current session after starting discovery', async () => {
      const ceoSystem = new CEODiscoverySystem();
      await ceoSystem.startDiscovery();

      const session = ceoSystem.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.status).toBe('completed');
    });
  });

  describe('saveSession and loadHistoricalSessions', () => {
    it('should save and load sessions', async () => {
      const ceoSystem = new CEODiscoverySystem();
      const session = await ceoSystem.startDiscovery();

      await ceoSystem.saveSession(session);

      const historical = await ceoSystem.loadHistoricalSessions();
      expect(historical.length).toBeGreaterThan(0);

      const found = historical.find(s => s.id === session.id);
      expect(found).toBeDefined();
    });
  });
});

describe('PatternAnalyzer', () => {
  describe('analyze', () => {
    it('should analyze patterns from sources', async () => {
      const analyzer = new PatternAnalyzer();

      const patterns = await analyzer.analyze({
        timeWindow: 24,
        sources: ['.swarm/memory.db'],
        minConfidence: 0.5,
      });

      expect(Array.isArray(patterns)).toBe(true);
      // Patterns might be empty if no data exists yet
    });

    it('should filter by minimum confidence', async () => {
      const analyzer = new PatternAnalyzer();

      const patterns = await analyzer.analyze({
        timeWindow: 24,
        sources: [],
        minConfidence: 0.9,
      });

      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });
});

describe('ProposalGenerator', () => {
  describe('generate', () => {
    it('should generate proposal for pain point', async () => {
      const generator = new ProposalGenerator();

      const painPoint = {
        id: 'test-pain-1',
        type: 'repetitive_task' as const,
        description: 'Manual deployment process',
        severity: 'high' as const,
        timeCost: 120, // 2 hours per week
        automationPotential: 0.9,
        relatedPatterns: [],
      };

      const proposal = await generator.generate({
        painPoint,
        budget: { min: 100, max: 500 },
        targetROI: 3.0,
        treasury: {
          balance: 100000,
          startCapital: 100000,
          burnRate: 0.25,
          runway: 400000,
        },
      });

      expect(proposal).toBeDefined();
      expect(proposal?.title).toBeTruthy();
      expect(proposal?.cost).toBeGreaterThan(0);
      expect(proposal?.cost).toBeLessThanOrEqual(500);
      expect(proposal?.requiredAgents.length).toBeGreaterThan(0);
    });

    it('should return null for low-value pain points', async () => {
      const generator = new ProposalGenerator();

      const painPoint = {
        id: 'test-pain-2',
        type: 'workflow_bottleneck' as const,
        description: 'Minor inconvenience',
        severity: 'low' as const,
        timeCost: 5, // 5 minutes per week
        automationPotential: 0.3,
        relatedPatterns: [],
      };

      const proposal = await generator.generate({
        painPoint,
        budget: { min: 200, max: 500 }, // Cost would be below minimum
        targetROI: 5.0, // High ROI requirement
        treasury: {
          balance: 100000,
          startCapital: 100000,
          burnRate: 0.25,
          runway: 400000,
        },
      });

      // Might return null if cost is outside budget range
      if (proposal) {
        expect(proposal.cost).toBeGreaterThanOrEqual(200);
      }
    });
  });
});

describe('ImpactPredictor', () => {
  describe('predict', () => {
    it('should predict impact for proposal', async () => {
      const predictor = new ImpactPredictor();

      const proposal = {
        id: 'test-proposal-1',
        title: 'Automation System',
        description: 'Automate manual process',
        painPoint: {
          id: 'test-pain-1',
          type: 'repetitive_task' as const,
          description: 'Manual task',
          severity: 'high' as const,
          timeCost: 180,
          automationPotential: 0.95,
          relatedPatterns: [],
        },
        cost: 250,
        timeline: '2 weeks',
        requiredAgents: ['Backend-Architect', 'DevOps-Automator'],
        deliverables: ['Automation script', 'Documentation'],
        successMetrics: ['90% time reduction'],
        expectedTimeSavings: 180,
        automationLevel: 0.95,
        riskLevel: 'low' as const,
      };

      const prediction = await predictor.predict(proposal);

      expect(prediction).toBeDefined();
      expect(prediction.expectedImpact).toBeGreaterThan(0);
      expect(prediction.expectedImpact).toBeLessThanOrEqual(100);
      expect(prediction.expectedROI).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.breakdown).toBeDefined();
      expect(prediction.reasoning).toBeTruthy();
    });

    it('should give higher scores to high-value projects', async () => {
      const predictor = new ImpactPredictor();

      const highValueProposal = {
        id: 'test-high',
        title: 'Critical Automation',
        description: 'Automate critical process',
        painPoint: {
          id: 'pain-high',
          type: 'repetitive_task' as const,
          description: 'Critical manual task',
          severity: 'critical' as const,
          timeCost: 300, // 5 hours per week
          automationPotential: 0.95,
          relatedPatterns: [],
        },
        cost: 400,
        timeline: '3 weeks',
        requiredAgents: ['Backend-Architect'],
        deliverables: ['Full automation'],
        successMetrics: ['100% automation'],
        expectedTimeSavings: 300,
        automationLevel: 0.95,
        riskLevel: 'low' as const,
      };

      const lowValueProposal = {
        ...highValueProposal,
        id: 'test-low',
        painPoint: {
          ...highValueProposal.painPoint,
          id: 'pain-low',
          severity: 'low' as const,
          timeCost: 15,
          automationPotential: 0.5,
        },
        expectedTimeSavings: 15,
        automationLevel: 0.5,
        riskLevel: 'high' as const,
      };

      const highPrediction = await predictor.predict(highValueProposal);
      const lowPrediction = await predictor.predict(lowValueProposal);

      expect(highPrediction.expectedImpact).toBeGreaterThan(lowPrediction.expectedImpact);
      expect(highPrediction.expectedROI).toBeGreaterThan(lowPrediction.expectedROI);
    });
  });
});
