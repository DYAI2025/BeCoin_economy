/**
 * PM2 Ecosystem Configuration
 *
 * Production deployment configuration for CEO Discovery System
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ceo-discovery
 *   pm2 restart ceo-discovery
 *   pm2 logs ceo-discovery
 */

module.exports = {
  apps: [
    {
      name: 'ceo-discovery',
      script: './dist/server/dashboard-cli.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/ceo-error.log',
      out_file: './logs/ceo-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    }
  ]
};
