# 🚀 CEO Discovery System - Complete Startup Guide

## 📋 Overview

This guide explains how to start the **CEO Discovery System** so it runs **autonomously** with a **visible GUI dashboard** for monitoring and control.

---

## ✅ Prerequisites

1. **Node.js** v20+ installed
2. **npm** or **pnpm** package manager
3. **Project built** (run `npm run build`)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Build the Project

```bash
cd /home/dyai/Dokumente/DYAI_home/DEV/AI_LLM/Claude-flow/claude-flow
npm run build
```

### Step 2: Start the Dashboard

```bash
npm run ceo:start
```

### Step 3: Open Your Browser

```
http://localhost:3000
```

**That's it!** The CEO Discovery System is now running autonomously with a live dashboard.

---

## 🎛️ Startup Options

### Option 1: npm Script (Recommended)

```bash
npm run ceo:start
```

**Advantages:**
- Uses startup script with all checks
- Creates default configuration if missing
- Builds project if needed

### Option 2: Direct Dashboard Start

```bash
npm run ceo:dashboard
```

**Advantages:**
- Fastest startup
- Assumes project is already built
- Uses existing configuration

### Option 3: Manual Script

```bash
./scripts/start-ceo.sh
```

**Advantages:**
- Explicit script execution
- Shows colored output
- Handles all setup steps

### Option 4: Production with PM2

```bash
# Install PM2 (if not installed)
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs ceo-discovery

# Management
pm2 stop ceo-discovery
pm2 restart ceo-discovery
pm2 delete ceo-discovery
```

**Advantages:**
- Auto-restart on crashes
- Log management
- System startup integration
- Production-ready

---

## 📊 Dashboard Interface

### What You'll See

**Top Section - Daemon Status:**
- ⚡ Running/Stopped indicator
- 🔄 Total cycles counter
- ⏰ Next discovery time
- Control buttons (Start/Stop/Run Now)

**Middle Section - Performance:**
- 📈 Success rate
- 💰 Average ROI
- ⏱️ Time saved per week
- 😊 User satisfaction

**Bottom Section:**
- 💡 Current proposals with ROI
- 📋 Real-time activity feed

### Controls

| Button | Action | Description |
|--------|--------|-------------|
| ▶️ Start | Start daemon | Begin autonomous operation |
| ⏸️ Stop | Stop daemon | Pause autonomous operation |
| 🔍 Run Now | Run discovery | Trigger immediate discovery cycle |
| 🚀 Optimize Now | Run optimization | Train models and improve accuracy |

---

## ⚙️ Configuration

The system uses `ceo-config.json` for configuration:

```json
{
  "daemon": {
    "discoveryInterval": 24,
    "optimizationInterval": 168,
    "autoStart": true,
    "autoPropose": true,
    "budgetRange": { "min": 100, "max": 500 },
    "roiTarget": 3.0,
    "minConfidence": 0.7,
    "analysisWindow": 168
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `discoveryInterval` | Hours between discovery cycles | 24 (daily) |
| `optimizationInterval` | Hours between optimization | 168 (weekly) |
| `autoStart` | Auto-start daemon on launch | true |
| `autoPropose` | Auto-present proposals | true |
| `budgetRange` | Min/max project budget (Becoins) | 100-500 |
| `roiTarget` | Target ROI multiplier | 3.0 (3x) |
| `minConfidence` | Min confidence threshold | 0.7 (70%) |
| `analysisWindow` | Analysis window (hours) | 168 (7 days) |
| `server.port` | Dashboard port | 3000 |
| `server.host` | Listen address | 0.0.0.0 (all) |

---

## 🔄 How Autonomous Operation Works

### Startup Sequence

1. **Configuration loaded** from `ceo-config.json`
2. **Daemon initialized** with settings
3. **Dashboard server started** on port 3000
4. **WebSocket server** enabled for real-time updates
5. **Initial discovery** runs (if `autoStart: true`)
6. **Scheduled cycles** begin

### Autonomous Cycles

**Discovery Cycle (every 24h):**
1. Analyze user patterns (memory, commands, files, swarm logs)
2. Identify pain points (repetitive tasks, errors, bottlenecks)
3. Generate project proposals with cost/ROI
4. Predict impact using neural networks
5. Prioritize by expected value
6. Update dashboard in real-time

**Optimization Cycle (every 168h):**
1. Check for new training data
2. Evaluate prediction accuracy
3. Identify underperforming patterns
4. Retrain neural networks if needed
5. Adjust algorithms for better predictions
6. Report improvements

### Real-Time Updates

The dashboard receives instant updates via WebSocket for:
- ✅ Discovery cycle started/completed
- 💡 Proposal generated
- 🧠 Model trained
- 🔧 Optimization executed
- 📊 Performance metrics updated

---

## 🏭 Production Deployment

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start ecosystem.config.js

# Auto-start on system reboot
pm2 startup
pm2 save

# Monitoring
pm2 logs ceo-discovery
pm2 monit
```

### Systemd Service (Linux)

Create `/etc/systemd/system/ceo-discovery.service`:

```ini
[Unit]
Description=CEO Discovery System
After=network.target

[Service]
Type=simple
User=dyai
WorkingDirectory=/home/dyai/Dokumente/DYAI_home/DEV/AI_LLM/Claude-flow/claude-flow
ExecStart=/usr/bin/node dist/server/dashboard-cli.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable ceo-discovery
sudo systemctl start ceo-discovery
sudo systemctl status ceo-discovery
```

### Docker (Future)

```bash
# Build image
docker build -t ceo-discovery .

# Run container
docker run -d -p 3000:3000 --name ceo-discovery ceo-discovery

# With docker-compose
docker-compose up -d ceo-discovery
```

---

## 🔍 Monitoring & Logs

### Dashboard Monitoring

Access real-time monitoring at `http://localhost:3000`:
- Live status indicators
- Performance metrics
- Activity feed
- Proposal list

### API Monitoring

```bash
# Health check
curl http://localhost:3000/health

# Daemon status
curl http://localhost:3000/api/status

# Full dashboard data
curl http://localhost:3000/api/dashboard
```

### PM2 Logs

```bash
# Tail logs
pm2 logs ceo-discovery

# View last 100 lines
pm2 logs ceo-discovery --lines 100

# Clear logs
pm2 flush
```

### File Logs

Logs are written to:
```
logs/
├── ceo-error.log    # Error logs
└── ceo-out.log      # Standard output
```

---

## 🛠️ Troubleshooting

### Dashboard Won't Start

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in ceo-config.json
{
  "server": { "port": 3001 }
}
```

**Problem:** Build not found

**Solution:**
```bash
npm run build
npm run ceo:start
```

### No Proposals Generated

**Problem:** Not enough user activity

**Solution:**
- Increase `analysisWindow` (e.g., 336 hours = 2 weeks)
- Lower `minConfidence` (e.g., 0.6 = 60%)
- Ensure you have memory/command history

### WebSocket Not Connecting

**Problem:** Dashboard shows "Disconnected"

**Solution:**
- Check if daemon is running
- Verify port 3000 is accessible
- Check browser console for errors
- Try refreshing the page

### Low Prediction Accuracy

**Problem:** Accuracy < 70%

**Solution:**
```bash
# Collect more feedback after projects
# Then run optimization
curl -X POST http://localhost:3000/api/optimization/run

# Or use CLI
npx claude-flow ceo-discovery optimize
```

---

## 📚 Additional Resources

- **CEO-DASHBOARD-README.md** - Dashboard quick start
- **CEO-DISCOVERY-SUMMARY.md** - Complete implementation
- **CLAUDE.md** - Full system documentation
- **package.json** - Available npm scripts

---

## 🎯 Next Steps

1. **✅ Start the system** using this guide
2. **🔍 Run initial discovery** to generate first proposals
3. **💡 Review proposals** in the dashboard
4. **📊 Monitor performance** over time
5. **🔄 Collect feedback** after project completion
6. **🧠 Train models** to improve accuracy

---

## 🆘 Support

If you encounter issues:

1. **Check logs** in dashboard or PM2
2. **Review configuration** in `ceo-config.json`
3. **Test API endpoints** with curl
4. **Check GitHub issues**: https://github.com/ruvnet/claude-flow/issues

---

**Made with 💜 for the Becoin Firma**

*Autonomous. Self-Learning. Proactive.*
