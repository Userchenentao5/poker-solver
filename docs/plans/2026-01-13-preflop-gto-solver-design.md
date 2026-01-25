# Preflop GTO Solver Design (MVP)

## Goals and Scope

Build a local preflop GTO solver with a web UI that renders a 13x13 heatmap and action frequency bars, similar to GTO Wizard. The MVP targets 6-max NLHE at 100bb with fast, usable results (seconds to minutes). The initial position matchups are UTG vs BTN, CO vs BB, and SB vs BB. The action tree is fixed and simplified (RFI, 3bet, 4bet, 5bet, fold/call nodes), with room for later configurability.

## Approach Options

Recommended: a CFR variant (LCFR or DCFR) with strong abstraction (169 hand classes) to balance quality and speed. Alternative A: Fictitious Play / iterative best response for simpler implementation and faster prototype, at the cost of stability. Alternative B: heuristics plus light self-play, fastest to build but weaker long-term.

## Architecture Overview

Single-machine app with three layers: a local web UI, a backend API for task management and caching, and a solver core. The solver builds the preflop game tree, runs iterative updates, and emits average strategies. The backend maps node strategies to a 13x13 matrix plus action frequency bars and serves JSON to the UI. The UI shows heatmaps, per-node action bars, and per-cell combo labels (e.g., AKs, QQ).

## Components

- GameTree builder: constructs the fixed action tree for each matchup with blinds and stack size.
- Solver engine: CFR variant with regret updates, average strategy tracking, and stop conditions (iteration count, time budget, convergence threshold).
- Abstraction layer: 169 hand classes for preflop and compact strategy vectors per node.
- Result mapper: converts strategy vectors to 13x13 heatmaps and action frequency bars.

## Data Flow

User selects matchup and node in the UI. The backend checks cache; if missing, it starts a solver task. The solver initializes strategies, runs iterations, and returns an average strategy per node. The backend aggregates results into matrix JSON and the UI renders it with heatmap colors and frequency bars.

## Error Handling and Caching

Validate inputs (positions, tree template, parameter ranges). Guard against numeric instability (NaN/Inf) by clamping and early stop. Provide timeouts and return the best current average strategy. Cache results by key: matchup + tree template + solver parameters version to avoid recompute.

## Testing

- Unit tests: game tree integrity (node counts, action ordering).
- Solver tests: convergence sanity on toy trees.
- Mapper tests: correct 169-to-13x13 mapping and combo labels.
- End-to-end: run one matchup and render UI with valid JSON.

## Future Extensions

Configurable trees, more matchups, higher precision runs, and postflop support. Optimize with precomputed ranges, GPU acceleration, or faster CFR variants once the MVP is stable.
