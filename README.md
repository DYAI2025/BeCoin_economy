# BeCoin Economy Orchestration Platform

The BeCoin Economy is an autonomous venture studio that coordinates pattern discovery, proposal generation, impact forecasting, and treasury management around a shared virtual currency (Becoins). The platform links cognitive analysis with hard budget controls so that every automated initiative is evaluated end-to-end—from identifying pain points to measuring realised outcomes.

## Core Capabilities

- **Pattern-driven discovery** – Neural heuristics inspect memory, command logs, and coordination traces to surface high-confidence opportunities for automation.【F:src/neural/pattern-analyzer.ts†L35-L108】
- **Economic-aware proposal design** – Costed initiatives are generated only when they respect BeCoin treasury guardrails and dynamic budget limits.【F:src/neural/proposal-generator.ts†L46-L91】【F:src/services/becoin-economy.ts†L60-L110】
- **Impact scoring & feedback loops** – Every proposal is scored for ROI prior to launch and evaluated post-delivery to retrain the system with actual customer impact.【F:src/agents/impact-predictor.ts†L24-L116】【F:src/agents/feedback-loop.ts†L40-L157】
- **Treasury governance** – Reservations, commits, and revenue events persist to `agency-agents/becoin-economy/treasury.json`, preserving runway and enforcing the 20% allocation rule per initiative.【F:src/services/becoin-economy.ts†L44-L189】

## Architecture Overview

| Layer | Responsibility | Key Modules |
|-------|----------------|-------------|
| **Experience** | CLI/automation entry points trigger CEO Discovery sessions. | `src/agents/ceo-discovery.ts`【F:src/agents/ceo-discovery.ts†L17-L217】 |
| **Cognition** | Pattern analysis, proposal synthesis, ROI forecasting. | `PatternAnalyzer`, `ProposalGenerator`, `ImpactPredictor`【F:src/neural/pattern-analyzer.ts†L35-L215】【F:src/neural/proposal-generator.ts†L46-L157】【F:src/agents/impact-predictor.ts†L24-L156】 |
| **Economy** | Treasury state, reservations, commits, revenue, runway metrics. | `BecoinEconomy` service, persisted `treasury.json`【F:src/services/becoin-economy.ts†L38-L208】 |
| **Learning** | Closed-loop feedback and training payload generation. | `FeedbackLoop`【F:src/agents/feedback-loop.ts†L37-L219】 |

### Event Flow

1. **Discovery launch** – `CEODiscoverySystem.startDiscovery()` orchestrates pattern analysis, pain-point extraction, proposal synthesis, and prioritisation.【F:src/agents/ceo-discovery.ts†L76-L207】
2. **Treasury handoff** – Each candidate proposal requests the latest treasury snapshot before reserving funds, preventing overspending when other initiatives are pending.【F:src/agents/ceo-discovery.ts†L233-L276】【F:src/services/becoin-economy.ts†L60-L110】
3. **Impact prioritisation** – Proposals are scored by expected ROI and impact breakdowns, then ordered for presentation and potential execution.【F:src/agents/impact-predictor.ts†L32-L156】
4. **Execution feedback** – When projects finish, `FeedbackLoop.collectFeedback` records actual metrics, writes training payloads, and updates treasury ledgers through commits or revenue events.【F:src/agents/feedback-loop.ts†L52-L213】【F:src/services/becoin-economy.ts†L112-L189】

## Critical Handovers Covered by Tests

| Handover | What It Verifies | Test |
|----------|------------------|------|
| Analyzer → Generator → Predictor | High-confidence patterns produce proposals and carry predictions end-to-end. | `CEODiscoverySystem should hand over data...`【F:src/__tests__/unit/ceo-discovery.test.ts†L79-L146】 |
| Proposal Generator Budget Gates | Treasury availability (including 20% cap) blocks overspending and keeps IDs collision-free. | `should enforce available treasury ceiling` & `should generate unique proposal identifiers under load`【F:src/__tests__/unit/ceo-discovery.test.ts†L205-L259】 |
| Treasury Reservation Lifecycle | Initialisation, reservation, allocation caps, commits, and revenue updates persist correctly. | `BecoinEconomy` test suite【F:src/__tests__/unit/becoin-economy.test.ts†L1-L109】 |
| Delivery Feedback Loop | Actual impact feeds training data for continual learning. | `FeedbackLoop creates training data...`【F:src/__tests__/unit/feedback-loop.test.ts†L1-L92】 |

Run the targeted validation suite:

```bash
npm test -- src/__tests__/unit/ceo-discovery.test.ts \
  src/__tests__/unit/becoin-economy.test.ts \
  src/__tests__/unit/feedback-loop.test.ts
```

> **Note:** The legacy full `npm test` run still fails because of unrelated verification fixtures that reference deprecated helper exports. Use the targeted suite above to exercise the BeCoin economy handovers.

## Stress & Resilience Findings

- **Proposal ID collisions (fixed)** – Parallel generation originally re-used `Date.now()`-derived IDs, overwriting training data. IDs now use 12-character NanoIDs and the stress test guarantees uniqueness.【F:src/neural/proposal-generator.ts†L46-L94】【F:src/__tests__/unit/ceo-discovery.test.ts†L238-L259】
- **Treasury overspend (fixed)** – Without reservation tracking the economy could double-book capital. The new `BecoinEconomy` service enforces a live reserved balance, a 20% project allocation ceiling, and persistence in `treasury.json` to maintain runway integrity.【F:src/services/becoin-economy.ts†L60-L189】
- **Feedback resilience** – Collecting user outcomes now persists training payloads even inside ephemeral temp directories, enabling repeatable retraining passes.【F:src/__tests__/unit/feedback-loop.test.ts†L36-L92】

## Data & Configuration

- **Treasury state:** `agency-agents/becoin-economy/treasury.json` holds balance, start capital, burn rate, reservations, and transaction ledger.【F:src/services/becoin-economy.ts†L44-L189】
- **Discovery sessions:** Completed CEO discovery sessions persist under `.claude-flow/discovery-sessions/` for auditing and replay.【F:src/agents/ceo-discovery.ts†L213-L236】
- **Training payloads:** Feedback loop exports to `.claude-flow/training-data/` enabling offline fine-tuning pipelines.【F:src/agents/feedback-loop.ts†L219-L318】

## Development Guidelines

1. **Stay type-safe:** All runtime imports that depend on logging should use dynamic imports inside tests to avoid triggering logger singletons before configuration.【F:src/__tests__/unit/ceo-discovery.test.ts†L1-L27】
2. **Budget-first features:** New automation capabilities must check `BecoinEconomy.getSnapshot()` before confirming a scope or reservation.【F:src/agents/ceo-discovery.ts†L233-L276】
3. **Extend tests for new handovers:** When adding services, create explicit tests for each module boundary to maintain coverage of cross-component agreements.

## Roadmap Ideas

- Automated treasury reconciliation against external accounting feeds.
- Scenario modelling that projects runway under multiple proposal acceptance strategies.
- Web dashboard surfaces for reservations, commits, and impact deltas.

## License

MIT License. See [`LICENSE`](LICENSE).
