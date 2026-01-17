# BluffTheSpot Preflop Bible - Implementation Knowledge

Extracted and organized for GTO solver development. Based on BTS Preflop Bible (2021) by MMAsherdog.

## Table of Contents

1. [Action Tree Structure](#action-tree-structure)
2. [Bet Sizing Formulas](#bet-sizing-formulas)
3. [Hand Range Representation](#hand-range-representation)
4. [Position Defense Frequencies](#position-defense-frequencies)
5. [Game State Parameters](#game-state-parameters)
6. [Special Cases & Deviations](#special-cases--deviations)

---

## Action Tree Structure

```
RFI (Open Raise)
├── Fold (all positions)
├── Call (BB wide, others only vs rec players)
├── 3Bet
│   ├── Fold
│   ├── Call
│   └── 4Bet
│       ├── Fold
│       ├── Call
│       └── 5Bet
│           ├── Fold
│           └── Call
└── Squeeze (when open + flat caller exists)
```

### Key Structural Rules

| Rule | Description |
|------|-------------|
| **BTN 3bet-or-fold** | BTN plays 3bet-or-fold by default; only flat vs rec players in blinds |
| **SB 3bet-or-fold** | SB plays 3bet-or-fold; no flat calls to avoid capped ranges |
| **BB flexible** | BB can 3bet depolarized OR flat wide range |
| **Squeeze branch** | Separate branch when `num_callers >= 1` |
| **5bet = all-in @ 100bb** | At 100bb stacks, 5bet is all-in; deep stacks (150bb+) use 2.2-3x 4bet |

---

## Bet Sizing Formulas

### Open Raise Sizing

**Non-Ante Games:**
| Position | Size (bb) |
|----------|-----------|
| EP, MP   | 2.2       |
| CO, BTN  | 2.5       |
| SB       | 3.0       |

**Ante Games:**
| Position | Size (bb) |
|----------|-----------|
| EP, MP, CO | 2.5     |
| BTN        | 3.0     |
| SB         | 3.4-3.6 (pot) |

**Versus Limps:**
- IP: `3.5 + (1 × limper_count)` bb
- OOP: `4.5 + (1 × limper_count)` bb
- Vs SB limp: `3.5` bb

### 3Bet Sizing (bb)

| 3Bettor \ Opener | UTG | MP | CO | BTN | SB |
|------------------|-----|----|----|----|----|
| MP (IP)          | 7   | -  | -  | -   | -   |
| CO (IP)          | 7   | -  | -  | -   | -   |
| BTN (IP)         | 7   | 7  | -  | -   | -   |
| SB (OOP)         | 10.5| 10.5| 11.5| 11.5| 9  |
| BB (OOP)         | 11.5| 11.5| -  | -   | -   |

*Principle: Size up when OOP because villain realizes more equity IP*

### 4Bet Sizing (bb)

| 4Bettor \ 3Bettor | UTG | MP | CO | BTN | SB |
|-------------------|-----|----|----|----|----|
| MP                | 20  | -  | -  | -   | -   |
| CO                | 20  | 20 | -  | -   | -   |
| BTN               | 20  | 20 | 20 | -   | -   |
| SB                | 25  | 25 | 25 | 25  | -   |
| BB                | 25  | 25 | 25 | 25  | 23 |

### 5Bet & Squeeze

| Situation | Size |
|-----------|------|
| 5bet @ 100bb | All-in |
| 5bet @ 150bb+ | 2.2-3x 4bet size |
| Squeeze IP | Pot - 1bb |
| Squeeze OOP | Pot + 1bb |

---

## Hand Range Representation

### The 169 Hand Classes

**Ordering:** Pairs (diagonal) → Suited (upper triangle) → Offsuit (lower triangle)

```
      A  K  Q  J  T  9  8  7  6  5  4  3  2
   A  AA AKs AQs AJs ATs A9s A8s A7s A6s A5s A4s A3s A2s
   K  KK AKs KQs KJs KTs K9s K8s K7s K6s K5s K4s K3s K2s
   Q  QQ AQs KQs QJs QTs Q9s Q8s Q7s Q6s Q5s Q4s Q3s Q2s
   J  JJ AJs KJs QJs JTs J9s J8s J7s J6s J5s J4s J3s J2s
   T  TT ATs KTs QTs JTs T9s T8s T7s T6s T5s T4s T3s T2s
   9  99 A9s K9s Q9s J9s T9s 98s 97s 96s 95s 94s 93s 92s
   8  88 A8s K8s Q8s J8s T8s 98s 87s 86s 85s 84s 83s 82s
   7  77 A7s K7s Q7s J7s T7s 97s 87s 76s 75s 74s 73s 72s
   6  66 A6s K6s Q6s J6s T6s 96s 86s 76s 65s 64s 63s 62s
   5  55 A5s K5s Q5s J5s T5s 95s 85s 75s 65s 54s 53s 52s
   4  44 A4s K4s Q4s J4s T4s 94s 84s 74s 64s 54s 43s 42s
   3  33 A3s K3s Q3s J3s T3s 93s 83s 73s 63s 53s 43s 32s
   2  22 A2s K2s Q2s J2s T2s 92s 82s 72s 62s 52s 42s 32s
```

**Combo counts:**
- Pairs: 6 combos each (13 × 6 = 78 total)
- Suited: 4 combos each (78 × 4 = 312 total)
- Offsuit: 12 combos each (78 × 12 = 936 total)
- **Total: 1326 hands → 169 classes**

### Range Format

BTS ranges have two components:

1. **Standard Range**: Base range always played
2. **Borderline Range**: Optional expansion vs tight/weak opponents

Example: UTG Open = 17.4% standard + 1.6% borderline

### Opening Ranges Summary

| Position | Open % | Combos |
|----------|--------|--------|
| UTG      | 17.4%  | 230.2  |
| MP       | 21.7%  | 287.2  |
| CO       | 28.6%  | 379.6  |
| BTN      | 41.9%  | 556    |
| SB       | 44.8%  | 594    |

---

## Position Defense Frequencies

### Big Blind Defense

| Vs Position | 3Bet % | Call % | Total Defense |
|-------------|--------|--------|---------------|
| UTG/MP      | 6.7 (88.7) | 19.1 (252.7) | ~26% |
| CO          | 9.5 (126.7) | 23.6 (311.3) | ~33% |
| BTN         | 14.3 (189) | 28.2 (373.6) | ~42% |
| SB          | 19.5 (257) | 40.1 (532) | ~60% |

*BB 3bets a depolarized range (mix of value, bluffs, speculative)*

### Small Blind Defense

| Vs Position | 3Bet % |
|-------------|--------|
| UTG/MP      | 8.5 (113) |
| CO          | 10.3 (137) |
| BTN         | 15.5 (205) |

*SB plays 3bet-or-fold (no flat calls)*

### Button 3Bet Ranges

| Vs Position | 3Bet % |
|-------------|--------|
| UTG         | 10.0 (132.6) |
| MP          | 10.8 (142.3) |
| CO          | 15.3 (203) |

*BTN plays 3bet-or-fold by default; only flat vs rec players in blinds*

### 4Bet Defense

| Situation | Defense Target |
|-----------|----------------|
| In Position | 50% of opening range (4bet + call) |
| Out of Position | 45% of opening range (4bet + call) |

**4Bet Composition:**
- Value:Bluff ratio = 1:1
- Value hands: AA, KK, QQ, AK (sometimes JJ/AQ)
- Bluff criteria: Good blockers to villain's continuing range, slightly too weak to call

---

## Game State Parameters

### Position Mapping (6-Max)

```
0: UTG (under the gun)
1: MP (middle position)
2: CO (cutoff)
3: BTN (button)
4: SB (small blind)
5: BB (big blind)
```

### Key State Variables

```rust
struct GameState {
    effective_stack: f64,   // 100bb standard, 150bb+ for deep
    pot_size: f64,          // current pot in bb
    big_blind: f64,         // 1.0
    small_blind: f64,       // 0.5
    ante: f64,              // 0.0 non-ante, 0.1-0.25 ante

    hero_pos: usize,        // 0-5
    villain_pos: usize,     // 0-5
    is_ip: bool,            // hero in position?

    action_history: Vec<Action>,
    num_callers: usize,     // for squeeze detection
}
```

### Solver Parameters from BTS

| Parameter | Value | Source |
|-----------|-------|--------|
| Defense freq IP | 50% of range | §4bet |
| Defense freq OOP | 45% of range | §4bet |
| Value:Bluff (4bet) | 1:1 | §4bet |
| BTN/SB strategy | 3bet-or-fold default | §Button 3bet, §SB Defense |
| BB 3bet type | Depolarized | §BB Defense |
| Equity R (IP avg) | ~100% | §Equity Realization |
| Equity R (OOP avg) | ~85% | §Equity Realization |
| Equity R (borderline OOP) | 55-75% | §Equity Realization |

---

## Special Cases & Deviations

### Squeeze Scenarios

**Trigger:** `num_callers >= 1` after open raise

**Squeeze ranges:**
- Vs tight flat callers: Tight range (premiums + some bluffs)
- Vs rec player wide flats: Wide linear range to punish

**Squeeze sizing:**
- IP: Pot size - 1bb
- OOP: Pot size + 1bb

### Recreational Player Adjustments

When a rec player is involved:
- BTN/SB can develop flatting ranges (want to play vs rec)
- 3bet less to keep rec in pot
- Open larger vs rec in blinds for value
- Call more speculative hands vs rec 4bets (postflop edge)

### Adaptive Sizing Rules

| Situation | Adjustment |
|-----------|------------|
| Villain opens small | Call MORE, 3bet slightly LESS |
| Villain opens large | Call LESS, 3bet slightly MORE |
| Villain over-folds to 3bets | Use smaller 3bet size |
| Villain calls 3bets too much | Use larger 3bet size |
| Villain 3bets polarized | Use smaller 4bet size |
| Villain 3bets linear | Use larger 4bet size |

### Deep Stack (150bb+)

- 5bet is no longer all-in
- Use 2.2-3x the 4bet size for 5bet
- Can add non-all-in 5betting ranges

### Cold 4Bet (vs Squeeze)

When facing a squeeze:
- Never cold-call (ends up in tough spots with capped range)
- Play linear cold-4bet or fold
- Size: 2.25-2.5x the squeeze size
- Range: 3-3.2% (40-42 combos)

---

## Implementation Checklist

- [ ] Action tree includes squeeze branch
- [ ] Sizing lookup table by (action_type, opener_pos, defender_pos, has_ante)
- [ ] 169 hand class mapping in hand.rs
- [ ] Position indices 0-5 for UTG→BB
- [ ] Defense frequency targets (IP 50%, OOP 45%)
- [ ] Special case flags: has_rec_player, is_deep_stack, num_callers
- [ ] Equity realization factor R (configurable 55-100%)
- [ ] BTN/SB 3bet-or-fold as default strategy

---

*Reference: BluffTheSpot Preflop Bible (2021) by MMAsherdog. https://www.bluffthespot.com/cfp*
