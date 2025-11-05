/**
 * Neural Pattern Analyzer - User Behavior Analysis
 *
 * Analyzes user interaction patterns to identify repetitive tasks,
 * bottlenecks, errors, and opportunities for automation.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Logger } from '../core/logger.js';

export interface UserPattern {
  id: string;
  type: 'repetitive' | 'error' | 'bottleneck' | 'workflow' | 'search';
  action: string;
  frequency: number;
  timeSpent: number; // minutes
  confidence: number; // 0-1
  context: string[];
  firstSeen: Date;
  lastSeen: Date;
  metadata: Record<string, any>;
}

export interface PainPoint {
  id: string;
  type: 'repetitive_task' | 'recurring_error' | 'workflow_bottleneck' | 'manual_process';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeCost: number; // minutes per week
  automationPotential: number; // 0-1
  relatedPatterns: string[];
}

export interface AnalysisConfig {
  timeWindow: number; // hours
  sources: string[];
  minConfidence: number;
}

export class PatternAnalyzer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'PatternAnalyzer' }
    );
  }

  /**
   * Analyze user patterns from multiple sources
   */
  async analyze(config: AnalysisConfig): Promise<UserPattern[]> {
    this.logger.info('🧠 Analyzing user patterns...');

    const patterns: UserPattern[] = [];

    // Analyze memory database
    const memoryPatterns = await this.analyzeMemory(config);
    patterns.push(...memoryPatterns);

    // Analyze command history
    const commandPatterns = await this.analyzeCommands(config);
    patterns.push(...commandPatterns);

    // Analyze file operations
    const filePatterns = await this.analyzeFileOperations(config);
    patterns.push(...filePatterns);

    // Analyze swarm coordination logs
    const swarmPatterns = await this.analyzeSwarmLogs(config);
    patterns.push(...swarmPatterns);

    // Deduplicate and merge similar patterns
    const mergedPatterns = this.mergePatterns(patterns);

    this.logger.info(`✅ Found ${mergedPatterns.length} unique patterns`);

    return mergedPatterns.filter(p => p.confidence >= config.minConfidence);
  }

  /**
   * Analyze memory database for patterns
   */
  private async analyzeMemory(config: AnalysisConfig): Promise<UserPattern[]> {
    const patterns: UserPattern[] = [];
    const memoryPath = path.join('.swarm', 'memory.db');

    try {
      // Check if memory DB exists
      await fs.access(memoryPath);

      // Simulate memory analysis (would use better-sqlite3 in production)
      // This is a placeholder for the actual implementation
      patterns.push({
        id: `mem-${Date.now()}`,
        type: 'workflow',
        action: 'memory_query',
        frequency: 10,
        timeSpent: 5,
        confidence: 0.8,
        context: ['database', 'query'],
        firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        metadata: { source: 'memory' },
      });
    } catch (error) {
      // Memory DB doesn't exist yet
    }

    return patterns;
  }

  /**
   * Analyze command history for repetitive tasks
   */
  private async analyzeCommands(config: AnalysisConfig): Promise<UserPattern[]> {
    const patterns: UserPattern[] = [];
    const commandCache: Map<string, number> = new Map();

    try {
      // Read bash history or command logs
      const historyPath = path.join('.claude-flow', 'command-history.log');
      const history = await fs.readFile(historyPath, 'utf-8');
      const commands = history.split('\n').filter(Boolean);

      // Count command frequency
      for (const cmd of commands) {
        const normalized = this.normalizeCommand(cmd);
        commandCache.set(normalized, (commandCache.get(normalized) || 0) + 1);
      }

      // Identify repetitive commands
      for (const [cmd, count] of commandCache.entries()) {
        if (count >= 3) {
          patterns.push({
            id: `cmd-${Date.now()}-${patterns.length}`,
            type: 'repetitive',
            action: cmd,
            frequency: count,
            timeSpent: count * 2, // Assume 2 min per command
            confidence: Math.min(count / 10, 1),
            context: ['command', 'cli'],
            firstSeen: new Date(Date.now() - config.timeWindow * 60 * 60 * 1000),
            lastSeen: new Date(),
            metadata: { source: 'commands' },
          });
        }
      }
    } catch (error) {
      // No command history yet
    }

    return patterns;
  }

  /**
   * Analyze file operations for patterns
   */
  private async analyzeFileOperations(config: AnalysisConfig): Promise<UserPattern[]> {
    const patterns: UserPattern[] = [];

    try {
      const logsPath = path.join('.claude-flow', 'file-operations.log');
      const logs = await fs.readFile(logsPath, 'utf-8');
      const operations = logs.split('\n').filter(Boolean);

      // Track file edit patterns
      const editFrequency: Map<string, number> = new Map();

      for (const op of operations) {
        try {
          const parsed = JSON.parse(op);
          if (parsed.operation === 'edit' || parsed.operation === 'write') {
            const file = parsed.file;
            editFrequency.set(file, (editFrequency.get(file) || 0) + 1);
          }
        } catch (e) {
          // Skip invalid lines
        }
      }

      // Identify files edited frequently
      for (const [file, count] of editFrequency.entries()) {
        if (count >= 5) {
          patterns.push({
            id: `file-${Date.now()}-${patterns.length}`,
            type: 'repetitive',
            action: `edit ${file}`,
            frequency: count,
            timeSpent: count * 3, // Assume 3 min per edit
            confidence: 0.85,
            context: ['file', 'edit'],
            firstSeen: new Date(Date.now() - config.timeWindow * 60 * 60 * 1000),
            lastSeen: new Date(),
            metadata: { file, source: 'file-ops' },
          });
        }
      }
    } catch (error) {
      // No file operation logs yet
    }

    return patterns;
  }

  /**
   * Analyze swarm coordination logs
   */
  private async analyzeSwarmLogs(config: AnalysisConfig): Promise<UserPattern[]> {
    const patterns: UserPattern[] = [];

    try {
      const swarmLogsPath = path.join('.claude-flow', 'swarm-coordination.log');
      const logs = await fs.readFile(swarmLogsPath, 'utf-8');
      const entries = logs.split('\n').filter(Boolean);

      // Track task types
      const taskTypes: Map<string, number> = new Map();

      for (const entry of entries) {
        try {
          const parsed = JSON.parse(entry);
          if (parsed.task) {
            const type = this.classifyTaskType(parsed.task);
            taskTypes.set(type, (taskTypes.get(type) || 0) + 1);
          }
        } catch (e) {
          // Skip invalid lines
        }
      }

      // Identify frequent task types
      for (const [type, count] of taskTypes.entries()) {
        if (count >= 3) {
          patterns.push({
            id: `swarm-${Date.now()}-${patterns.length}`,
            type: 'workflow',
            action: `${type} task`,
            frequency: count,
            timeSpent: count * 10, // Assume 10 min per task
            confidence: 0.9,
            context: ['swarm', 'coordination'],
            firstSeen: new Date(Date.now() - config.timeWindow * 60 * 60 * 1000),
            lastSeen: new Date(),
            metadata: { taskType: type, source: 'swarm' },
          });
        }
      }
    } catch (error) {
      // No swarm logs yet
    }

    return patterns;
  }

  /**
   * Merge similar patterns
   */
  private mergePatterns(patterns: UserPattern[]): UserPattern[] {
    const merged: Map<string, UserPattern> = new Map();

    for (const pattern of patterns) {
      const key = `${pattern.type}-${pattern.action}`;
      const existing = merged.get(key);

      if (existing) {
        // Merge frequencies and confidence
        existing.frequency += pattern.frequency;
        existing.timeSpent += pattern.timeSpent;
        existing.confidence = Math.max(existing.confidence, pattern.confidence);
        existing.lastSeen = pattern.lastSeen;
      } else {
        merged.set(key, { ...pattern });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Normalize command for comparison
   */
  private normalizeCommand(cmd: string): string {
    // Remove timestamps, IDs, etc.
    return cmd
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')
      .replace(/\d{10,}/g, 'ID')
      .replace(/["']([^"']+)["']/g, 'STRING')
      .trim();
  }

  /**
   * Classify task type from description
   */
  private classifyTaskType(task: string): string {
    const lower = task.toLowerCase();

    if (lower.includes('test') || lower.includes('qa')) return 'testing';
    if (lower.includes('build') || lower.includes('deploy')) return 'deployment';
    if (lower.includes('fix') || lower.includes('bug')) return 'bugfix';
    if (lower.includes('api') || lower.includes('endpoint')) return 'api-development';
    if (lower.includes('ui') || lower.includes('component')) return 'frontend';
    if (lower.includes('database') || lower.includes('query')) return 'backend';

    return 'general';
  }
}
