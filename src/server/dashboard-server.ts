/**
 * CEO Discovery Dashboard Server
 *
 * Express server with WebSocket support for real-time dashboard updates.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { Logger } from '../core/logger.js';
import { CEODaemon } from '../agents/ceo-daemon.js';
import type { DaemonConfig } from '../agents/ceo-daemon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DashboardServerConfig {
  port: number;
  host: string;
  daemonConfig?: Partial<DaemonConfig>;
}

export class DashboardServer {
  private logger: Logger;
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private daemon: CEODaemon;
  private config: DashboardServerConfig;
  private clients: Set<WebSocket>;
  private dashboardPath: string;

  constructor(config: Partial<DashboardServerConfig> = {}) {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'DashboardServer' }
    );

    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      daemonConfig: config.daemonConfig,
    };

    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.daemon = new CEODaemon(this.config.daemonConfig);
    this.clients = new Set();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupDaemonEvents();
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Start the daemon
    await this.daemon.start();

    // Start the HTTP server
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(
          `🌐 Dashboard server running at http://${this.config.host}:${this.config.port}`
        );
        this.logger.info(
          `📊 Open http://localhost:${this.config.port} in your browser`
        );
        resolve();
      });

      this.server.on('error', (error: Error) => {
        this.logger.error(`❌ Server error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping dashboard server...');

    // Stop daemon
    await this.daemon.stop();

    // Close all WebSocket connections
    this.clients.forEach(client => client.close());
    this.wss.close();

    // Close HTTP server
    return new Promise((resolve, reject) => {
      this.server.close((error: Error) => {
        if (error) {
          this.logger.error(`❌ Error stopping server: ${error.message}`);
          reject(error);
        } else {
          this.logger.info('✅ Dashboard server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // Serve static files from dashboard directory
    // Try multiple possible locations for the dashboard
    const possiblePaths = [
      path.join(__dirname, '../../dashboard'),        // Built location
      path.join(__dirname, '../../src/dashboard'),    // Source location from dist
      path.join(process.cwd(), 'src/dashboard'),      // Source from project root
      path.join(process.cwd(), 'dashboard'),          // Root level dashboard
    ];

    this.dashboardPath = possiblePaths[0];
    for (const testPath of possiblePaths) {
      if (existsSync(testPath)) {
        this.dashboardPath = testPath;
        this.logger.debug(`✅ Found dashboard at: ${this.dashboardPath}`);
        break;
      }
    }

    this.app.use(express.static(this.dashboardPath));
    this.logger.info(`📁 Serving static files from: ${this.dashboardPath}`);
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get daemon status
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = await this.daemon.getStatus();
        res.json(status);
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Get dashboard data
    this.app.get('/api/dashboard', async (req, res) => {
      try {
        const data = await this.daemon.getDashboardData();
        res.json(data);
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Run discovery cycle
    this.app.post('/api/discovery/run', async (req, res) => {
      try {
        const session = await this.daemon.runDiscoveryCycle();
        res.json(session);
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Run optimization cycle
    this.app.post('/api/optimization/run', async (req, res) => {
      try {
        await this.daemon.runOptimizationCycle();
        res.json({ success: true });
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Start daemon
    this.app.post('/api/daemon/start', async (req, res) => {
      try {
        await this.daemon.start();
        res.json({ success: true });
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Stop daemon
    this.app.post('/api/daemon/stop', async (req, res) => {
      try {
        await this.daemon.stop();
        res.json({ success: true });
      } catch (error) {
        res
          .status(500)
          .json({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    });

    // Root route - serve index.html
    this.app.get('/', (req, res) => {
      const indexPath = path.join(this.dashboardPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.logger.info('📡 New WebSocket client connected');
      this.clients.add(ws);

      // Send initial status
      this.daemon.getStatus().then(status => {
        ws.send(JSON.stringify({ type: 'status', data: status }));
      });

      ws.on('close', () => {
        this.logger.info('📡 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', error => {
        this.logger.error(`❌ WebSocket error: ${error.message}`);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Setup daemon event listeners for real-time updates
   */
  private setupDaemonEvents(): void {
    // Broadcast all daemon events to connected clients
    const events = [
      'daemon:started',
      'daemon:stopped',
      'cycle:started',
      'cycle:completed',
      'cycle:failed',
      'discovery:started',
      'discovery:completed',
      'proposal:generated',
      'improvement:executed',
      'feedback:collected',
      'training:completed',
    ];

    events.forEach(event => {
      this.daemon.on(event, data => {
        this.broadcast({ type: event, data, timestamp: new Date() });
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: any): void {
    const payload = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Get daemon instance (for external access)
   */
  getDaemon(): CEODaemon {
    return this.daemon;
  }
}
