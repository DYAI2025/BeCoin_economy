# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude-Flow v2.0.0 is an enterprise-grade AI orchestration platform featuring hive-mind swarm intelligence, neural pattern recognition, and 87 advanced MCP tools. The system coordinates AI agents for complex development workflows with persistent memory and automated coordination.

**Architecture**: TypeScript/Node.js ESM modules with SQLite persistence, MCP protocol integration, and multi-agent coordination.

## Development Commands

### Build & Test
```bash
# Development
npm run dev                    # Run CLI in development mode
npm run dev:build             # Watch mode for TypeScript compilation

# Building
npm run build                 # Full build (ESM + CJS + binary)
npm run build:esm            # Build ES modules only
npm run build:cjs            # Build CommonJS modules only
npm run typecheck            # Type checking without emit
npm run typecheck:watch      # Watch mode type checking

# Testing
npm test                     # Run all tests (bail on first failure)
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:cli           # CLI-specific tests
npm run test:coverage      # All tests with coverage
npm run test:debug         # Debug mode with inspector

# Code Quality
npm run lint               # ESLint with zero warnings tolerance
npm run format             # Format with Prettier
```

### Running Tests in Development
```bash
# Single test file
NODE_OPTIONS='--experimental-vm-modules' jest src/__tests__/unit/specific-test.test.ts

# Specific test pattern
NODE_OPTIONS='--experimental-vm-modules' jest --testNamePattern='Health'

# Watch mode for specific directory
npm run test:watch
```

### Package Management
```bash
# Installation (Windows users: prefer pnpm)
npm install                  # Standard install
pnpm install                # Recommended for Windows

# Publishing (alpha channel)
npm run publish:alpha       # Publish to @alpha tag
npm run prepare-publish     # Prepare for publishing
```

## Core Architecture

### Module Organization

The codebase follows a modular architecture with clear separation of concerns:

**CLI Layer** (`src/cli/`)
- `cli-core.ts` - Core CLI framework and command routing
- `commands/` - Command implementations (init, swarm, sparc, memory, etc.)
- Entry point: `src/cli/main.ts`

**Swarm Coordination** (`src/swarm/`)
- `coordinator.ts` - Main SwarmCoordinator class managing agent lifecycle
- `strategies/` - Coordination strategies (auto, hierarchical, mesh, hybrid)
- `types.ts` - Swarm-specific type definitions
- Agent orchestration with event-driven architecture

**MCP Integration** (`src/mcp/`)
- `claude-flow-tools.ts` - 87 MCP tools for swarm orchestration
- `ruv-swarm-tools.ts` - Integration with ruv-swarm library
- `server.ts` - MCP protocol server implementation
- `recovery/` - Connection recovery and health monitoring

**Memory System** (`src/memory/`)
- SQLite-backed persistent storage (`.swarm/memory.db`)
- 12 specialized tables for cross-session persistence
- Namespace-based memory organization
- Windows: Automatic fallback to in-memory storage if SQLite fails

**Hive-Mind System** (`src/hive-mind/`)
- Queen-led hierarchical coordination
- Specialized worker agent types
- Session management and resumption

**Neural & Cognitive** (`src/neural/`)
- Pattern recognition and learning systems
- 27+ cognitive models with WASM SIMD acceleration
- Adaptive learning from successful operations

**Core Services** (`src/core/`)
- `orchestrator-fixed.ts` - Main orchestration engine
- `config.ts` - Configuration management (ConfigManager singleton)
- `event-bus.ts` - Event-driven communication bus
- `logger.ts` - Centralized logging with configurable levels

### Key Design Patterns

1. **Event-Driven Architecture**: EventEmitter-based coordination between components
2. **Singleton Pattern**: ConfigManager, EventBus use getInstance()
3. **Strategy Pattern**: Swarm coordination strategies (auto, hierarchical, mesh, hybrid)
4. **Factory Pattern**: Agent creation and lifecycle management
5. **Observer Pattern**: Event subscriptions for monitoring and hooks

### TypeScript Configuration

- **Module System**: ES2022 with NodeNext resolution
- **Output**: Dual build (ESM to `dist/`, CJS to `dist-cjs/`)
- **Strict Mode**: Enabled with full type safety
- **Declaration Maps**: Generated for source navigation
- **Decorators**: Experimental decorators enabled

## Important Development Patterns

### MCP Tool Development

MCP tools are defined in `src/mcp/claude-flow-tools.ts`. Each tool follows this pattern:

```typescript
{
  name: "tool_name",
  description: "Clear description",
  inputSchema: {
    type: "object",
    properties: { /* Zod-like schema */ },
    required: ["requiredField"]
  },
  handler: async (args) => {
    // Implementation
    return { content: [{ type: "text", text: result }] };
  }
}
```

Categories: Swarm Orchestration (15), Neural & Cognitive (12), Memory Management (10), Performance Monitoring (10), Workflow Automation (10), GitHub Integration (6), Dynamic Agents (6), System & Security (8).

### Agent Coordination Protocol

Every agent operation should follow this lifecycle:

**Start:**
```bash
npx claude-flow hooks pre-task --description "[task]"
npx claude-flow hooks session-restore --session-id "swarm-[id]"
```

**During (after each step):**
```bash
npx claude-flow hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow hooks notify --message "[decision]"
```

**End:**
```bash
npx claude-flow hooks post-task --task-id "[task]" --analyze-performance
npx claude-flow hooks session-end --export-metrics
```

### Memory Operations

SQLite-backed memory system with namespace support:

```bash
# Store and retrieve
npx claude-flow memory store "key" "value" --namespace project
npx claude-flow memory query "search-term" --namespace project

# Management
npx claude-flow memory stats              # View 12 table statistics
npx claude-flow memory export backup.json
npx claude-flow memory import data.json
```

**Windows Note**: SQLite automatically falls back to in-memory storage if native modules fail. All features work, but data won't persist between sessions.

### Swarm Coordination Strategies

Four coordination strategies available:

1. **Auto** - Intelligent selection based on task complexity
2. **Hierarchical** - Queen-led with specialized workers
3. **Mesh** - Peer-to-peer coordination
4. **Hybrid** - Dynamic strategy switching

Example usage:
```bash
npx claude-flow swarm "Build REST API" --strategy development
npx claude-flow hive-mind spawn "Complex project" --agents 8
```

### SPARC Development Workflow

SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) modes:

```bash
# Single mode
npx claude-flow sparc run specification "Feature requirements"

# Multiple modes in parallel
npx claude-flow sparc batch specification,architecture "Build system"

# Full pipeline
npx claude-flow sparc pipeline "Complete feature development"

# TDD workflow
npx claude-flow sparc tdd "User authentication"
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: `src/__tests__/unit/` - Pure function testing, no external dependencies
- **Integration Tests**: `src/__tests__/integration/` - Component interaction testing
- **E2E Tests**: `src/__tests__/e2e/` - Full workflow testing
- **Performance Tests**: `src/__tests__/performance/` - Benchmarking and load testing

### Running Specific Tests

```bash
# Pattern matching
npm test -- --testNamePattern="SwarmCoordinator"

# Single file
npm test -- src/__tests__/unit/memory-manager.test.ts

# With debugging
npm run test:debug -- src/__tests__/unit/specific.test.ts
```

### Test Utilities

Jest configuration in `jest.config.js` with:
- VM modules enabled for ESM support
- Setup file: `jest.setup.js`
- Coverage thresholds configured
- Babel transpilation for compatibility

## File Organization Rules

**Never save working files to root directory** - Use appropriate subdirectories:
- Working files → `examples/`, `tests/`, or project-specific folders
- Documentation → `docs/`
- Test outputs → `tests/` or `validation-test/`
- Temporary files → `.claude-flow/`, `.hive-mind/`, `memory/`

**Important Directories:**
- `.swarm/` - SQLite memory database and swarm state
- `.hive-mind/` - Hive-mind session configuration
- `memory/` - Agent-specific memory files
- `coordination/` - Active workflow coordination files

## Flow Nexus Cloud Platform Integration

Flow Nexus extends Claude-Flow with cloud capabilities:

### Key MCP Tools

**Authentication:**
- `mcp__flow-nexus__user_register` - Register new user
- `mcp__flow-nexus__user_login` - Login to access features

**Swarm Deployment:**
- `mcp__flow-nexus__swarm_init` - Deploy cloud swarm
- `mcp__flow-nexus__sandbox_create` - E2B sandboxes (Node, Python, React)

**Workflows:**
- `mcp__flow-nexus__workflow_create` - Event-driven automation
- `mcp__flow-nexus__neural_train` - Distributed ML training

**Challenges:**
- `mcp__flow-nexus__challenges_list` - Coding challenges
- Earn rUv credits through task completion

## CEO Discovery System (Becoin Integration)

### Overview

The CEO Discovery System enables **proactive, autonomous business development** for the Becoin Economy. It analyzes user patterns, identifies pain points, and generates project proposals automatically using neural pattern recognition.

**Key Features:**
- 🧠 Neural pattern analysis of user behavior
- 💡 Automatic pain point identification
- 📋 AI-powered proposal generation with ROI calculation
- 🎯 Impact prediction using historical data
- 💰 Integration with Becoin Economy treasury

### Quick Start

```bash
# Start proactive discovery session
npx claude-flow ceo-discovery start

# With custom configuration
npx claude-flow ceo-discovery start \
  --analysis-window 168 \
  --budget-min 100 \
  --budget-max 500 \
  --roi-target 3.0

# View generated proposals
npx claude-flow ceo-discovery proposals

# Show identified patterns
npx claude-flow ceo-discovery patterns

# View historical sessions
npx claude-flow ceo-discovery history
```

### Autonomous Operation with Dashboard

**Start the CEO Discovery Dashboard** for autonomous operation with real-time monitoring:

```bash
# Build the project first
npm run build

# Option 1: Using npm script
npm run ceo:start

# Option 2: Using dashboard command directly
npm run ceo:dashboard

# Option 3: Using startup script
./scripts/start-ceo.sh

# Option 4: Production deployment with PM2
pm2 start ecosystem.config.js
pm2 logs ceo-discovery
pm2 stop ceo-discovery
```

**Dashboard Features:**
- 🌐 Web UI at `http://localhost:3000`
- 📊 Real-time performance monitoring
- ⚡ Daemon control (start/stop/run cycles)
- 💡 Live proposal generation
- 📈 Performance analytics and trends
- 🔄 WebSocket-based real-time updates
- 🎯 Optimization status tracking

**Configuration** (`ceo-config.json`):
```json
{
  "daemon": {
    "discoveryInterval": 24,      // Run discovery every 24 hours
    "optimizationInterval": 168,  // Optimize weekly
    "autoStart": true,            // Auto-start on launch
    "autoPropose": true,          // Auto-present proposals
    "budgetRange": { "min": 100, "max": 500 },
    "roiTarget": 3.0,             // Target 3x ROI
    "minConfidence": 0.7,         // 70% confidence threshold
    "analysisWindow": 168         // Analyze last 7 days
  },
  "server": {
    "port": 3000,                 // Dashboard port
    "host": "0.0.0.0"            // Listen on all interfaces
  }
}
```

**Dashboard API Endpoints:**
```bash
# Get daemon status
curl http://localhost:3000/api/status

# Run discovery cycle manually
curl -X POST http://localhost:3000/api/discovery/run

# Run optimization cycle
curl -X POST http://localhost:3000/api/optimization/run

# Get full dashboard data
curl http://localhost:3000/api/dashboard
```

**Production Deployment:**
```bash
# PM2 (Process Manager)
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start on system reboot

# Systemd (Linux)
sudo cp scripts/ceo-discovery.service /etc/systemd/system/
sudo systemctl enable ceo-discovery
sudo systemctl start ceo-discovery

# Docker (coming soon)
docker-compose up -d ceo-discovery
```

### MCP Tools

```javascript
// Start discovery via MCP
mcp__claude-flow__ceo_discovery_start({
  analysisWindow: 168,  // 1 week
  minConfidence: 0.7,
  budgetMin: 100,
  budgetMax: 500,
  roiTarget: 3.0,
  autoPropose: true
})

// Get current session status
mcp__claude-flow__ceo_discovery_status()

// Get proposals
mcp__claude-flow__ceo_discovery_proposals({ limit: 3, minROI: 2.0 })

// Get patterns
mcp__claude-flow__ceo_discovery_patterns({ type: 'repetitive' })

// View history
mcp__claude-flow__ceo_discovery_history({ limit: 10 })

// Auto-negotiate project
mcp__claude-flow__ceo_auto_negotiate({
  proposalId: 'proposal-xxx',
  userFeedback: 'Looks good, but need faster timeline'
})
```

### System Architecture

**Discovery Pipeline:**
1. **Pattern Analysis** - Analyzes memory, commands, files, swarm logs
2. **Pain Point Identification** - Classifies problems (repetitive tasks, errors, bottlenecks)
3. **Proposal Generation** - Creates project proposals with cost estimates
4. **Impact Prediction** - Predicts ROI and success probability
5. **Prioritization** - Ranks proposals by expected value

**Pattern Types:**
- `repetitive` - Frequently repeated tasks (automation candidates)
- `error` - Recurring errors (fix opportunities)
- `bottleneck` - Workflow slowdowns (optimization targets)
- `workflow` - Process patterns (efficiency improvements)

**Impact Scoring:**
- **Time Savings** (0-100): Minutes saved per week
- **Problem Solution** (0-100): How well it solves the pain point
- **Usability** (0-100): How easy to use the solution
- **Sustainability** (0-100): Long-term value and adoption

### Becoin Economy Integration

The system reads from `agency-agents/becoin-economy/`:
- `treasury.json` - Balance, burn rate, runway
- `agent-roster.json` - Available agents and performance
- `projects.json` - Historical project data

**Cost Calculation:**
```typescript
baseCost = 100 * severityMultiplier * complexityMultiplier
tokenCost = baseCost * 0.5
riskBuffer = baseCost * 0.3
profitMargin = baseCost * 0.4
totalCost = baseCost + tokenCost + riskBuffer + profitMargin
```

**ROI Calculation:**
```typescript
monthlyValue = (weeklyMinutesSaved * 4.33) / 60 * 100 Becoins/hour
sixMonthValue = monthlyValue * 6
adjustedValue = sixMonthValue * (impactScore / 100)
ROI = adjustedValue / projectCost
```

### Agency Agent Selection

Proposals automatically select optimal agents from the 51 specialists:

**Mapping Examples:**
- `repetitive_task` → Backend-Architect, DevOps-Automator, Rapid-Prototyper
- `recurring_error` → Senior-Developer, Reality-Checker, Performance-Benchmarker
- `workflow_bottleneck` → Workflow-Optimizer, Senior-PM, Performance-Benchmarker
- `manual_process` → Backend-Architect, DevOps-Automator, Workflow-Optimizer

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║  🎯 CEO DISCOVERY: Proactive Project Proposals           ║
╚════════════════════════════════════════════════════════════╝

📋 Proposal 1: Task Automation System
   Automate the repetitive task identified in your workflow. This
   solution will handle the task automatically, saving you 120
   minutes per week and eliminating manual effort.

   💰 Investment: 287 Becoins
   ⏱️  Timeline: 1-2 weeks
   📈 Expected ROI: 4.2x
   🎯 Impact Score: 87/100
   ⚡ Time Saved: 120 min/week
   🤖 Agent Team: Backend-Architect, DevOps-Automator

📋 Proposal 2: Error Prevention & Recovery System
   Implement robust error prevention and automatic recovery
   mechanisms. This will eliminate the recurring errors you're
   experiencing and provide fail-safe fallbacks.

   💰 Investment: 342 Becoins
   ⏱️  Timeline: 2-3 weeks
   📈 Expected ROI: 3.8x
   🎯 Impact Score: 85/100
   ⚡ Time Saved: 90 min/week
   🤖 Agent Team: Senior-Developer, Reality-Checker
```

### Testing

```bash
# Run CEO Discovery tests
npm run test:unit -- src/__tests__/unit/ceo-discovery.test.ts

# Test pattern analysis
npm run test:unit -- --testNamePattern="PatternAnalyzer"

# Test proposal generation
npm run test:unit -- --testNamePattern="ProposalGenerator"

# Test impact prediction
npm run test:unit -- --testNamePattern="ImpactPredictor"
```

### Files Created

- `src/agents/ceo-discovery.ts` - Main CEO Discovery System
- `src/neural/pattern-analyzer.ts` - User behavior analysis
- `src/neural/proposal-generator.ts` - Proposal generation with ROI
- `src/agents/impact-predictor.ts` - Impact scoring and prediction
- `src/mcp/ceo-tools.ts` - MCP tools for discovery workflows
- `src/cli/commands/ceo-discovery.ts` - CLI commands
- `src/__tests__/unit/ceo-discovery.test.ts` - Test suite

### Data Storage

Discovery sessions are saved to:
```
.claude-flow/discovery-sessions/
├── discovery-1234567890.json
├── discovery-1234567891.json
└── ...
```

Each session contains:
- Identified patterns
- Pain points
- Generated proposals with predictions
- Timestamps and metadata

### Learning from Feedback

The CEO Discovery System includes **self-learning capabilities** that improve over time:

**Feedback Collection:**
```javascript
// After project completion, collect actual impact
mcp__claude-flow__ceo_collect_feedback({
  proposalId: 'proposal-xxx',
  projectId: 'proj-123',
  timeSavings: 85,        // Actual score 0-100
  problemSolution: 92,
  usability: 88,
  sustainability: 90,
  userSatisfaction: 89,
  userComments: 'Excellent automation, saved tons of time!',
  wouldRecommend: true,
  actualCost: 280,        // Actual Becoins spent
  actualTimeline: '10 days'
})
```

**Neural Network Training:**
```javascript
// Train models from collected feedback
mcp__claude-flow__ceo_train_neural_network({
  modelType: 'both',  // 'impact_predictor', 'cost_estimator', or 'both'
  epochs: 100
})

// Result:
{
  impactPredictor: {
    finalAccuracy: 87.3,
    improvementPercent: 5.2,
    trainingTime: 1250
  },
  costEstimator: {
    finalAccuracy: 82.1,
    improvementPercent: 4.8,
    trainingTime: 980
  }
}
```

**Learning Metrics:**
```javascript
// Get system learning progress
mcp__claude-flow__ceo_learning_metrics()

// Result:
{
  totalProjects: 15,
  averagePredictionAccuracy: 84.5,
  averageUserSatisfaction: 87.2,
  averageROI: 3.8,
  improvementTrend: 0.35,  // Positive = improving
  confidenceLevel: 0.75     // 0-1
}
```

**Continuous Improvement:**
```javascript
// Run automated optimization cycle
mcp__claude-flow__ceo_run_optimization()

// System will:
// 1. Check for new training data
// 2. Identify underperforming patterns
// 3. Retrain models if needed
// 4. Adjust algorithms
// 5. Update weights

// Result:
{
  actionsExecuted: 2,
  overallImprovement: 6.3  // % accuracy improvement
}
```

**Performance Analytics:**
```javascript
// Generate 30-day performance report
mcp__claude-flow__ceo_performance_report({ periodDays: 30 })

// Result includes:
{
  summary: {
    totalProjects: 15,
    successRate: 86.7,        // % with impact > 70
    averageROI: 3.8,
    totalTimeSaved: 1800,     // minutes/week
    averageSatisfaction: 87.2
  },
  trends: {
    impactTrend: [...],       // Weekly trend data
    roiTrend: [...],
    satisfactionTrend: [...]
  },
  topPerformers: [...],       // Best 5 projects
  underperformers: [...],     // Worst 5 projects
  insights: [
    "🎯 Excellent prediction accuracy at 84.5%",
    "😊 High user satisfaction at 87.2%",
    "📈 Strong improvement trend - system is learning effectively"
  ]
}
```

**Optimization Status:**
```javascript
// Check if system needs optimization
mcp__claude-flow__ceo_optimization_status()

// Result:
{
  isOptimal: true,  // System is performing well
  metrics: { ... },
  pendingActions: [],  // Improvements needed (if any)
  lastImprovement: {
    type: 'retrain_model',
    reason: '10 new training examples available',
    expectedImprovement: 5.0,
    actualImprovement: 6.3
  }
}
```

### Self-Learning Workflow

```
1. Project Completion
   ↓
2. Collect Feedback (4-category impact + satisfaction)
   ↓
3. Create Training Data
   ↓
4. Automatic Retraining (when threshold reached)
   ↓
5. Model Deployment (if accuracy improved)
   ↓
6. Better Predictions for Next Projects
   ↓
7. Repeat
```

**Key Learning Features:**
- **Adaptive Algorithms** - Adjust cost calculations based on actual performance
- **Pattern Recognition** - Learn which project types succeed
- **ROI Optimization** - Improve cost estimates over time
- **Impact Prediction** - More accurate impact forecasts
- **Trend Analysis** - Track improvement over time
- **Automatic Retraining** - Scheduled optimization cycles

### Files for Learning System

- `src/agents/feedback-loop.ts` - Feedback collection and training data
- `src/neural/neural-trainer.ts` - Neural network training
- `src/agents/continuous-improvement.ts` - Self-optimization engine
- `src/agents/performance-analytics.ts` - Analytics and reporting

### Data Storage

Feedback and training data:
```
.claude-flow/
├── feedback/
│   ├── feedback-proposal-xxx.json
│   └── ...
├── training-data/
│   ├── training-proposal-xxx.json
│   └── ...
└── neural-models/
    ├── impact_predictor-v1.json
    ├── cost_estimator-v1.json
    └── ...
```

## Common Development Tasks

### Adding a New Command

1. Create command file in `src/cli/commands/`
2. Implement action with CommandContext type
3. Register in `src/cli/commands/index.ts` via `setupCommands()`
4. Add tests in `src/cli/__tests__/`

### Adding a New MCP Tool

1. Add tool definition to `src/mcp/claude-flow-tools.ts`
2. Define inputSchema with proper typing
3. Implement async handler function
4. Update tool count in documentation
5. Add integration tests

### Extending Swarm Strategies

1. Create strategy file in `src/swarm/strategies/`
2. Implement required strategy interface
3. Register in SwarmCoordinator
4. Add strategy-specific tests
5. Update CLI help text

## Troubleshooting

### Windows SQLite Issues

If you see SQLite errors on Windows:
- Claude-Flow automatically uses in-memory storage
- All features work normally
- Data won't persist between sessions
- See `docs/windows-installation.md` for persistent storage options
- Prefer `pnpm` over `npm` for installation

### Hook Variable Interpolation

If `${file}` or `${command}` variables aren't working in hooks:

```bash
npx claude-flow fix-hook-variables
```

This converts legacy syntax to working environment variables.

### MCP Connection Issues

The system includes automatic recovery:
- Connection health monitoring
- Automatic reconnection with exponential backoff
- Fallback coordinators for degraded operation
- See `src/mcp/recovery/` for implementation

## Documentation Resources

- **API Reference**: `docs/API.md`
- **CLI Commands**: `docs/CLI.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Examples**: `examples/` directory
- **Git Checkpoint System**: `docs/GIT_CHECKPOINT_HOOKS.md`
- **Performance Tracking**: `docs/REAL_PERFORMANCE_TRACKING.md`
- **Windows Guide**: `docs/windows-installation.md`

## Performance Considerations

- **Parallel Operations**: Always batch related operations
- **Memory Efficiency**: Use memory compression for large contexts
- **Token Optimization**: 32.3% reduction through intelligent task breakdown
- **Speed Improvements**: 2.8-4.4x faster through parallel coordination
- **SWE-Bench**: 84.8% solve rate through hive-mind coordination

## License

MIT License - see LICENSE file for details.

**Alpha Disclaimer**: This is an alpha release (v2.0.0-alpha.103). Use in production environments is not recommended. Report issues at https://github.com/ruvnet/claude-flow/issues
