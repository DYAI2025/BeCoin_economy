/**
 * CEO Discovery CLI Commands
 */

import { CEODiscoverySystem } from '../../agents/ceo-discovery.js';
import { success, error, info, warning } from '../cli-core.js';
import type { CommandContext } from '../cli-core.js';
import chalk from 'chalk';

/**
 * CEO Discovery command action
 */
export async function ceoDiscoveryAction(ctx: CommandContext): Promise<void> {
  const subcommand = ctx.args[0] || 'start';

  switch (subcommand) {
    case 'start':
      await startDiscovery(ctx);
      break;
    case 'status':
      await showStatus(ctx);
      break;
    case 'proposals':
      await showProposals(ctx);
      break;
    case 'patterns':
      await showPatterns(ctx);
      break;
    case 'history':
      await showHistory(ctx);
      break;
    default:
      error(`Unknown subcommand: ${subcommand}`);
      console.log('\nAvailable subcommands:');
      console.log('  start     - Start CEO discovery session');
      console.log('  status    - Show current session status');
      console.log('  proposals - Show generated proposals');
      console.log('  patterns  - Show identified patterns');
      console.log('  history   - Show historical sessions');
  }
}

/**
 * Start CEO discovery session
 */
async function startDiscovery(ctx: CommandContext): Promise<void> {
  info('🚀 Starting CEO Discovery Session...\n');

  const config = {
    analysisWindow: parseInt(ctx.flags['analysis-window'] as string) || 168,
    minConfidence: parseFloat(ctx.flags['min-confidence'] as string) || 0.7,
    budgetRange: {
      min: parseInt(ctx.flags['budget-min'] as string) || 100,
      max: parseInt(ctx.flags['budget-max'] as string) || 500,
    },
    roiTarget: parseFloat(ctx.flags['roi-target'] as string) || 3.0,
    autoPropose: ctx.flags['auto-propose'] === true,
  };

  const ceoSystem = new CEODiscoverySystem(config);

  try {
    // Start discovery
    const session = await ceoSystem.startDiscovery();

    // Show results
    console.log(chalk.green('✅ Discovery completed!\n'));
    console.log(chalk.bold('📊 Session Summary:'));
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Patterns Found: ${session.patterns.length}`);
    console.log(`   Pain Points: ${session.painPoints.length}`);
    console.log(`   Proposals Generated: ${session.proposals.length}\n`);

    // Present proposals
    if (session.proposals.length > 0) {
      await ceoSystem.presentProposals(session);

      // Save session
      await ceoSystem.saveSession(session);

      console.log(
        chalk.cyan(
          `\n💾 Session saved. Use 'npx claude-flow ceo-discovery proposals' to review.`
        )
      );
    } else {
      warning('No proposals generated. Try adjusting your filters or extending the analysis window.');
    }
  } catch (err) {
    error(`Discovery failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Show current session status
 */
async function showStatus(ctx: CommandContext): Promise<void> {
  const ceoSystem = new CEODiscoverySystem();
  const session = ceoSystem.getCurrentSession();

  if (!session) {
    warning('No active discovery session');
    console.log('\nStart a new session with: npx claude-flow ceo-discovery start');
    return;
  }

  console.log(chalk.bold('📊 Current Discovery Session:\n'));
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Started: ${session.startTime.toLocaleString()}`);
  console.log(`   Patterns: ${session.patterns.length}`);
  console.log(`   Pain Points: ${session.painPoints.length}`);
  console.log(`   Proposals: ${session.proposals.length}`);
}

/**
 * Show generated proposals
 */
async function showProposals(ctx: CommandContext): Promise<void> {
  const ceoSystem = new CEODiscoverySystem();
  const session = ceoSystem.getCurrentSession();

  if (!session || session.proposals.length === 0) {
    warning('No proposals available');
    console.log('\nStart discovery with: npx claude-flow ceo-discovery start');
    return;
  }

  const limit = parseInt(ctx.flags.limit as string) || 5;
  const minROI = parseFloat(ctx.flags['min-roi'] as string) || 0;

  const filteredProposals = session.proposals.filter(
    p => (p.predictedImpact?.expectedROI || 0) >= minROI
  );

  console.log(chalk.bold(`\n📋 Generated Proposals (${filteredProposals.length}):\n`));

  for (let i = 0; i < Math.min(limit, filteredProposals.length); i++) {
    const p = filteredProposals[i];
    console.log(chalk.cyan(`${i + 1}. ${p.title}`));
    console.log(`   ${p.description}`);
    console.log(`   💰 Cost: ${p.cost} Becoins`);
    console.log(`   📈 ROI: ${p.predictedImpact?.expectedROI.toFixed(1)}x`);
    console.log(`   🎯 Impact: ${p.predictedImpact?.expectedImpact}/100`);
    console.log(`   ⏱️  Timeline: ${p.timeline}`);
    console.log(`   🤖 Team: ${p.requiredAgents.join(', ')}\n`);
  }
}

/**
 * Show identified patterns
 */
async function showPatterns(ctx: CommandContext): Promise<void> {
  const ceoSystem = new CEODiscoverySystem();
  const session = ceoSystem.getCurrentSession();

  if (!session || session.patterns.length === 0) {
    warning('No patterns identified');
    return;
  }

  const patternType = ctx.flags.type as string;

  let patterns = session.patterns;
  if (patternType && patternType !== 'all') {
    patterns = patterns.filter(p => p.type === patternType);
  }

  console.log(chalk.bold(`\n🔍 Identified Patterns (${patterns.length}):\n`));

  for (const p of patterns.slice(0, 10)) {
    console.log(chalk.yellow(`• ${p.action}`));
    console.log(`  Type: ${p.type} | Frequency: ${p.frequency}x | Confidence: ${(p.confidence * 100).toFixed(0)}%`);
    console.log(`  Time Cost: ${p.timeSpent} min | Last Seen: ${p.lastSeen.toLocaleDateString()}\n`);
  }
}

/**
 * Show historical sessions
 */
async function showHistory(ctx: CommandContext): Promise<void> {
  const ceoSystem = new CEODiscoverySystem();
  const sessions = await ceoSystem.loadHistoricalSessions();

  if (sessions.length === 0) {
    warning('No historical sessions found');
    return;
  }

  const limit = parseInt(ctx.flags.limit as string) || 10;

  console.log(chalk.bold(`\n📜 Historical Sessions (${sessions.length}):\n`));

  sessions.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  for (const session of sessions.slice(0, limit)) {
    console.log(chalk.cyan(`${session.id}`));
    console.log(`   Date: ${new Date(session.startTime).toLocaleString()}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Proposals: ${session.proposals.length}\n`);
  }
}
