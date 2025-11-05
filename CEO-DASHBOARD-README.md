# 🧠 CEO Discovery Dashboard - Quick Start Guide

## Overview

The CEO Discovery Dashboard provides **autonomous, self-learning business development** for the Becoin Firma with a beautiful web-based monitoring interface.

## 🚀 Quick Start

### 1. Build the Project

```bash
npm run build
```

### 2. Start the Dashboard

```bash
# Option 1: Using npm script (recommended)
npm run ceo:start

# Option 2: Direct dashboard start
npm run ceo:dashboard

# Option 3: Using startup script
./scripts/start-ceo.sh
```

### 3. Access the Dashboard

Open your browser to:
```
http://localhost:3000
```

## 📊 Dashboard Features

### Real-Time Monitoring

- **Daemon Status** - Running/stopped state with cycle counters
- **Performance Metrics** - Success rate, ROI, time saved, satisfaction
- **Optimization Status** - System health and prediction accuracy
- **Current Proposals** - Latest project proposals with ROI
- **Activity Feed** - Real-time event stream

### Control Panel

- **▶️ Start** - Start autonomous daemon
- **⏸️ Stop** - Stop daemon
- **🔍 Run Now** - Trigger immediate discovery cycle
- **🚀 Optimize Now** - Run optimization cycle

### WebSocket Real-Time Updates

The dashboard uses WebSocket connections for instant updates:
- Discovery cycle events
- Proposal generation
- Improvement executions
- System status changes

## ⚙️ Configuration

Edit `ceo-config.json` to customize behavior:

```json
{
  "daemon": {
    "discoveryInterval": 24,      // Hours between discovery cycles
    "optimizationInterval": 168,  // Hours between optimization (1 week)
    "autoStart": true,            // Auto-start on launch
    "autoPropose": true,          // Auto-present proposals
    "budgetRange": {
      "min": 100,                 // Min project budget (Becoins)
      "max": 500                  // Max project budget (Becoins)
    },
    "roiTarget": 3.0,             // Target ROI multiplier (3x)
    "minConfidence": 0.7,         // Min confidence (70%)
    "analysisWindow": 168         // Analysis window (7 days)
  },
  "server": {
    "port": 3000,                 // Dashboard port
    "host": "0.0.0.0"            // Listen on all interfaces
  }
}
```

## 🔧 API Endpoints

### GET Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Daemon status
curl http://localhost:3000/api/status

# Full dashboard data
curl http://localhost:3000/api/dashboard
```

### POST Endpoints

```bash
# Run discovery cycle
curl -X POST http://localhost:3000/api/discovery/run

# Run optimization cycle
curl -X POST http://localhost:3000/api/optimization/run

# Start daemon
curl -X POST http://localhost:3000/api/daemon/start

# Stop daemon
curl -X POST http://localhost:3000/api/daemon/stop
```

## 🏭 Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs ceo-discovery

# Stop
pm2 stop ceo-discovery

# Restart
pm2 restart ceo-discovery

# Save configuration
pm2 save

# Auto-start on system reboot
pm2 startup
```

### Using Systemd (Linux)

```bash
# Copy service file
sudo cp scripts/ceo-discovery.service /etc/systemd/system/

# Enable service
sudo systemctl enable ceo-discovery

# Start service
sudo systemctl start ceo-discovery

# Check status
sudo systemctl status ceo-discovery

# View logs
sudo journalctl -u ceo-discovery -f
```

## 📁 File Structure

```
.
├── src/
│   ├── agents/
│   │   ├── ceo-daemon.ts              # Autonomous daemon
│   │   ├── ceo-discovery.ts           # Main discovery system
│   │   ├── continuous-improvement.ts  # Self-optimization
│   │   └── performance-analytics.ts   # Analytics engine
│   ├── server/
│   │   ├── dashboard-server.ts        # Express + WebSocket server
│   │   └── dashboard-cli.ts           # CLI entry point
│   └── dashboard/
│       └── index.html                 # Dashboard UI
├── scripts/
│   └── start-ceo.sh                   # Startup script
├── ceo-config.json                    # Configuration file
└── ecosystem.config.js                # PM2 configuration
```

## 🔄 How It Works

### Autonomous Operation

1. **Daemon starts** and begins scheduled cycles
2. **Discovery cycles** run every 24 hours (configurable)
3. **Pattern analysis** examines user behavior
4. **Proposals generated** with ROI calculations
5. **Dashboard updates** in real-time via WebSocket
6. **Optimization cycles** run weekly to improve accuracy

### Learning Loop

1. **Feedback collected** after project completion
2. **Training data created** for neural networks
3. **Models retrained** automatically
4. **Predictions improve** over time
5. **Continuous optimization** adjusts algorithms

## 📊 Metrics & Analytics

### Performance Report

Access comprehensive analytics:
- Success rate (% of projects with impact > 70)
- Average ROI across all projects
- Total time saved (minutes per week)
- User satisfaction scores
- Prediction accuracy over time

### Trend Analysis

View trends over time:
- Impact trend (weekly averages)
- ROI trend (6-month projection)
- Satisfaction trend (user feedback)

### Category Performance

See performance by pain point type:
- Repetitive tasks automation
- Error prevention systems
- Workflow bottleneck resolution
- Manual process automation

## 🎯 Best Practices

### Initial Setup

1. **Run initial discovery** to establish baseline
2. **Review first proposals** to understand system behavior
3. **Adjust budget ranges** based on your needs
4. **Set appropriate ROI targets** for your firm

### Ongoing Operation

1. **Monitor dashboard** regularly for insights
2. **Collect feedback** after project completion
3. **Run optimization** when accuracy dips
4. **Adjust configuration** as needs evolve

### Troubleshooting

**Dashboard won't start:**
- Check if port 3000 is available
- Ensure project is built (`npm run build`)
- Check logs for errors

**No proposals generated:**
- Increase analysis window
- Lower min confidence threshold
- Check if enough user activity exists

**Low prediction accuracy:**
- Collect more feedback data
- Run optimization cycle
- Check training data quality

## 🆘 Support

If you encounter issues:

1. Check logs: `pm2 logs ceo-discovery` or console output
2. Review configuration: `cat ceo-config.json`
3. Run health check: `curl http://localhost:3000/health`
4. Check GitHub issues: https://github.com/ruvnet/claude-flow/issues

## 📚 Additional Resources

- **CLAUDE.md** - Full system documentation
- **CEO-DISCOVERY-SUMMARY.md** - Complete implementation details
- **agency-agents/** - Becoin Economy integration
- **src/agents/** - Source code for all CEO components

---

**Made with 💜 for the Becoin Firma**

*Autonomous. Intelligent. Proactive.*
