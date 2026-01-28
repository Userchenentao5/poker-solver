# BTS Preflop Strategy API

## Overview

The BTS Preflop Strategy API serves preflop GTO strategy data for 6-max No Limit Hold'em.

**Base URL**: `http://localhost:8080/api`

**Content-Type**: `application/json`

---

## API Endpoints

### 1. Get All Available Scenarios

Retrieves all available scenario configurations.

**Endpoint**: `GET /api/scenarios`

**Authentication**: None

**Parameters**: None

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "open": ["UTG", "HJ", "CO", "BTN", "SB"],
  "facingOpen": {
    "BB": ["UTG", "HJ", "CO", "BTN", "SB"],
    "SB": ["UTG", "HJ", "CO", "BTN"],
    "BTN": ["UTG", "HJ", "CO"],
    "CO": ["UTG", "HJ"],
    "HJ": ["UTG"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `open` | `string[]` | Positions that can open-raise |
| `facingOpen` | `object` | Maps defending positions to the opening positions they face |

---

### 2. Get Strategy Data

Retrieves preflop strategy for a specified scenario.

**Endpoint**: `GET /api/strategy`

**Authentication**: None

**Parameters** (Query String):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `positionA` | `string` | Yes | Active position (player initiating action) |
| `positionB` | `string` | Conditional | Passive position (required for `FACING_OPEN`) |
| `type` | `string` | Yes | Scenario type: `OPEN` or `FACING_OPEN` |

**Parameter Rules**:
- `type=OPEN`: provide only `positionA`
- `type=FACING_OPEN`: provide both `positionA` and `positionB`

**Valid Position Values**: `UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`

**Valid Type Values**: `OPEN`, `FACING_OPEN`

#### Example Requests

**Open Raising** (BTN opens):
```http
GET /api/strategy?positionA=BTN&type=OPEN
```

**Facing Open** (BB faces BTN open):
```http
GET /api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN
```

---

#### Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "scenario": {
    "positionA": "BTN",
    "positionB": "BB",
    "type": "FACING_OPEN"
  },
  "strategy": {
    "matrix": [
      [0.0, 0.0, 1.0],
      [0.0, 0.5, 0.5]
    ],
    "actions": ["fold", "call", "raise"],
    "handLabels": ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22", "AKs", "AQs", "AKo", "32o"]
  },
  "summary": {
    "totalHands": 169,
    "raiseRange": "45.2%",
    "callRange": "30.1%",
    "foldRange": "24.7%"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `scenario.positionA` | `string` | Active position code |
| `scenario.positionB` | `string` | Passive position code |
| `scenario.type` | `string` | Scenario type code |
| `strategy.matrix` | `number[][]` | 169×N strategy matrix. Each row represents one hand; columns correspond to action frequencies |
| `strategy.actions` | `string[]` | Action names corresponding to matrix columns |
| `strategy.handLabels` | `string[]` | 169 hand labels in standard order |
| `summary.totalHands` | `number` | Total hand count (always 169) |
| `summary.raiseRange` | `string` | Raising range percentage |
| `summary.callRange` | `string` | Calling range percentage |
| `summary.foldRange` | `string` | Folding range percentage |

**Hand Label Order** (169 hands):
- Pairs (13): AA, KK, QQ, ..., 22
- Suited (78): AKs, AQs, ..., 32s (above diagonal)
- Offsuit (78): AKo, AQo, ..., 32o (below diagonal)

---

#### Error Responses

**400 Bad Request — Missing Parameters**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Missing required parameters: positionA, type"
}
```

**400 Bad Request — Missing positionB**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Missing required parameter: positionB (required for FACING_OPEN scenarios)"
}
```

**400 Bad Request — Invalid Position**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Invalid position: XYZ"
}
```

**404 Not Found — Scenario Unavailable**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
```

```json
{
  "error": "Scenario not found",
  "details": "No strategy data available for scenario: Scenario{BB vs UTG, FACING_OPEN}"
}
```

---

## Position Reference

| Code | Full Name | Description |
|------|-----------|-------------|
| `UTG` | Under the Gun | First to act preflop |
| `HJ` | Hijack | Seat after UTG |
| `CO` | Cutoff | Seat before button |
| `BTN` | Button | Dealer position |
| `SB` | Small Blind | Small blind position |
| `BB` | Big Blind | Big blind position |

---

## Scenario Type Reference

| Code | Description |
|------|-------------|
| `OPEN` | Player A open-raises |
| `FACING_OPEN` | Player B responds to Player A's open |

---

## Available Scenarios

### Open Raising (OPEN)

| Position | Action |
|----------|--------|
| UTG | UTG opens |
| HJ | HJ opens |
| CO | CO opens |
| BTN | Button opens |
| SB | Small blind opens |

### Facing Open (FACING_OPEN)

| Defender | Faces | Action |
|----------|-------|--------|
| BB | UTG, HJ, CO, BTN, SB | Big blind defends |
| SB | UTG, HJ, CO, BTN | Small blind defends |
| BTN | UTG, HJ, CO | Button defends |
| CO | UTG, HJ | Cutoff defends |
| HJ | UTG | Hijack defends |

---

## Example Usage

### JavaScript/Fetch

```javascript
// Get all available scenarios
async function getScenarios() {
  const response = await fetch('http://localhost:8080/api/scenarios');
  return await response.json();
}

// Get strategy for BB facing BTN open
async function getStrategy() {
  const params = new URLSearchParams({
    positionA: 'BTN',
    positionB: 'BB',
    type: 'FACING_OPEN'
  });

  const response = await fetch(`http://localhost:8080/api/strategy?${params}`);
  return await response.json();
}

// Render heatmap
async function renderHeatmap() {
  const data = await getStrategy();
  const { matrix, handLabels } = data.strategy;

  // matrix[i][0] = fold frequency for handLabels[i]
  // matrix[i][1] = call frequency for handLabels[i]
  // matrix[i][2] = raise frequency for handLabels[i]

  for (let i = 0; i < 169; i++) {
    const [foldFreq, callFreq, raiseFreq] = matrix[i];
    // ... render logic
  }
}
```

### cURL

```bash
# Get all scenarios
curl http://localhost:8080/api/scenarios

# Get BTN open strategy (OPEN — no positionB needed)
curl "http://localhost:8080/api/strategy?positionA=BTN&type=OPEN"

# Get BB vs BTN facing open (FACING_OPEN — positionB required)
curl "http://localhost:8080/api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN"
```

---

## Caching

Strategy responses cache server-side using Caffeine. Subsequent requests for the same scenario return cached results.

---

## Rate Limiting

None implemented.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2025-01 | `positionB` now conditional: required only for `FACING_OPEN` |
| 1.0.0 | 2025-01 | Initial release |
