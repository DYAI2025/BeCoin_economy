#!/usr/bin/env node

/**
 * CEO Discovery Dashboard CLI Entry Point
 *
 * Starts the dashboard server with configuration from ceo-config.json
 */

import { promises as fs } from 'node:fs';
import * as path from 'path';
import { DashboardServer } from './dashboard-server.js';

interface Config {
  daemon?: {
    discoveryInterval?: number;
    optimizationInterval?: number;
    autoStart?: boolean;
    autoPropose?: boolean;
    budgetRange?: { min: number; max: number };
    roiTarget?: number;
    minConfidence?: number;
    analysisWindow?: number;
  };
  server?: {
    port?: number;
    host?: string;
  };
}

async function loadConfig(): Promise<Config> {
  try {
    const configPath = path.join(process.cwd(), 'ceo-config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('⚠️  No config file found, using defaults');
    return {};
  }
}

async function main() {
  console.log('🧠 CEO Discovery Dashboard\n');

  // Load configuration
  const config = await loadConfig();

  // Create and start server
  const server = new DashboardServer({
    port: config.server?.port || 3000,
    host: config.server?.host || '0.0.0.0',
    daemonConfig: config.daemon,
  });

  try {
    await server.start();

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(
      '❌ Failed to start server:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
